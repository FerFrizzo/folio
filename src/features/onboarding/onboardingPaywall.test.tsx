import { act, fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";

const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("@/src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ status: "ready", user: { uid: "u1" } }),
}));
const mockDismiss = jest.fn();
jest.mock("@/src/features/onboarding/store", () => ({
  useOnboardingStore: (sel: (s: { dismiss: () => void }) => unknown) => sel({ dismiss: mockDismiss }),
}));
jest.mock("@/src/features/onboarding/OnboardingShell", () => ({
  OnboardingShell: ({ children }: { children: import("react").ReactNode }) => children,
}));
jest.mock("expo-constants", () => ({ executionEnvironment: "standalone" }));
const mockIsConfigured = jest.fn();
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: { isConfigured: () => mockIsConfigured() },
}));
jest.mock("react-native-purchases-ui", () => {
  const { Text } = jest.requireActual("react-native");
  return { __esModule: true, default: { Paywall: () => <Text>RC paywall</Text> } };
});

import OnboardingPaywall from "@/app/onboarding/paywall";

const ORIGINAL_OS = Platform.OS;
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  mockIsConfigured.mockResolvedValue(true);
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = "appl_test";
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = "goog_test";
  Platform.OS = "ios";
});

afterAll(() => {
  Platform.OS = ORIGINAL_OS;
  process.env = ORIGINAL_ENV;
});

async function renderScreen() {
  const utils = render(<OnboardingPaywall />);
  await act(async () => {});
  return utils;
}

it("tracks paywall_viewed with the onboarding source", async () => {
  await renderScreen();
  expect(mockTrack).toHaveBeenCalledWith("paywall_viewed", { source: "onboarding" });
});

it("shows the RevenueCat paywall once the SDK is configured", async () => {
  const { getByText } = await renderScreen();
  expect(getByText("RC paywall")).toBeTruthy();
});

it("hides the RevenueCat paywall when the SDK is not configured", async () => {
  mockIsConfigured.mockResolvedValue(false);
  const { queryByText, getByText } = await renderScreen();
  expect(queryByText("RC paywall")).toBeNull();
  expect(getByText("Continue with free")).toBeTruthy();
});

it("hides the RevenueCat paywall when there is no key", async () => {
  delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  const { queryByText } = await renderScreen();
  expect(queryByText("RC paywall")).toBeNull();
  expect(mockIsConfigured).not.toHaveBeenCalled();
});

it("hides the RevenueCat paywall on web", async () => {
  Platform.OS = "web";
  const { queryByText } = await renderScreen();
  expect(queryByText("RC paywall")).toBeNull();
});

it("Continue with free tracks the dismissal and finishes onboarding", async () => {
  const { getByText } = await renderScreen();
  fireEvent.press(getByText("Continue with free"));
  expect(mockTrack).toHaveBeenCalledWith("paywall_dismissed", { source: "onboarding" });
  expect(mockDismiss).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)/dashboard");
});
