import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockToast = jest.fn();
jest.mock("@/components/ui", () => ({
  ...jest.requireActual("@/components/ui"),
  useToast: () => ({ show: mockToast }),
}));
jest.mock("@/src/lib/analytics", () => ({ track: jest.fn() }));
jest.mock("firebase/auth", () => ({ getAdditionalUserInfo: jest.fn() }));
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
jest.mock("@/features/auth/email", () => ({
  signInWithEmail: (...a: unknown[]) => mockSignIn(...a),
  signUpWithEmail: (...a: unknown[]) => mockSignUp(...a),
  sendPasswordReset: jest.fn(),
}));
jest.mock("@/features/auth/linking/google", () => ({
  googleConfigured: () => true,
  signInWithGoogleNative: jest.fn(),
  signInWithGoogleWeb: jest.fn(),
}));
jest.mock("@/features/auth/linking/apple", () => ({
  appleAvailableOnPlatform: () => true,
  signInWithApple: jest.fn(),
}));
let mockSignedInBefore = false;
jest.mock("@/src/features/auth/authPrefs", () => ({
  hasSignedInBefore: async () => mockSignedInBefore,
}));

import { LoginScreen } from "@/src/features/auth/LoginScreen";

const ORIGINAL_OS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  mockSignedInBefore = false;
  Platform.OS = "ios";
});
afterAll(() => {
  Platform.OS = ORIGINAL_OS;
});

async function renderScreen() {
  render(<LoginScreen />);
  await act(async () => {});
}

const tab = (name: string) => screen.getByRole("tab", { name });
const submit = (name: string) => screen.getByRole("button", { name });


describe("default tab", () => {
  it("opens on Create account for a fresh install", async () => {
    await renderScreen();
    expect(tab("Create account").props.accessibilityState).toEqual({ selected: true });
    expect(submit("Create account")).toBeTruthy();
  });

  it("opens on Sign in when this device has signed in before", async () => {
    mockSignedInBefore = true;
    await renderScreen();
    expect(tab("Sign in").props.accessibilityState).toEqual({ selected: true });
    expect(submit("Continue")).toBeTruthy();
  });
});

describe("sign-up", () => {
  it("has no Name field", async () => {
    await renderScreen();
    expect(screen.queryByText("Name")).toBeNull();
    expect(screen.queryByPlaceholderText("Your name")).toBeNull();
  });

  it("creates the account with just email and password", async () => {
    mockSignUp.mockResolvedValueOnce({ uid: "u1" });
    await renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), " sam@example.com ");
    fireEvent.changeText(screen.getByPlaceholderText("At least 8 characters"), "pw123456");
    fireEvent.press(submit("Create account"));
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith("sam@example.com", "pw123456"));
  });

  it("still enforces the 8-character minimum", async () => {
    await renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "sam@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("At least 8 characters"), "short");
    fireEvent.press(submit("Create account"));
    expect(await screen.findByText(/at least 8 characters/i)).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe("wrong password hint", () => {
  async function failSignIn(code: string) {
    mockSignedInBefore = true;
    mockSignIn.mockRejectedValueOnce({ code });
    await renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "sam@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Your password"), "wrongpass");
    fireEvent.press(submit("Continue"));
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
  }

  it("offers Create account after a wrong-credentials failure and keeps the email", async () => {
    await failSignIn("auth/invalid-credential");
    fireEvent.press(screen.getByRole("button", { name: /new to folio\? create an account/i }));
    expect(tab("Create account").props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByPlaceholderText("you@example.com").props.value).toBe("sam@example.com");
  });

  it("does not offer it for other failures", async () => {
    await failSignIn("auth/network-request-failed");
    expect(screen.queryByText(/new to folio/i)).toBeNull();
  });

  it("hides the hint again after switching tabs", async () => {
    await failSignIn("auth/invalid-credential");
    fireEvent.press(tab("Create account"));
    fireEvent.press(tab("Sign in"));
    expect(screen.queryByText(/new to folio/i)).toBeNull();
  });
});

describe("layout", () => {
  it("shows the value proposition", async () => {
    await renderScreen();
    expect(screen.getByText("Tax invoices in 60 seconds")).toBeTruthy();
    expect(screen.getByText(/ATO-compliant/)).toBeTruthy();
    expect(screen.getByText(/Free to start/)).toBeTruthy();
  });

  it("puts Apple and Google above the email form", async () => {
    await renderScreen();
    const json = JSON.stringify(screen.toJSON());
    const apple = json.indexOf("Continue with Apple");
    const google = json.indexOf("Continue with Google");
    const email = json.indexOf("you@example.com");
    expect(apple).toBeGreaterThan(-1);
    expect(google).toBeGreaterThan(-1);
    expect(apple).toBeLessThan(email);
    expect(google).toBeLessThan(email);
  });
});
