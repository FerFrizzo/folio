import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  createLibraryEntry,
  deleteLibraryEntry,
  listLibraryEntries,
  updateLibraryEntry,
} from "@/src/lib/firestore/lineItemLibrary";
import type {
  LineItemLibraryEntry,
  LineItemLibraryInput,
} from "@/src/types/schemas";

const libraryKeys = {
  list: (uid: string) => ["lineItemLibrary", uid, "list"] as const,
};

export function useLineItemLibrary() {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<LineItemLibraryEntry[]>({
    queryKey: libraryKeys.list(uid ?? "anon"),
    enabled: !!uid,
    queryFn: () => listLibraryEntries(uid as string),
  });
}

export function useCreateLibraryEntry() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LineItemLibraryInput) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return createLibraryEntry(auth.user.uid, input);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: libraryKeys.list(auth.user.uid) });
      }
    },
  });
}

export function useUpdateLibraryEntry() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<LineItemLibraryInput> }) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return updateLibraryEntry(auth.user.uid, id, patch);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: libraryKeys.list(auth.user.uid) });
      }
    },
  });
}

export function useDeleteLibraryEntry() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return deleteLibraryEntry(auth.user.uid, id);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: libraryKeys.list(auth.user.uid) });
      }
    },
  });
}
