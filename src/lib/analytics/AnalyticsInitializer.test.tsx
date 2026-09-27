import { render } from "@testing-library/react-native";

const mockInit = jest.fn(async () => {});
const mockIdentify = jest.fn();
const mockReset = jest.fn();
const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  initAnalytics: () => mockInit(),
  identify: (uid: string) => mockIdentify(uid),
  reset: () => mockReset(),
  track: (...args: unknown[]) => mockTrack(...args),
}));

let mockAuth: { status: string; user: { uid: string } | null } = {
  status: "loading",
  user: null,
};
jest.mock("@/src/features/auth/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

let mockSegments: string[] = ["(tabs)", "dashboard"];
jest.mock("expo-router", () => ({
  useSegments: () => mockSegments,
}));

import { AnalyticsInitializer } from "@/src/lib/analytics/AnalyticsInitializer";

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = { status: "loading", user: null };
  mockSegments = ["(tabs)", "dashboard"];
});

describe("AnalyticsInitializer", () => {
  it("initialises once on mount", () => {
    const { rerender } = render(<AnalyticsInitializer />);
    rerender(<AnalyticsInitializer />);
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it("identifies when auth becomes ready", () => {
    const { rerender } = render(<AnalyticsInitializer />);
    mockAuth = { status: "ready", user: { uid: "uid-1" } };
    rerender(<AnalyticsInitializer />);
    expect(mockIdentify).toHaveBeenCalledWith("uid-1");
  });

  it("resets on sign-out but not on a cold unauthenticated start", () => {
    mockAuth = { status: "unauthenticated", user: null };
    const { rerender } = render(<AnalyticsInitializer />);
    expect(mockReset).not.toHaveBeenCalled();

    mockAuth = { status: "ready", user: { uid: "uid-1" } };
    rerender(<AnalyticsInitializer />);
    mockAuth = { status: "unauthenticated", user: null };
    rerender(<AnalyticsInitializer />);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("tracks screen views as route templates, once per change", () => {
    const { rerender } = render(<AnalyticsInitializer />);
    expect(mockTrack).toHaveBeenCalledWith("screen_viewed", { route: "/dashboard" });

    rerender(<AnalyticsInitializer />);
    expect(mockTrack).toHaveBeenCalledTimes(1);

    mockSegments = ["invoices", "[id]"];
    rerender(<AnalyticsInitializer />);
    expect(mockTrack).toHaveBeenLastCalledWith("screen_viewed", { route: "/invoices/[id]" });
  });
});
