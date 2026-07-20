import { CENTROID, DOTS, DOT_RADIUS, OUTLINE_PATH, VIEW_BOX } from "@/splash/markData";

const PALETTE = ["#4FA97E", "#E7A917", "#2C99CE", "#8FCDB0"];

/**
 * Static Rwanda dot-map (same generated geometry as the splash) for use on
 * light sections. `pulse` marks a few dots with a slow CSS glow to suggest
 * live schools on the map.
 */
export function DotMap({ className = "", pulse = true }: { className?: string; pulse?: boolean }) {
  // The viewBox includes room reserved for the splash lettering — trim it here.
  const [, , w] = VIEW_BOX.split(" ");
  return (
    <svg viewBox={`0 0 ${w} 500`} className={className} aria-hidden>
      <path d={OUTLINE_PATH} fill="#1B7A53" opacity={0.06} />
      <path d={OUTLINE_PATH} fill="none" stroke="#1B7A53" strokeOpacity={0.5} strokeWidth={2} strokeLinejoin="round" />
      {DOTS.map(([x, y, c], i) => {
        const isPulse = pulse && i % 47 === 0;
        return (
          <circle key={i} cx={x} cy={y} r={DOT_RADIUS * 0.82} fill={PALETTE[c]} opacity={0.92}>
            {isPulse && (
              <animate
                attributeName="r"
                values={`${DOT_RADIUS * 0.82};${DOT_RADIUS * 1.25};${DOT_RADIUS * 0.82}`}
                dur="3.2s"
                begin={`${(i % 5) * 0.7}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        );
      })}
      <circle cx={CENTROID.x} cy={CENTROID.y} r={3} fill="none" />
    </svg>
  );
}
