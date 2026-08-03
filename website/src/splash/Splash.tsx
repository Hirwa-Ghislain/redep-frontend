/**
 * E-SHURI branded "assembling logo" splash / preloader.
 *
 * Plays ONCE per full page load, above all content, then lifts away with a
 * two-tone curtain. The mark is Rwanda's map filled with a centroid-sorted dot
 * grid (see scripts/generate-mark.mjs): dots bloom outward from the centre,
 * the border self-draws, a color wash fades in, the lettering slides in from
 * opposite sides, one heartbeat pulse, curtain exit.
 *
 * Robustness (non-negotiable):
 *  - scroll + key lock while visible, fully restored on teardown
 *  - hard cap (~6.5s) force-finishes no matter what
 *  - exits only after window "load" OR the hard cap — whichever first
 *  - GSAP import failure → immediate teardown (site is never trapped)
 *  - prefers-reduced-motion → static composed frame, short delay, reveal
 *  - teardown sets window.__splashDone and dispatches "app:splash-done"
 */

import { useEffect, useRef, useState } from "react";
import { CENTROID, DOTS, DOT_RADIUS, MARK_BOTTOM, OUTLINE_PATH, VIEW_BOX } from "./markData";

/* ------------------------------- brand tokens -------------------------------- */

const TOKENS = {
  darkBg: "#101915",
  accent: "#E7A917",
  text: "#F7F5F0",
  dotPalette: ["#4FA97E", "#E7A917", "#2C99CE", "#8FCDB0"],
  durations: {
    bloom: 0.6,
    bloomStagger: 0.004,
    outline: 1.15,
    wash: 0.9,
    lettering: 0.7,
    exitStage: 0.45,
    exitPanel: 0.8,
    exitSheetLag: 0.24,
    hardCapMs: 6500,
    reducedMotionMs: 1100,
  },
};

declare global {
  interface Window {
    __splashDone?: boolean;
  }
}

let playedThisLoad = false;

export function Splash() {
  const [gone, setGone] = useState(() => playedThisLoad || window.__splashDone === true);

  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const outlineRef = useRef<SVGPathElement>(null);
  const descRef = useRef<SVGTextElement>(null);
  const wordRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    if (gone) return;
    playedThisLoad = true;

    let torn = false;
    let exited = false;
    const timers: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let killTweens: (() => void) | null = null;

    /* ------------------------------ scroll lock ------------------------------ */
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const prevent = (e: Event) => e.preventDefault();
    const keyBlock = (e: KeyboardEvent) => {
      const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
      if (scrollKeys.includes(e.key)) e.preventDefault();
    };
    window.addEventListener("wheel", prevent, { passive: false, capture: true });
    window.addEventListener("touchmove", prevent, { passive: false, capture: true });
    window.addEventListener("keydown", keyBlock, { capture: true });
    // (No smooth-scroll library on this site; if one is added, pause it here.)

    /* -------------------------------- teardown ------------------------------- */
    const teardown = () => {
      if (torn) return;
      torn = true;
      timers.forEach(clearTimeout);
      killTweens?.();
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("wheel", prevent, { capture: true });
      window.removeEventListener("touchmove", prevent, { capture: true });
      window.removeEventListener("keydown", keyBlock, { capture: true });
      window.__splashDone = true;
      window.dispatchEvent(new CustomEvent("app:splash-done"));
      setGone(true);
    };

    /* --------------------------- bounded readiness --------------------------- */
    const loadDone = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    });

    /* ---------------------------- reduced motion ----------------------------- */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Static composed frame: dots home + visible, outline drawn, lettering in.
      const circles = svgRef.current?.querySelectorAll("circle") ?? [];
      circles.forEach((c) => ((c as SVGCircleElement).style.opacity = "1"));
      if (outlineRef.current) outlineRef.current.style.strokeDashoffset = "0";
      if (fillRef.current) fillRef.current.style.opacity = "0.1";
      if (descRef.current) descRef.current.style.opacity = "1";
      if (wordRef.current) wordRef.current.style.opacity = "1";
      timers.push(window.setTimeout(teardown, TOKENS.durations.reducedMotionMs));
      return teardown;
    }

    /* ------------------------------- animation ------------------------------- */
    let cancelled = false;

    (async () => {
      let gsap: typeof import("gsap").gsap;
      try {
        gsap = (await import("gsap")).gsap;
      } catch {
        // Library failure fallback: never hang behind a missing lib.
        teardown();
        return;
      }
      if (cancelled || torn) return;

      const circles = Array.from(svgRef.current?.querySelectorAll("circle") ?? []);
      const d = TOKENS.durations;

      const intro = gsap.timeline({ defaults: { overwrite: "auto" } });
      // 1) Dots bloom outward from the centroid — animate the real cx/cy
      //    attributes so geometry stays exact (index order == bloom order).
      intro.fromTo(
        circles,
        { opacity: 0, attr: { cx: CENTROID.x, cy: CENTROID.y } },
        {
          opacity: 1,
          attr: {
            cx: (i: number) => DOTS[i]![0],
            cy: (i: number) => DOTS[i]![1],
          },
          duration: d.bloom,
          ease: "power3.out",
          stagger: d.bloomStagger,
        },
      );
      // 2) Outline self-draws (resolution-independent via pathLength=1)
      intro.fromTo(
        outlineRef.current,
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: d.outline, ease: "power2.inOut" },
        "-=0.35",
      );
      // 3) Soft color wash
      intro.to(fillRef.current, { opacity: 0.1, duration: d.wash, ease: "power2.out" }, "<");
      // 4) Lettering from opposite sides
      intro.fromTo(
        descRef.current,
        { opacity: 0, x: 40 },
        { opacity: 1, x: 0, duration: d.lettering, ease: "power3.out" },
        "-=0.7",
      );
      intro.fromTo(
        wordRef.current,
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, duration: d.lettering, ease: "power3.out" },
        "<0.08",
      );
      // 5) Heartbeat
      intro.to(svgRef.current, { scale: 1.04, duration: 0.16, ease: "power2.in", transformOrigin: "50% 45%" });
      intro.to(svgRef.current, { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.45)" });

      const introDone = new Promise<void>((resolve) => {
        intro.eventCallback("onComplete", () => resolve());
      });

      const runExit = () => {
        if (exited || torn) return;
        exited = true;
        intro.kill();
        const exit = gsap.timeline({ onComplete: teardown });
        exit.to(stageRef.current, { opacity: 0, y: -18, duration: d.exitStage, ease: "power2.in" });
        exit.to(panelRef.current, { yPercent: -100, duration: d.exitPanel, ease: "power4.inOut" }, "-=0.15");
        exit.to(
          sheetRef.current,
          { yPercent: -100, duration: d.exitPanel, ease: "power4.inOut" },
          `-=${d.exitPanel - d.exitSheetLag}`,
        );
        killTweens = () => exit.kill();
      };
      killTweens = () => intro.kill();

      // Exit when the intro AND the page are ready — or when the hard cap hits.
      void Promise.all([introDone, loadDone]).then(runExit);
      timers.push(window.setTimeout(runExit, d.hardCapMs));
    })();

    /* ------------------------ hard cap (belt & braces) ------------------------ */
    // Covers the path where even the GSAP import stalls forever.
    timers.push(window.setTimeout(teardown, TOKENS.durations.hardCapMs + 1600));

    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  return (
    <div ref={rootRef} aria-hidden className="fixed inset-0 z-[9999]">
      {/* Layer A — accent under-sheet (flashes briefly during the curtain lift) */}
      <div ref={sheetRef} className="absolute inset-0" style={{ background: TOKENS.accent }} />

      {/* Layer B — dark panel */}
      <div
        ref={panelRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ background: TOKENS.darkBg }}
      >
        {/* faint radial accent glow behind the mark */}
        <div
          className="absolute left-1/2 top-1/2 size-[130vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(231,169,23,0.10), transparent 70%)" }}
        />

        <div ref={stageRef} className="relative px-6">
          <svg
            ref={svgRef}
            viewBox={VIEW_BOX}
            className="w-[min(80vw,400px)] h-auto"
            role="img"
            aria-label="E-SHURI — Rwanda Education Digital Ecosystem Platform"
          >
            {/* color wash fill of the mark */}
            <path ref={fillRef} d={OUTLINE_PATH} fill={TOKENS.accent} style={{ opacity: 0 }} />
            {/* self-drawing outline */}
            <path
              ref={outlineRef}
              d={OUTLINE_PATH}
              fill="none"
              stroke={TOKENS.accent}
              strokeWidth={2.5}
              strokeLinejoin="round"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
            />
            {/* dot grid — inline opacity:0 so nothing flashes before JS runs */}
            {DOTS.map(([x, y, c], i) => (
              <circle key={i} cx={x} cy={y} r={DOT_RADIUS} fill={TOKENS.dotPalette[c]} style={{ opacity: 0 }} />
            ))}
            {/* lettering locked to the mark */}
            <text
              ref={wordRef}
              x={320}
              y={MARK_BOTTOM + 74}
              textAnchor="middle"
              fill={TOKENS.text}
              style={{
                opacity: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 58,
                letterSpacing: "0.06em",
              }}
            >
              E-SHURI
            </text>
            <text
              ref={descRef}
              x={320}
              y={MARK_BOTTOM + 102}
              textAnchor="middle"
              fill={TOKENS.accent}
              style={{
                opacity: 0,
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 13.5,
                letterSpacing: "0.34em",
              }}
            >
              RWANDA EDUCATION ECOSYSTEM
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
