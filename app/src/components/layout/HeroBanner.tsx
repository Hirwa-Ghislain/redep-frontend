import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface HeroBannerProps {
  /** Eyebrow line, e.g. the current term. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Buttons / links on the right. */
  actions?: ReactNode;
  /** Up to ~3 inline stats: label + value. */
  stats?: { label: string; value: string }[];
  className?: string;
}

/**
 * Slim ink banner for dashboard pages: greeting + context + quick actions.
 * Replaces a plain PageHeader on portal home pages only — one per portal.
 */
export function HeroBanner({ eyebrow, title, subtitle, actions, stats, className }: HeroBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-(--radius-card) bg-pine px-5 py-5 sm:px-6 mb-5",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: "radial-gradient(circle, rgb(255 255 255 / 0.09) 1.1px, transparent 1.1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />
      {/* soft gold corner glow */}
      <div
        className="absolute -right-16 -top-20 size-56 rounded-full opacity-20"
        style={{ background: "radial-gradient(closest-side, #E7A917, transparent 70%)" }}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-gold mb-1">{eyebrow}</p>
          )}
          <h1 className="font-display text-[20px] font-bold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-[13px] text-white/60 mt-1 max-w-xl">{subtitle}</p>}
        </div>
        {stats && stats.length > 0 && (
          <dl className="hidden md:flex items-center gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-right">
                <dd className="font-display text-[18px] font-bold text-white tnum leading-6">{s.value}</dd>
                <dt className="text-[11px] text-white/50">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
