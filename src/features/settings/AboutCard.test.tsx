import { Linking, Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@/src/lib/firebase", () => ({ getFirebaseFunctions: () => ({}) }));
jest.mock("firebase/functions", () => ({ httpsCallable: jest.fn() }));
jest.mock("@/src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ status: "ready", user: { uid: "u1", isAnonymous: false, email: "a@b.co" } }),
  signOut: jest.fn(),
}));
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => ({ show: jest.fn() }) }));

import { AboutCard, RATE_URL } from "@/src/features/settings/AboutCard";

const originalOS = Platform.OS;
afterEach(() => {
  Object.defineProperty(Platform, "OS", { value: originalOS });
});

it("opens the App Store write-review page on iOS", async () => {
  Object.defineProperty(Platform, "OS", { value: "ios" });
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  const { getByLabelText } = render(<AboutCard />);
  fireEvent.press(getByLabelText("Rate Folio on the App Store"));
  expect(open).toHaveBeenCalledWith(RATE_URL);
  expect(RATE_URL).toBe("https://apps.apple.com/app/id6767987024?action=write-review");
});

it("hides the rate link off iOS", () => {
  Object.defineProperty(Platform, "OS", { value: "android" });
  const { queryByLabelText } = render(<AboutCard />);
  expect(queryByLabelText("Rate Folio on the App Store")).toBeNull();
});
