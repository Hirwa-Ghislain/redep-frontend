import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("flex items-center gap-1 border-b border-line overflow-x-auto", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-[color,background-color,transform] duration-200 active:scale-[0.97]",
              active ? "text-ink bg-primary-soft/35" : "text-muted hover:text-primary-deep hover:bg-primary-soft/45 hover:-translate-y-px",
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tnum leading-none",
                  active ? "bg-primary text-white" : "bg-ink/8 text-muted",
                )}
              >
                {item.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
