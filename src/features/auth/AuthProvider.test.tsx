import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";

let authCallback: ((user: unknown) => void) | null = null;
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, next: (u: unknown) => void) => {
    authCallback = next;
    return () => {};
  },
  signOut: jest.fn(),
}));
jest.mock("@/lib/firebase", () => ({
  getFirebaseAuth: () => ({}),
  isFirebaseConfigured: () => true,
}));
jest.mock("@/features/auth/linking/google", () => ({ signOutGoogleNative: jest.fn() }));
const mockMark = jest.fn();
jest.mock("@/src/features/auth/authPrefs", () => ({ markSignedIn: () => mockMark() }));

import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";

function Status() {
  return <Text>{useAuth().status}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
  authCallback = null;
});

it("remembers the device has signed in once a user is present", () => {
  const { getByText } = render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  act(() => authCallback?.({ uid: "u1" }));
  expect(getByText("ready")).toBeTruthy();
  expect(mockMark).toHaveBeenCalledTimes(1);
});

it("does not mark when signed out", () => {
  const { getByText } = render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  act(() => authCallback?.(null));
  expect(getByText("unauthenticated")).toBeTruthy();
  expect(mockMark).not.toHaveBeenCalled();
});
