import { fireEvent, render } from "@testing-library/react-native";

const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
// The forms talk to Firestore; stub them so only the step buttons remain.
jest.mock("@/src/features/settings/BusinessProfileForm", () => ({ BusinessProfileForm: () => null }));
jest.mock("@/src/features/settings/LogoPicker", () => ({ LogoPicker: () => null }));
jest.mock("@/src/features/settings/PaymentDetailsForm", () => ({ PaymentDetailsForm: () => null }));
// OnboardingShell reads safe-area insets, which need a provider; render children only.
jest.mock("@/src/features/onboarding/OnboardingShell", () => ({
  OnboardingShell: ({ children }: { children: import("react").ReactNode }) => children,
}));

import OnboardingProfile from "@/app/onboarding/index";
import OnboardingLogo from "@/app/onboarding/logo";
import OnboardingPayment from "@/app/onboarding/payment";

beforeEach(() => jest.clearAllMocks());

it.each([
  ["profile", OnboardingProfile, "Next: Logo"],
  ["logo", OnboardingLogo, "Next: Payment"],
  ["payment", OnboardingPayment, "Done"],
] as const)("%s: completing tracks skipped=false", (step, Screen, cta) => {
  const { getByText } = render(<Screen />);
  fireEvent.press(getByText(cta));
  expect(mockTrack).toHaveBeenCalledWith("onboarding_step_completed", { step, skipped: false });
});

it.each([
  ["profile", OnboardingProfile],
  ["logo", OnboardingLogo],
  ["payment", OnboardingPayment],
] as const)("%s: skipping tracks skipped=true", (step, Screen) => {
  const { getByText } = render(<Screen />);
  fireEvent.press(getByText("Skip"));
  expect(mockTrack).toHaveBeenCalledWith("onboarding_step_completed", { step, skipped: true });
});
