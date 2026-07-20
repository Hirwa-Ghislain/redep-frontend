import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Drawer({ open, onClose, title, description, children, footer, wide }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "absolute right-0 top-0 h-full w-full bg-surface shadow-(--shadow-pop) flex flex-col",
              wide ? "max-w-2xl" : "max-w-md",
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-line">
              <div>
                <h2 className="font-display font-semibold text-[17px] text-ink">{title}</h2>
                {description && <p className="text-[13px] text-muted mt-0.5">{description}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 -m-1 rounded-lg text-muted hover:bg-ink/5 hover:text-ink transition-colors"
              >
                <X className="size-4.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
