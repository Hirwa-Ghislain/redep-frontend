import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "gold" | "ink";

const variants: Record<BadgeVariant, string> = {
  success: "bg-primary-soft text-primary-deep",
  warning: "bg-gold-soft text-gold-deep",
  danger: "bg-clay-soft text-clay-deep",
  info: "bg-sky-soft text-sky-deep",
  neutral: "bg-ink/6 text-muted",
  gold: "bg-gold text-ink",
  ink: "bg-ink text-paper",
};

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-[2.5px] text-[11px] font-semibold whitespace-nowrap leading-4",
        variants[variant],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
