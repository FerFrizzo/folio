import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { PaymentsLog } from "@/src/features/invoices/PaymentsLog";
import { InvoiceSchema, type Invoice, type PaymentRecord } from "@/src/types/schemas";

const mockUpdate = jest.fn();
const mockToast = jest.fn();

jest.mock("@/src/features/invoices/queries", () => ({
  useUpdatePayment: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useRemovePayment: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => ({ show: mockToast }),
}));

function invoice(payments: PaymentRecord[]): Invoice {
  return InvoiceSchema.parse({
    id: "inv-1",
    number: "INV-0001",
    status: "paid",
    currency: "AUD",
    clientId: null,
    clientSnapshot: { name: "Tech Client" },
    issueDate: "2026-05-01",
    lineItems: [],
    subtotalCents: 50000,
    gstTotalCents: 5000,
    totalCents: 55000,
    amountPaidCents: 55000,
    balanceCents: 0,
    payments,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue({ status: "paid" });
});

describe("PaymentsLog payment date", () => {
  it("lists a dated payment and leaves the date off when there is none", () => {
    const view = render(
      <PaymentsLog
        invoice={invoice([
          { date: "2026-05-25", amountCents: 25000, method: "Bank transfer" },
          { amountCents: 30000, method: "Cash" },
        ])}
      />,
    );
    expect(view.getByText("25 May 2026 · Bank transfer")).toBeTruthy();
    expect(view.getByText("Cash")).toBeTruthy();
    expect(view.queryByText(/Invalid Date/)).toBeNull();
    expect(view.queryByText("—")).toBeNull();
  });

  it("saves an edit with a blank date", async () => {
    const view = render(
      <PaymentsLog
        invoice={invoice([{ date: "2026-05-25", amountCents: 55000, method: "Bank transfer" }])}
      />,
    );
    fireEvent.press(view.getByLabelText("Edit payment"));
    fireEvent.changeText(view.getByLabelText("Payment date"), "");
    fireEvent.press(view.getByText("Save payment"));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        id: "inv-1",
        index: 0,
        payment: { amountCents: 55000, method: "Bank transfer" },
      }),
    );
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" }),
    );
  });

  it("still rejects a malformed date", async () => {
    const view = render(
      <PaymentsLog
        invoice={invoice([{ amountCents: 55000, method: "Cash" }])}
      />,
    );
    fireEvent.press(view.getByLabelText("Edit payment"));
    fireEvent.changeText(view.getByLabelText("Payment date"), "25-05-2026");
    fireEvent.press(view.getByText("Save payment"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error", message: "Use a date as YYYY-MM-DD." }),
      ),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
