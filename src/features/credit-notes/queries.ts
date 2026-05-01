import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  createCreditNote,
  getCreditNote,
  listCreditNotes,
  listCreditNotesForInvoice,
  softDeleteCreditNote,
} from "@/src/lib/firestore/creditNotes";
import { invoiceKeys } from "@/src/features/invoices/queries";
import type { CreditNote, CreditNoteInput } from "@/src/types/schemas";

export const creditNoteKeys = {
  all: (uid: string) => ["creditNotes", uid] as const,
  list: (uid: string) => ["creditNotes", uid, "list"] as const,
  forInvoice: (uid: string, invoiceId: string) =>
    ["creditNotes", uid, "for-invoice", invoiceId] as const,
  detail: (uid: string, id: string) => ["creditNotes", uid, id] as const,
};

export function useCreditNotes() {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<CreditNote[]>({
    queryKey: creditNoteKeys.list(uid ?? "anon"),
    enabled: !!uid,
    queryFn: () => listCreditNotes(uid as string),
  });
}

export function useCreditNotesForInvoice(invoiceId: string | undefined) {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<CreditNote[]>({
    queryKey: creditNoteKeys.forInvoice(uid ?? "anon", invoiceId ?? "none"),
    enabled: !!uid && !!invoiceId,
    queryFn: () => listCreditNotesForInvoice(uid as string, invoiceId as string),
  });
}

export function useCreditNote(id: string | undefined) {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<CreditNote | null>({
    queryKey: creditNoteKeys.detail(uid ?? "anon", id ?? "none"),
    enabled: !!uid && !!id,
    queryFn: () => getCreditNote(uid as string, id as string),
  });
}

export function useCreateCreditNote() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreditNoteInput) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return createCreditNote(auth.user.uid, input);
    },
    onSuccess: (cn) => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: creditNoteKeys.all(auth.user.uid) });
        qc.invalidateQueries({
          queryKey: invoiceKeys.detail(auth.user.uid, cn.originalInvoiceId),
        });
        qc.invalidateQueries({
          queryKey: creditNoteKeys.forInvoice(auth.user.uid, cn.originalInvoiceId),
        });
      }
    },
  });
}

export function useArchiveCreditNote() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return softDeleteCreditNote(auth.user.uid, id);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: creditNoteKeys.all(auth.user.uid) });
      }
    },
  });
}
