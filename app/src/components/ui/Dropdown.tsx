import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: (DropdownItem | "divider")[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute z-40 mt-1.5 min-w-44 origin-top rounded-xl border border-line bg-surface p-1 shadow-(--shadow-pop)",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {items.map((item, i) =>
              item === "divider" ? (
                <div key={`div-${i}`} className="my-1 h-px bg-line" role="separator" />
              ) : (
                <button
                  key={item.label}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => { setOpen(false); item.onSelect(); }}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] text-left transition-[color,background-color,transform] duration-150 hover:translate-x-0.5 active:scale-[0.98]",
                    item.danger ? "text-clay-deep hover:bg-clay-soft" : "text-ink hover:bg-primary-soft/60 hover:text-primary-deep",
                    item.disabled && "opacity-45 pointer-events-none",
                  )}
                >
                  {item.icon && <item.icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden />}
                  {item.label}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
