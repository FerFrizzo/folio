import { useEffect, useRef } from "react";
import { useSegments } from "expo-router";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { identify, initAnalytics, reset, track } from "@/src/lib/analytics";
import { normaliseRoute } from "@/src/lib/analytics/route";

// Mounted outside <Gate> so it sees sign-out (Gate unmounts its children when
// the user is signed out). Mirrors RevenueCatInitializer's uid-driven login.
export function AnalyticsInitializer() {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;
  const prevUid = useRef<string | null>(null);

  useEffect(() => {
    void initAnalytics();
  }, []);

  useEffect(() => {
    if (uid) identify(uid);
    else if (prevUid.current) reset();
    prevUid.current = uid;
  }, [uid]);

  const route = normaliseRoute(useSegments());
  useEffect(() => {
    track("screen_viewed", { route });
  }, [route]);

  return null;
}
