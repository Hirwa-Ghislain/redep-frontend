import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  hover?: boolean;
}

export function Card({ padded = true, hover, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-line rounded-(--radius-card) shadow-(--shadow-card)",
        padded && "p-4 sm:p-5",
        hover && "transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-(--shadow-pop) hover:-translate-y-px",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-3.5", className)}>
      <div>
        <h3 className="font-display font-semibold text-[14px] text-ink leading-snug">{title}</h3>
        {description && <p className="text-[12.5px] text-muted mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
