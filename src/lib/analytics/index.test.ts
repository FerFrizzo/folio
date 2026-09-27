// posthog-react-native is replaced by a recording fake so we can assert what
// would be sent. Names carry the `mock` prefix because babel-plugin-jest-hoist
// hoists the factories above these declarations.
const mockCapture = jest.fn();
const mockIdentify = jest.fn();
const mockReset = jest.fn();
const mockOptOut = jest.fn(async () => {});
const mockOptIn = jest.fn(async () => {});
const mockFlush = jest.fn(async () => {});
const mockCtor = jest.fn();

jest.mock("posthog-react-native", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((...args: unknown[]) => {
    mockCtor(...args);
    return {
      capture: mockCapture,
      identify: mockIdentify,
      reset: mockReset,
      optOut: mockOptOut,
      optIn: mockOptIn,
      flush: mockFlush,
    };
  }),
}));

const mockStore = new Map<string, string>();
jest.mock("@/src/lib/deviceStorage", () => ({
  deviceStorage: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockStore.delete(k);
    }),
  },
}));

import {
  DEFAULT_HOST,
  __resetAnalyticsForTests,
  identify,
  initAnalytics,
  isOptedOut,
  reset,
  setOptOut,
  shouldEnable,
  track,
  type AnalyticsConfig,
} from "@/src/lib/analytics";

const enabled: AnalyticsConfig = {
  apiKey: "phc_test",
  host: DEFAULT_HOST,
  isDev: false,
  enableInDev: false,
  isExpoGo: false,
  isTest: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  __resetAnalyticsForTests();
});

describe("shouldEnable", () => {
  it("is on for a production build with a key", () => {
    expect(shouldEnable(enabled)).toBe(true);
  });
  it("is off without a key", () => {
    expect(shouldEnable({ ...enabled, apiKey: "" })).toBe(false);
  });
  it("is off in Expo Go", () => {
    expect(shouldEnable({ ...enabled, isExpoGo: true })).toBe(false);
  });
  it("is off under Jest", () => {
    expect(shouldEnable({ ...enabled, isTest: true })).toBe(false);
  });
  it("is off in __DEV__ unless explicitly enabled", () => {
    expect(shouldEnable({ ...enabled, isDev: true })).toBe(false);
    expect(shouldEnable({ ...enabled, isDev: true, enableInDev: true })).toBe(true);
  });
});

describe("initAnalytics", () => {
  it("creates an EU client with lifecycle events and no session replay", async () => {
    await initAnalytics(enabled);
    expect(mockCtor).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        host: "https://eu.i.posthog.com",
        captureAppLifecycleEvents: true,
        enableSessionReplay: false,
      }),
    );
  });

  it("does nothing when disabled, and track is then a no-op", async () => {
    await initAnalytics({ ...enabled, apiKey: "" });
    track("invoice_drafted");
    expect(mockCtor).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("only initialises once", async () => {
    await initAnalytics(enabled);
    await initAnalytics(enabled);
    expect(mockCtor).toHaveBeenCalledTimes(1);
  });

  it("swallows a constructor failure and stays a no-op", async () => {
    mockCtor.mockImplementationOnce(() => {
      throw new Error("native module missing");
    });
    jest.spyOn(console, "warn").mockImplementationOnce(() => {});
    await expect(initAnalytics(enabled)).resolves.toBeUndefined();
    expect(() => track("invoice_drafted")).not.toThrow();
    expect(mockCapture).not.toHaveBeenCalled();
  });
});

describe("track", () => {
  it("forwards the event and props", async () => {
    await initAnalytics(enabled);
    track("invoice_sent", { channel: "manual" });
    expect(mockCapture).toHaveBeenCalledWith("invoice_sent", { channel: "manual" });
  });

  it("sends an empty props object for prop-less events", async () => {
    await initAnalytics(enabled);
    track("client_created");
    expect(mockCapture).toHaveBeenCalledWith("client_created", {});
  });

  it("never throws when the SDK throws", async () => {
    await initAnalytics(enabled);
    mockCapture.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    expect(() => track("invoice_drafted")).not.toThrow();
  });
});

// The route effect fires track("screen_viewed") before the async init has
// created the client; those early events must not be lost.
describe("events before init", () => {
  it("delivers an event tracked before init once init completes", async () => {
    track("screen_viewed", { route: "/(tabs)/dashboard" });
    expect(mockCapture).not.toHaveBeenCalled();
    await initAnalytics(enabled);
    expect(mockCapture).toHaveBeenCalledWith("screen_viewed", { route: "/(tabs)/dashboard" });
  });

  it("delivers queued events in order, before later events", async () => {
    track("screen_viewed", { route: "/login" });
    track("invoice_drafted");
    await initAnalytics(enabled);
    track("client_created");
    expect(mockCapture.mock.calls.map((c) => c[0])).toEqual([
      "screen_viewed",
      "invoice_drafted",
      "client_created",
    ]);
  });

  it("delivers events tracked while init is in flight", async () => {
    const pending = initAnalytics(enabled);
    track("invoice_drafted");
    await pending;
    expect(mockCapture).toHaveBeenCalledWith("invoice_drafted", {});
  });

  it("drops queued events when analytics is disabled", async () => {
    track("invoice_drafted");
    await initAnalytics({ ...enabled, apiKey: "" });
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("drops queued events when the user has opted out", async () => {
    mockStore.set("folio.analytics.optOut", "1");
    track("invoice_drafted");
    await initAnalytics(enabled);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("drops queued events when the client fails to start", async () => {
    mockCtor.mockImplementationOnce(() => {
      throw new Error("native module missing");
    });
    jest.spyOn(console, "warn").mockImplementationOnce(() => {});
    track("invoice_drafted");
    await initAnalytics(enabled);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("bounds the queue at 50 events, keeping the earliest", async () => {
    for (let i = 0; i < 60; i++) track("screen_viewed", { route: `/r${i}` });
    await initAnalytics(enabled);
    expect(mockCapture).toHaveBeenCalledTimes(50);
    expect(mockCapture).toHaveBeenNthCalledWith(1, "screen_viewed", { route: "/r0" });
    expect(mockCapture).toHaveBeenLastCalledWith("screen_viewed", { route: "/r49" });
  });

  it("does not queue once a disabled init has completed", async () => {
    await initAnalytics({ ...enabled, apiKey: "" });
    track("invoice_drafted");
    __resetAnalyticsForTests();
    await initAnalytics(enabled);
    expect(mockCapture).not.toHaveBeenCalled();
  });
});

describe("identify / reset", () => {
  it("identifies by uid only", async () => {
    await initAnalytics(enabled);
    identify("uid-1");
    expect(mockIdentify).toHaveBeenCalledWith("uid-1");
  });

  // Review Focus #1: the root layout calls identify in the same tick as the
  // async init, so the uid must be applied once the client exists.
  it("applies an identify that arrived before init", async () => {
    identify("uid-early");
    expect(mockIdentify).not.toHaveBeenCalled();
    await initAnalytics(enabled);
    expect(mockIdentify).toHaveBeenCalledWith("uid-early");
  });

  it("resets the client and forgets the uid", async () => {
    await initAnalytics(enabled);
    identify("uid-1");
    reset();
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

describe("opt-out", () => {
  it("sends analytics_opted_out, then opts out and persists", async () => {
    await initAnalytics(enabled);
    await setOptOut(true);
    expect(mockCapture).toHaveBeenCalledWith("analytics_opted_out", {});
    expect(mockOptOut).toHaveBeenCalledTimes(1);
    expect(mockFlush).toHaveBeenCalledTimes(1);
    // capture -> flush -> optOut, so the opt-out event actually leaves the device.
    expect(mockCapture.mock.invocationCallOrder[0]).toBeLessThan(
      mockFlush.mock.invocationCallOrder[0] as number,
    );
    expect(mockFlush.mock.invocationCallOrder[0]).toBeLessThan(
      mockOptOut.mock.invocationCallOrder[0] as number,
    );
    expect(await isOptedOut()).toBe(true);
    track("invoice_drafted");
    expect(mockCapture).toHaveBeenCalledTimes(1);
  });

  it("still opts out and persists when the flush fails", async () => {
    await initAnalytics(enabled);
    mockFlush.mockRejectedValueOnce(new Error("network"));
    await setOptOut(true);
    expect(mockOptOut).toHaveBeenCalledTimes(1);
    expect(await isOptedOut()).toBe(true);
  });

  it("applies a persisted opt-out on init", async () => {
    mockStore.set("folio.analytics.optOut", "1");
    await initAnalytics(enabled);
    expect(mockOptOut).toHaveBeenCalledTimes(1);
    track("invoice_drafted");
    expect(mockCapture).not.toHaveBeenCalled();
  });

  // Review Focus #2: PostHog's reset() clears its own opt-out flag.
  it("re-applies opt-out after reset", async () => {
    await initAnalytics(enabled);
    await setOptOut(true);
    mockOptOut.mockClear();
    reset();
    expect(mockOptOut).toHaveBeenCalledTimes(1);
  });

  it("opting back in resumes sending", async () => {
    await initAnalytics(enabled);
    await setOptOut(true);
    await setOptOut(false);
    expect(mockOptIn).toHaveBeenCalledTimes(1);
    expect(await isOptedOut()).toBe(false);
    track("invoice_drafted");
    expect(mockCapture).toHaveBeenLastCalledWith("invoice_drafted", {});
  });

  it("isOptedOut defaults to false", async () => {
    expect(await isOptedOut()).toBe(false);
  });
});
