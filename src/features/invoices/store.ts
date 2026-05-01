import { create } from "zustand";

// Persists across navigation per spec §13. In Phase 1 it lives in memory only;
// hydrating from SecureStore so it survives app reload comes with the rest of
// the settings persistence in Phase 2.

export type InvoiceStatusFilter = "all" | "draft" | "sent" | "partial" | "overdue" | "paid";

type State = {
  query: string;
  statusFilter: InvoiceStatusFilter;
  setQuery: (q: string) => void;
  setStatusFilter: (s: InvoiceStatusFilter) => void;
};

export const useInvoiceListStore = create<State>((set) => ({
  query: "",
  statusFilter: "all",
  setQuery: (q) => set({ query: q }),
  setStatusFilter: (s) => set({ statusFilter: s }),
}));
