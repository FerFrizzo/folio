import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { getProfile, setProfile } from "@/src/lib/firestore/profile";
import { getSettings, setSettings } from "@/src/lib/firestore/settings";
import { ProfileSchema, type Profile, type Settings } from "@/src/types/schemas";

const profileKeys = {
  detail: (uid: string) => ["profile", uid] as const,
};

const settingsKeys = {
  detail: (uid: string) => ["settings", uid] as const,
};

export function useProfile() {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<Profile | null>({
    queryKey: profileKeys.detail(uid ?? "anon"),
    enabled: !!uid,
    queryFn: () => getProfile(uid as string),
  });
}

export function useSettings() {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  return useQuery<Settings>({
    queryKey: settingsKeys.detail(uid ?? "anon"),
    enabled: !!uid,
    queryFn: () => getSettings(uid as string),
  });
}

export function useSetProfile() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: Profile) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return setProfile(auth.user.uid, profile);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({
          queryKey: profileKeys.detail(auth.user.uid),
        });
      }
    },
  });
}

export function useSetSettings() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Settings) => {
      if (auth.status !== "ready") throw new Error("Not signed in");
      return setSettings(auth.user.uid, settings);
    },
    onSuccess: () => {
      if (auth.status === "ready") {
        qc.invalidateQueries({
          queryKey: settingsKeys.detail(auth.user.uid),
        });
      }
    },
  });
}

// Helper for places that need a profile-with-defaults rather than null.
export function useProfileWithDefaults() {
  const q = useProfile();
  return {
    ...q,
    data: q.data ?? ProfileSchema.parse({}),
  };
}
