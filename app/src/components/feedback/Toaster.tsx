import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useUiStore, type ToastVariant } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

const icons: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const accents: Record<ToastVariant, string> = {
  success: "text-primary",
  error: "text-clay",
  warning: "text-gold-deep",
  info: "text-sky",
};

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.variant];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-ink-mist bg-ink px-4 py-3 shadow-(--shadow-pop)"
              role="status"
            >
              <Icon className={cn("mt-0.5 size-4.5 shrink-0", accents[t.variant])} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-paper">{t.title}</p>
                {t.description && <p className="text-[12.5px] text-paper/70 mt-0.5">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="p-0.5 -m-0.5 rounded text-paper/50 hover:text-paper transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
