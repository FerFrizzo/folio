import { Keyboard, Platform, StyleSheet, Text, Pressable } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";
import { ToastProvider, useToast } from "@/src/components/ui/Toast";

// Capture the listeners ToastProvider registers so the test can drive them
// directly — RN's Keyboard module emits nothing under Jest.
const listeners: Record<string, (e: unknown) => void> = {};
const removeSpy = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // Existing suite exercises the iOS behaviour (offset applied); the
  // Android-specific cases below override this per test.
  Platform.OS = "ios";
  for (const key of Object.keys(listeners)) delete listeners[key];
  // Cast through unknown: Keyboard.addListener's real signature is a union of
  // per-event overloads that a generic stub can't satisfy under strict tsc.
  jest.spyOn(Keyboard, "addListener").mockImplementation((((
    event: string,
    cb: (e: unknown) => void,
  ) => {
    listeners[event] = cb;
    return { remove: removeSpy };
  }) as unknown) as typeof Keyboard.addListener);
});

function Trigger() {
  const toast = useToast();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="show" onPress={() => toast.show({ message: "Saved to library" })}>
      <Text>show</Text>
    </Pressable>
  );
}

function renderToast() {
  return render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
}

function bottomOf(node: { props: { style?: unknown } }): number | undefined {
  // StyleSheet.flatten<T> can't infer T from an `unknown` argument, so under
  // strict tsc the result type collapses to `{}` and `.bottom` doesn't exist
  // on it. Cast the flattened result instead of the input to keep the node
  // param's `unknown` style typing (it's what a real ReactTestInstance gives us).
  return (StyleSheet.flatten(node.props.style) as { bottom?: number } | undefined)
    ?.bottom;
}

describe("Toast keyboard avoidance", () => {
  it("sits 32px from the bottom when no keyboard is up", () => {
    const { getByLabelText, getByTestId } = renderToast();
    fireEvent.press(getByLabelText("show"));
    expect(bottomOf(getByTestId("toast"))).toBe(32);
  });

  // The bug: saving a line to the library happens with the description field
  // focused, so a bottom-pinned toast was hidden behind the keyboard.
  it("lifts above the keyboard when it opens", () => {
    const { getByLabelText, getByTestId } = renderToast();
    fireEvent.press(getByLabelText("show"));
    act(() => {
      listeners.keyboardDidShow?.({ endCoordinates: { height: 300 } });
    });
    expect(bottomOf(getByTestId("toast"))).toBe(332);
  });

  it("drops back down when the keyboard closes", () => {
    const { getByLabelText, getByTestId } = renderToast();
    fireEvent.press(getByLabelText("show"));
    act(() => {
      listeners.keyboardDidShow?.({ endCoordinates: { height: 300 } });
    });
    act(() => {
      listeners.keyboardDidHide?.({});
    });
    expect(bottomOf(getByTestId("toast"))).toBe(32);
  });

  it("also responds to the iOS will-show event", () => {
    const { getByLabelText, getByTestId } = renderToast();
    fireEvent.press(getByLabelText("show"));
    act(() => {
      listeners.keyboardWillShow?.({ endCoordinates: { height: 250 } });
    });
    expect(bottomOf(getByTestId("toast"))).toBe(282);
  });

  it("removes every keyboard listener on unmount", () => {
    const { unmount } = renderToast();
    unmount();
    expect(removeSpy).toHaveBeenCalledTimes(4);
  });
});

describe("Toast keyboard avoidance is iOS-only", () => {
  // Android already resizes the window for the keyboard (Expo's default
  // softwareKeyboardLayoutMode: "resize"), so applying the measured height on
  // top of that would push the toast ~300dp too high. Confirm the offset is
  // only ever applied on iOS, while every platform still keeps its listeners
  // wired up (asserted below) so behaviour stays deterministic.
  it("lifts the toast on iOS when the keyboard opens", () => {
    Platform.OS = "ios";
    const { getByLabelText, getByTestId } = renderToast();
    fireEvent.press(getByLabelText("show"));
    act(() => {
      listeners.keyboardDidShow?.({ endCoordinates: { height: 300 } });
    });
    expect(bottomOf(getByTestId("toast"))).toBe(332);
  });

  it("leaves the toast at 32px on Android when the keyboard opens", () => {
    Platform.OS = "android";
    const { getByLabelText, getByTestId } = renderToast();
    fireEvent.press(getByLabelText("show"));
    act(() => {
      listeners.keyboardDidShow?.({ endCoordinates: { height: 300 } });
    });
    expect(bottomOf(getByTestId("toast"))).toBe(32);
  });

  it("leaves the toast at 32px on web when the keyboard opens", () => {
    Platform.OS = "web";
    const { getByLabelText, getByTestId } = renderToast();
    fireEvent.press(getByLabelText("show"));
    act(() => {
      listeners.keyboardDidShow?.({ endCoordinates: { height: 300 } });
    });
    expect(bottomOf(getByTestId("toast"))).toBe(32);
  });

  it("still registers all four keyboard listeners on Android", () => {
    Platform.OS = "android";
    renderToast();
    expect(Keyboard.addListener).toHaveBeenCalledTimes(4);
  });
});
