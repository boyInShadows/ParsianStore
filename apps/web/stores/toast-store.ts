import { create } from "zustand";

export type ToastTone = "neutral" | "success" | "warning" | "danger";

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastStore = {
  toasts: ToastItem[];
  show: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, tone = "neutral") =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, tone }],
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
