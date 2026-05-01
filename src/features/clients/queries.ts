import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  createClient,
  getClient,
  listClients,
  softDeleteClient,
  updateClient,
  type DeleteClientResult,
} from "@/src/lib/firestore/clients";
import type { Client, ClientInput } from "@/src/types/schemas";

export const clientKeys = {
  all: (uid: string) => ["clients", uid] as const,
  list: (uid: string) => ["clients", uid, "list"] as const,
  detail: (uid: string, id: string) => ["clients", uid, id] as const,
};

export function useClients() {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<Client[]>({
    queryKey: clientKeys.list(uid ?? "anon"),
    enabled: !!uid,
    queryFn: () => listClients(uid as string),
  });
}

export function useClient(id: string | undefined) {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<Client | null>({
    queryKey: clientKeys.detail(uid ?? "anon", id ?? "none"),
    enabled: !!uid && !!id,
    queryFn: () => getClient(uid as string, id as string),
  });
}

export function useCreateClient() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientInput) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return createClient(auth.user.uid, input);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: clientKeys.all(auth.user.uid) });
      }
    },
  });
}

export function useUpdateClient() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ClientInput> }) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return updateClient(auth.user.uid, id, patch);
    },
    onSuccess: (_, vars) => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: clientKeys.detail(auth.user.uid, vars.id) });
        qc.invalidateQueries({ queryKey: clientKeys.list(auth.user.uid) });
      }
    },
  });
}

export function useSoftDeleteClient() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation<DeleteClientResult, Error, string>({
    mutationFn: (id: string) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return softDeleteClient(auth.user.uid, id);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({ queryKey: clientKeys.all(auth.user.uid) });
      }
    },
  });
}
