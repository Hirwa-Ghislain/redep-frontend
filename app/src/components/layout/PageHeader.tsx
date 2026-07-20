import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({ title, description, actions, backTo, backLabel, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-5", className)}>
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink transition-colors mb-1.5"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[20px] font-bold text-ink leading-tight tracking-tight">{title}</h1>
          {description && <p className="text-[13px] text-muted mt-0.5 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
