/**
 * Chart theme — validated with the dataviz palette checker (all six checks pass
 * in this fixed order against the light surface). Assign series colors by index
 * in THIS order; never cycle or reorder per-chart.
 */
export const CHART_COLORS = ["#1B7A53", "#B97F10", "#2C99CE", "#C4532E"] as const;

/** Sequential ramp (single hue, light→dark) for magnitude encodings. */
export const SEQUENTIAL = ["#E3F0E9", "#A7D0BC", "#5FA986", "#1B7A53", "#0E5138"] as const;

export const GRID_STROKE = "#ECE8DD";
export const AXIS_TICK = { fill: "#8B948D", fontSize: 12 } as const;

/** Respect prefers-reduced-motion: charts render instantly instead of animating in. */
export const CHART_ANIMATION: boolean =
  typeof window !== "undefined" ? !window.matchMedia("(prefers-reduced-motion: reduce)").matches : true;
