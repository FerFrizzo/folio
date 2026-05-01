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
  linkCreditNote,
  listInvoices,
  markSent,
  recordPayment,
  removePayment,
  restoreInvoice,
  softDeleteInvoice,
  updateDraft,
  type InvoiceFilter,
  type RecordPaymentInput,
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
    mutationFn: ({ id }: { id: string }) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return markSent(auth.user.uid, id);
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

export function useRestoreInvoice() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return restoreInvoice(auth.user.uid, id);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.all(auth.user.uid) });
      }
    },
  });
}

export function useRecordPayment() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payment,
    }: {
      id: string;
      payment: RecordPaymentInput;
    }) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return recordPayment(auth.user.uid, id, payment);
    },
    onSuccess: (_, vars) => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.detail(auth.user.uid, vars.id) });
        qc.invalidateQueries({ queryKey: invoiceKeys.all(auth.user.uid) });
      }
    },
  });
}

export function useRemovePayment() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return removePayment(auth.user.uid, id, index);
    },
    onSuccess: (_, vars) => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.detail(auth.user.uid, vars.id) });
        qc.invalidateQueries({ queryKey: invoiceKeys.all(auth.user.uid) });
      }
    },
  });
}

export function useLinkCreditNote() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, creditNoteId }: { invoiceId: string; creditNoteId: string }) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return linkCreditNote(auth.user.uid, invoiceId, creditNoteId);
    },
    onSuccess: (_, vars) => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: invoiceKeys.detail(auth.user.uid, vars.invoiceId) });
      }
    },
  });
}
