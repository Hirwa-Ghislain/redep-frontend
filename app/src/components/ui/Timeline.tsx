import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  title: string;
  meta?: string;
  description?: string;
  tone?: "default" | "success" | "warning" | "danger";
  icon?: ReactNode;
}

const dotTones = {
  default: "bg-line-strong",
  success: "bg-primary",
  warning: "bg-gold",
  danger: "bg-clay",
};

export function Timeline({ events, className }: { events: TimelineEvent[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-5 border-l border-line pl-5 ml-1.5", className)}>
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              "absolute -left-[26px] top-1 size-2.5 rounded-full ring-4 ring-surface",
              dotTones[e.tone ?? "default"],
            )}
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-sm font-medium text-ink">{e.title}</p>
            {e.meta && <span className="text-[12px] text-faint tnum">{e.meta}</span>}
          </div>
          {e.description && <p className="text-[13px] text-muted mt-0.5">{e.description}</p>}
        </li>
      ))}
    </ol>
  );
}
