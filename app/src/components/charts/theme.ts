/**
 * Chart theme — validated with the dataviz palette checker (all six checks pass
 * in this fixed order against the light surface). Assign series colors by index
 * in THIS order; never cycle or reorder per-chart.
 */
export const CHART_COLORS = ["#006D91", "#FCBB00", "#2BAC00", "#E40014"] as const;

/** Sequential ramp (single hue, light→dark) for magnitude encodings. */
export const SEQUENTIAL = ["#E5F4F9", "#B5DFEC", "#62B7D0", "#006D91", "#00415A"] as const;

export const GRID_STROKE = "#DCE9EF";
export const AXIS_TICK = { fill: "#8197A1", fontSize: 12 } as const;

/** Respect prefers-reduced-motion: charts render instantly instead of animating in. */
export const CHART_ANIMATION: boolean =
  typeof window !== "undefined" ? !window.matchMedia("(prefers-reduced-motion: reduce)").matches : true;
