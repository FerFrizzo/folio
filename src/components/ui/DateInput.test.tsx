import { Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { DateInput } from "@/src/components/ui/DateInput";

const androidOpen = DateTimePickerAndroid.open as jest.Mock;

function picked(date: Date) {
  return {
    type: "set" as const,
    nativeEvent: { timestamp: date.getTime(), utcOffset: 0 },
  };
}

function dismissed(date: Date) {
  return {
    type: "dismissed" as const,
    nativeEvent: { timestamp: date.getTime(), utcOffset: 0 },
  };
}

const originalOS = Platform.OS;

beforeEach(() => {
  androidOpen.mockClear();
  Platform.OS = "ios";
});

afterEach(() => {
  Platform.OS = originalOS;
});

describe("DateInput", () => {
  it("shows a friendly date and opens the iOS calendar", () => {
    const onChange = jest.fn();
    const view = render(
      <DateInput label="Due date" value="2026-12-18" onChange={onChange} />,
    );

    expect(view.getByText("18 Dec 2026")).toBeTruthy();
    expect(view.queryByPlaceholderText("YYYY-MM-DD")).toBeNull();

    fireEvent.press(view.getByLabelText("Due date"));
    const picker = view.getByTestId("date-picker");
    expect(picker.props.mode).toBe("date");
    expect(picker.props.display).toBe("inline");

    const chosen = new Date(2026, 11, 19);
    picker.props.onChange(picked(chosen), chosen);
    expect(onChange).toHaveBeenCalledWith("2026-12-19");
  });

  it("does not store a date when the iOS picker is dismissed", () => {
    const onChange = jest.fn();
    const view = render(
      <DateInput label="Due date" value="" onChange={onChange} />,
    );
    fireEvent.press(view.getByLabelText("Due date"));
    const today = new Date(2026, 10, 18);
    view.getByTestId("date-picker").props.onChange(dismissed(today), today);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("opens the Android date dialog and stores the confirmed day", () => {
    Platform.OS = "android";
    const onChange = jest.fn();
    const view = render(
      <DateInput
        label="Due date"
        value=""
        onChange={onChange}
        placeholder="Select date"
      />,
    );

    expect(view.getByText("Select date")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Due date"));
    expect(androidOpen).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "date", display: "default" }),
    );

    const chosen = new Date(2026, 11, 18);
    androidOpen.mock.calls[0][0].onChange(picked(chosen), chosen);
    expect(onChange).toHaveBeenCalledWith("2026-12-18");

    onChange.mockClear();
    androidOpen.mock.calls[0][0].onChange(dismissed(chosen), chosen);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a validation error for free text instead of looking empty", () => {
    const view = render(
      <DateInput label="Due date" value="30" onChange={jest.fn()} />,
    );
    expect(view.getByText("30")).toBeTruthy();
    expect(
      view.getByText("Choose a calendar date, such as 18 Dec 2026."),
    ).toBeTruthy();
  });

  it("keeps an <input type=date> on web and shows the friendly day beside it", () => {
    Platform.OS = "web";
    const onChange = jest.fn();
    const view = render(
      <DateInput label="Due date" value="2026-12-18" onChange={onChange} />,
    );

    expect(view.getByText("18 Dec 2026")).toBeTruthy();
    const input = view.getByLabelText("Due date");
    expect(input.props.type).toBe("date");
    expect(input.props.value).toBe("2026-12-18");

    fireEvent(input, "change", { target: { value: "2026-01-02" } });
    expect(onChange).toHaveBeenCalledWith("2026-01-02");
  });

  it("shows the web validation error and does not put free text into the date input", () => {
    Platform.OS = "web";
    const view = render(
      <DateInput label="Due date" value="next week" onChange={jest.fn()} />,
    );
    expect(view.getByLabelText("Due date").props.value).toBe("");
    expect(view.getByText("next week")).toBeTruthy();
    expect(
      view.getByText("Choose a calendar date, such as 18 Dec 2026."),
    ).toBeTruthy();
  });

  it("clears an optional date", () => {
    const onChange = jest.fn();
    const view = render(
      <DateInput
        label="Payment date"
        value="2026-05-25"
        onChange={onChange}
        clearable
      />,
    );
    expect(view.getByText("25 May 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Clear date"));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
