import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  createDraft,
  deleteDraft,
  getInvoice,
  listInvoices,
  markSent,
  softDeleteInvoice,
  updateDraft,
  type InvoiceFilter,
} from "@/src/lib/firestore/invoices";
import type {
  Invoice,
  InvoiceDraftInput,
} from "@/src/types/schemas";

export const invoiceKeys = {
  all: (uid: string) => ["invoices", uid] as const,
  list: (uid: string, filter?: InvoiceFilter) =>
    ["invoices", uid, "list", filter ?? {}] as const,
  detail: (uid: string, id: string) => ["invoices", uid, id] as const,
};

export function useInvoices(filter: InvoiceFilter = {}) {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<Invoice[]>({
    queryKey: invoiceKeys.list(uid ?? "anon", filter),
    enabled: !!uid,
    queryFn: () => listInvoices(uid as string, filter),
  });
}

export function useInvoice(id: string | undefined) {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<Invoice | null>({
    queryKey: invoiceKeys.detail(uid ?? "anon", id ?? "none"),
    enabled: !!uid && !!id,
    queryFn: () => getInvoice(uid as string, id as string),
  });
}

export function useCreateDraft(): UseMutationResult<Invoice, Error, InvoiceDraftInput> {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceDraftInput) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return createDraft(auth.user.uid, input);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.all(auth.user.uid) });
      }
    },
  });
}

export function useUpdateDraft() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<InvoiceDraftInput>;
    }) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return updateDraft(auth.user.uid, id, patch);
    },
    onSuccess: (_, vars) => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.detail(auth.user.uid, vars.id) });
        qc.invalidateQueries({ queryKey: invoiceKeys.all(auth.user.uid) });
      }
    },
  });
}

export function useMarkSent() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, prefix }: { id: string; prefix?: string }) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return markSent(auth.user.uid, id, prefix);
    },
    onSuccess: (_, vars) => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.detail(auth.user.uid, vars.id) });
        qc.invalidateQueries({ queryKey: invoiceKeys.all(auth.user.uid) });
      }
    },
  });
}

export function useDeleteDraft() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return deleteDraft(auth.user.uid, id);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.all(auth.user.uid) });
      }
    },
  });
}

export function useArchiveInvoice() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return softDeleteInvoice(auth.user.uid, id);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.all(auth.user.uid) });
      }
    },
  });
}
