import { cn } from "@/lib/utils";

/**
 * E-SHURI mark — a dot-grid tile (echo of the assembling-dots brand identity).
 * NESA-inspired blue tile with the yellow and green education accents.
 */
export function LogoMark({ className, size = 34 }: { className?: string; size?: number }) {
  const dots: Array<[number, number, string]> = [
    [9, 9, "#FFFFFF"], [17, 9, "#FFFFFF"], [25, 9, "#FCBB00"],
    [9, 17, "#FFFFFF"], [17, 17, "#8DD5EA"], [25, 17, "#FFFFFF"],
    [9, 25, "#2BAC00"], [17, 25, "#FFFFFF"], [25, 25, "#FFFFFF"],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" className={className} aria-hidden>
      <rect width="34" height="34" rx="9" fill="#006D91" />
      {dots.map(([cx, cy, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.1" fill={fill} />
      ))}
    </svg>
  );
}

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display font-bold text-[17px] tracking-tight", dark ? "text-paper" : "text-ink")}>
          E-SHURI
        </span>
        <span className={cn("text-[9.5px] font-medium tracking-[0.14em] uppercase mt-0.5", dark ? "text-paper/50" : "text-muted")}>
          Education Ecosystem
        </span>
      </span>
    </span>
  );
}
