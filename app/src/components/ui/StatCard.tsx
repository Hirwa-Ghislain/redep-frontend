import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  /** e.g. { value: "+12%", positive: true, label: "vs last term" } */
  delta?: { value: string; positive?: boolean; label?: string };
  tone?: "default" | "primary" | "gold" | "sky" | "clay";
  className?: string;
}

const iconTones = {
  default: "bg-ink/6 text-ink",
  primary: "bg-primary-soft text-primary-deep",
  gold: "bg-gold-soft text-gold-deep",
  sky: "bg-sky-soft text-sky-deep",
  clay: "bg-clay-soft text-clay-deep",
};

/**
 * Compact KPI tile: label row with a tinted icon chip, bold tabular value,
 * delta pill underneath. Keep 4–5 per row on desktop.
 */
export function StatCard({ label, value, icon: Icon, delta, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-line rounded-(--radius-card) shadow-(--shadow-card) p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-muted truncate">{label}</p>
        {Icon && (
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", iconTones[tone])}>
            <Icon className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
      <p className="font-display text-[22px] leading-7 font-bold text-ink tnum mt-1.5 truncate">{value}</p>
      {delta && (
        <p className="flex items-center gap-1.5 mt-2">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold tnum",
              delta.positive === false ? "bg-clay-soft text-clay-deep" : "bg-primary-soft text-primary-deep",
            )}
          >
            {delta.positive === false ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
            {delta.value}
          </span>
          {delta.label && <span className="text-[11.5px] text-faint">{delta.label}</span>}
        </p>
      )}
    </div>
  );
}
