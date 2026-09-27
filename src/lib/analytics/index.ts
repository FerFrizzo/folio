import PostHog from "posthog-react-native";
import Constants from "expo-constants";
import { deviceStorage } from "@/src/lib/deviceStorage";
import type { AnalyticsEventName, EventProps } from "@/src/lib/analytics/events";

export type {
  AnalyticsEventName,
  AuthMethod,
  EventProps,
  PaywallSource,
  ReviewTrigger,
} from "@/src/lib/analytics/events";

// Thin wrapper around PostHog. Every public function is safe to call at any
// time — before init, when disabled, or when the SDK throws — so call sites
// never need guards. Analytics must never break a user action.

export const DEFAULT_HOST = "https://eu.i.posthog.com";
const OPT_OUT_KEY = "folio.analytics.optOut";

export type AnalyticsConfig = {
  apiKey: string;
  host: string;
  isDev: boolean;
  enableInDev: boolean;
  isExpoGo: boolean;
  isTest: boolean;
};

export function readConfig(): AnalyticsConfig {
  return {
    apiKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "",
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST || DEFAULT_HOST,
    isDev: typeof __DEV__ !== "undefined" && __DEV__,
    enableInDev: process.env.EXPO_PUBLIC_POSTHOG_ENABLE_DEV === "1",
    isExpoGo: Constants.executionEnvironment === "storeClient",
    isTest: !!process.env.JEST_WORKER_ID,
  };
}

export function shouldEnable(config: AnalyticsConfig): boolean {
  if (!config.apiKey || config.isTest || config.isExpoGo) return false;
  if (config.isDev && !config.enableInDev) return false;
  return true;
}

let client: PostHog | null = null;
let initStarted = false;
// Events tracked before init has finished (e.g. the first screen_viewed, which
// fires while init is still reading deviceStorage). Flushed once the client
// exists; dropped if analytics ends up disabled or opted out.
const MAX_PENDING = 50;
let initDone = false;
let pending: { event: AnalyticsEventName; props: Record<string, string | boolean> }[] = [];
let optedOut = false;
// Remembered so an identify() that lands before init completes still applies.
let currentUid: string | null = null;

export async function initAnalytics(config: AnalyticsConfig = readConfig()): Promise<void> {
  if (initStarted) return;
  initStarted = true;
  try {
    optedOut = (await deviceStorage.getItem(OPT_OUT_KEY)) === "1";
    if (!shouldEnable(config)) return;
    // No PostHogProvider is mounted, so tap autocapture never runs.
    client = new PostHog(config.apiKey, {
      host: config.host,
      captureAppLifecycleEvents: true,
      enableSessionReplay: false,
    });
    if (optedOut) await client.optOut();
    if (currentUid) client.identify(currentUid);
  } catch (err) {
    client = null;
    console.warn("[analytics] init failed", err);
  } finally {
    initDone = true;
    const queued = pending;
    pending = [];
    if (client && !optedOut) queued.forEach((e) => capture(e.event, e.props));
  }
}

function capture(event: AnalyticsEventName, props: Record<string, string | boolean>): void {
  try {
    client?.capture(event, props);
  } catch {
    // Analytics must never break the caller.
  }
}

export function identify(uid: string): void {
  currentUid = uid;
  try {
    client?.identify(uid);
  } catch {
    // Analytics must never break the caller.
  }
}

export function reset(): void {
  currentUid = null;
  try {
    client?.reset();
    // PostHog's reset() also clears its opt-out flag; restore the user's choice.
    if (optedOut) void client?.optOut();
  } catch {
    // Analytics must never break the caller.
  }
}

type PropsArg<E extends AnalyticsEventName> =
  EventProps[E] extends Record<string, never> ? [] : [EventProps[E]];

export function track<E extends AnalyticsEventName>(event: E, ...args: PropsArg<E>): void {
  const props = (args[0] ?? {}) as Record<string, string | boolean>;
  if (!initDone) {
    if (pending.length < MAX_PENDING) pending.push({ event, props });
    return;
  }
  if (!client || optedOut) return;
  capture(event, props);
}

export async function setOptOut(next: boolean): Promise<void> {
  try {
    if (next) {
      track("analytics_opted_out");
      optedOut = true;
      await deviceStorage.setItem(OPT_OUT_KEY, "1");
      // Send the opt-out event before the SDK stops. A failed flush (e.g.
      // offline) must not stop the opt-out itself.
      await client?.flush().catch(() => {});
      await client?.optOut();
    } else {
      optedOut = false;
      await deviceStorage.removeItem(OPT_OUT_KEY);
      await client?.optIn();
    }
  } catch (err) {
    console.warn("[analytics] opt-out change failed", err);
  }
}

export async function isOptedOut(): Promise<boolean> {
  try {
    return (await deviceStorage.getItem(OPT_OUT_KEY)) === "1";
  } catch {
    return false;
  }
}

export function __resetAnalyticsForTests(): void {
  client = null;
  initStarted = false;
  initDone = false;
  pending = [];
  optedOut = false;
  currentUid = null;
}
