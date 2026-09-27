import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockIsOptedOut = jest.fn(async () => false);
const mockSetOptOut = jest.fn(async (_v: boolean) => {});
jest.mock("@/src/lib/analytics", () => ({
  isOptedOut: () => mockIsOptedOut(),
  setOptOut: (v: boolean) => mockSetOptOut(v),
}));

import { UsageDataCard } from "@/src/features/settings/UsageDataCard";

beforeEach(() => jest.clearAllMocks());

it("shows sharing on by default", async () => {
  const { getByLabelText } = render(<UsageDataCard />);
  await waitFor(() => expect(getByLabelText("Share usage data").props.value).toBe(true));
});

it("reflects a stored opt-out", async () => {
  mockIsOptedOut.mockResolvedValueOnce(true);
  const { getByLabelText } = render(<UsageDataCard />);
  await waitFor(() => expect(getByLabelText("Share usage data").props.value).toBe(false));
});

it("turning sharing off opts out", async () => {
  const { getByLabelText } = render(<UsageDataCard />);
  const toggle = getByLabelText("Share usage data");
  await act(async () => {
    fireEvent(toggle, "valueChange", false);
  });
  expect(mockSetOptOut).toHaveBeenCalledWith(true);
  expect(getByLabelText("Share usage data").props.value).toBe(false);
});
