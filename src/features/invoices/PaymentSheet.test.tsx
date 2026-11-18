import { Platform } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { PaymentSheet } from "@/src/features/invoices/PaymentSheet";
import { InvoiceSchema, type Invoice } from "@/src/types/schemas";

const mockMutate = jest.fn();
const mockToast = jest.fn();

jest.mock("@/src/features/invoices/queries", () => ({
  useRecordPayment: () => ({ mutateAsync: mockMutate, isPending: false }),
}));
jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => ({ show: mockToast }),
}));
jest.mock("@/src/lib/useSuccessButton", () => ({
  useSuccessButton: () => ({ succeeded: false, triggerSuccess: jest.fn() }),
}));

function invoice(): Invoice {
  return InvoiceSchema.parse({
    id: "inv-1",
    number: "INV-0001",
    status: "sent",
    currency: "AUD",
    clientId: null,
    clientSnapshot: { name: "Tech Client" },
    issueDate: "2026-05-01",
    lineItems: [],
    subtotalCents: 50000,
    gstTotalCents: 5000,
    totalCents: 55000,
    amountPaidCents: 0,
    balanceCents: 55000,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMutate.mockResolvedValue({ status: "paid" });
  Platform.OS = "ios";
});

function pickPaymentDate(
  view: ReturnType<typeof render>,
  year: number,
  monthIndex: number,
  day: number,
) {
  fireEvent.press(view.getByLabelText("Payment date"));
  const date = new Date(year, monthIndex, day);
  act(() => {
    view
      .getByTestId("date-picker")
      .props.onChange(
        {
          type: "set",
          nativeEvent: { timestamp: date.getTime(), utcOffset: 0 },
        },
        date,
      );
  });
}

describe("PaymentSheet payment date", () => {
  it("records a payment when the date is cleared", async () => {
    const view = render(
      <PaymentSheet invoice={invoice()} onClose={jest.fn()} />,
    );
    fireEvent.press(view.getByLabelText("Clear date"));
    fireEvent.press(view.getByLabelText("Record payment"));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate).toHaveBeenCalledWith({
      id: "inv-1",
      payment: { amountCents: 55000, method: "Bank transfer" },
    });
    expect(mockToast).not.toHaveBeenCalled();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });
  });

  it("keeps a date the user picked", async () => {
    const view = render(
      <PaymentSheet invoice={invoice()} onClose={jest.fn()} />,
    );
    pickPaymentDate(view, 2026, 4, 25);
    expect(view.getByText("25 May 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Record payment"));

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith({
        id: "inv-1",
        payment: {
          date: "2026-05-25",
          amountCents: 55000,
          method: "Bank transfer",
        },
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });
  });
});
