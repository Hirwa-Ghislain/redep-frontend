/**
 * Offline generator for the REDEP "assembling logo" mark geometry.
 *
 * Reads scripts/rwanda.geo.json (10m-resolution border polygon), then:
 *   1. Projects lon/lat into the SVG viewBox (equirectangular with latitude
 *      aspect correction — Rwanda is ~2°S so distortion is negligible).
 *   2. Samples a regular grid (~21 viewBox units) across the bounding box and
 *      keeps points strictly INSIDE the polygon (ray-casting point-in-polygon),
 *      with a small inset so edge dots don't poke through the outline.
 *   3. Assigns each dot a deterministic palette index (weighted brand mix).
 *   4. Sorts dots by distance from the centroid, nearest first — iterating the
 *      array in order animates the bloom from the centre outward.
 *   5. Emits src/splash/markData.ts with the outline path, dots and centroid.
 *
 * Run: npm run generate:mark   (the output is committed — do not hand-edit it)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const geo = JSON.parse(readFileSync(join(here, "rwanda.geo.json"), "utf8"));

/* ------------------------------ extract the ring ------------------------------ */

const geometry = geo.type === "FeatureCollection" ? geo.features[0].geometry : (geo.geometry ?? geo);
let ring;
if (geometry.type === "Polygon") {
  ring = geometry.coordinates[0];
} else if (geometry.type === "MultiPolygon") {
  ring = geometry.coordinates.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
} else {
  throw new Error(`Unsupported geometry: ${geometry.type}`);
}

/* -------------------------------- projection ---------------------------------- */

const lons = ring.map((p) => p[0]);
const lats = ring.map((p) => p[1]);
const minLon = Math.min(...lons), maxLon = Math.max(...lons);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const midLat = (minLat + maxLat) / 2;
const kx = Math.cos((midLat * Math.PI) / 180); // metres-per-degree correction

const MARK_W = 520; // drawing area for the mark inside the viewBox
const geoW = (maxLon - minLon) * kx;
const geoH = maxLat - minLat;
const scale = MARK_W / Math.max(geoW, geoH);
const markH = geoH * scale;
const markW = geoW * scale;

// Center the mark horizontally in a 640-wide viewBox, top margin 24.
const OX = (640 - markW) / 2;
const OY = 24;

const project = ([lon, lat]) => [
  +(OX + (lon - minLon) * kx * scale).toFixed(2),
  +(OY + (maxLat - lat) * scale).toFixed(2), // flip: north up
];

const poly = ring.map(project);

/* ------------------------------- outline path --------------------------------- */

const outlinePath =
  poly.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("") + "Z";

/* ---------------------------- point-in-polygon test ---------------------------- */

function inside([x, y], polygon) {
  let odd = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) odd = !odd;
  }
  return odd;
}

/** Distance from point to the nearest polygon edge (for the inset check). */
function edgeDistance([x, y], polygon) {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x1, y1] = polygon[j];
    const [x2, y2] = polygon[i];
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
    const px = x1 + t * dx, py = y1 + t * dy;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}

/* --------------------------------- grid sample -------------------------------- */

const SPACING = 21;
const DOT_R = 8; // a bit under half the spacing
const INSET = 6; // keep dots clear of the outline stroke

const candidates = [];
for (let gy = OY; gy <= OY + markH; gy += SPACING) {
  for (let gx = OX; gx <= OX + markW; gx += SPACING) {
    const p = [+gx.toFixed(2), +gy.toFixed(2)];
    if (inside(p, poly) && edgeDistance(p, poly) >= INSET) candidates.push(p);
  }
}

/* ------------------------- palette assignment (stable) ------------------------- */

// Index into dotPalette: 0 green (dominant), 1 gold, 2 sky, 3 mint.
function paletteIndex(x, y) {
  let h = (Math.round(x * 7.31) * 2654435761 + Math.round(y * 13.7) * 40503) >>> 0;
  h = (h ^ (h >>> 13)) * 0x5bd1e995;
  const r = ((h >>> 15) % 1000) / 1000;
  if (r < 0.58) return 0;
  if (r < 0.73) return 1;
  if (r < 0.87) return 2;
  return 3;
}

/* ----------------------------- centroid + ordering ----------------------------- */

const cx = candidates.reduce((s, p) => s + p[0], 0) / candidates.length;
const cy = candidates.reduce((s, p) => s + p[1], 0) / candidates.length;

const dots = candidates
  .map(([x, y]) => ({ x, y, c: paletteIndex(x, y), d: Math.hypot(x - cx, y - cy) }))
  .sort((a, b) => a.d - b.d)
  .map(({ x, y, c }) => [x, y, c]);

/* ----------------------------------- emit ------------------------------------- */

const out = `/**
 * GENERATED by scripts/generate-mark.mjs — do not edit by hand.
 * Rwanda border (Natural Earth 10m via geojson-regions), dot grid sampled at
 * ${SPACING}u spacing, ${dots.length} dots, sorted nearest-to-centroid first so
 * index order == bloom order.
 */

export const VIEW_BOX = "0 0 640 ${Math.ceil(OY + markH + 116)}";

/** Mark outline (self-drawing stroke target). */
export const OUTLINE_PATH = ${JSON.stringify(outlinePath)};

/** Bloom origin — average of all dot positions. */
export const CENTROID = { x: ${cx.toFixed(2)}, y: ${cy.toFixed(2)} };

export const DOT_RADIUS = ${DOT_R};

/** [x, y, paletteIndex] — iterate in order for the centre-out bloom. */
export const DOTS: Array<[number, number, number]> = ${JSON.stringify(dots)};

/** Baselines for the lettering, locked to the mark. */
export const MARK_BOTTOM = ${Math.ceil(OY + markH)};
`;

const outDir = join(here, "..", "src", "splash");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "markData.ts"), out);
console.log(`markData.ts written: ${dots.length} dots, viewBox 0 0 640 ${Math.ceil(OY + markH + 116)}, centroid (${cx.toFixed(1)}, ${cy.toFixed(1)})`);
