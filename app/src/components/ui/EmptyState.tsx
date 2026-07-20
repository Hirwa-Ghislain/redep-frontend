import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-14 px-6", className)}>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-ink/6 text-muted mb-4">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="font-display font-semibold text-[15px] text-ink">{title}</h3>
      {description && <p className="text-[13.5px] text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
