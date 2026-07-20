import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface StepperProps {
  steps: string[];
  current: number; // 0-based
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={step}>
            {i > 0 && <span className={cn("h-px flex-1 min-w-4", done || active ? "bg-primary" : "bg-line-strong")} aria-hidden />}
            <li className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-[12px] font-bold font-display transition-colors",
                  done && "bg-primary text-white",
                  active && "bg-ink text-paper",
                  !done && !active && "bg-ink/8 text-muted",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("text-[13px] font-medium hidden sm:block", active ? "text-ink" : "text-muted")}>{step}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
