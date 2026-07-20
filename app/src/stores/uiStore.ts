import { create } from "zustand";
import { uid } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface UiState {
  toasts: Toast[];
  sidebarOpen: boolean; // mobile drawer
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  sidebarOpen: false,

  toast(t) {
    const toast: Toast = { ...t, id: uid("toast") };
    set((s) => ({ toasts: [...s.toasts, toast].slice(-4) }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== toast.id) }));
    }, 4500);
  },

  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },

  setSidebarOpen(open) {
    set({ sidebarOpen: open });
  },
}));

/** Imperative helper usable outside components (mutations, services). */
export const toast = (t: Omit<Toast, "id">) => useUiStore.getState().toast(t);
