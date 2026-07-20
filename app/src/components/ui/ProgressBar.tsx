import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  /** Colors flip to warning/danger as it fills (capacity semantics) when true. */
  capacity?: boolean;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, capacity, className, label }: ProgressBarProps) {
  const v = clamp(value, 0, 1);
  const color = capacity
    ? v >= 0.95 ? "bg-clay" : v >= 0.8 ? "bg-gold" : "bg-primary"
    : "bg-primary";
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink/8", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}
