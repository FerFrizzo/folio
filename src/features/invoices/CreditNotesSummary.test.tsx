import { fireEvent, render } from "@testing-library/react-native";
import type { CreditNote } from "@/src/types/schemas";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock("lucide-react-native", () => ({ ChevronRight: () => null }));

import { CreditNotesSummary } from "@/src/features/invoices/CreditNotesSummary";

function cn(id: string, number: string, totalCents: number): CreditNote {
  return { id, number, totalCents } as CreditNote;
}

beforeEach(() => jest.clearAllMocks());

describe("CreditNotesSummary", () => {
  it("renders nothing without credit notes", () => {
    const { toJSON } = render(
      <CreditNotesSummary creditNotes={[]} currency="AUD" netBalanceCents={0} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("lists each credit note with its total and the net balance", () => {
    const { getByText } = render(
      <CreditNotesSummary
        creditNotes={[cn("a", "CN-0001", -11000), cn("b", "CN-0002", -11000)]}
        currency="AUD"
        netBalanceCents={-11000}
      />,
    );
    expect(getByText("CN-0001")).toBeTruthy();
    expect(getByText("CN-0002")).toBeTruthy();
    expect(getByText(/Net balance:/)).toBeTruthy();
  });

  // Regression: credit notes were plain text, so the credit note screen (and
  // its Archive action) was unreachable and duplicates couldn't be removed.
  it("opens the tapped credit note", () => {
    const { getByLabelText } = render(
      <CreditNotesSummary
        creditNotes={[cn("a", "CN-0001", -11000), cn("b", "CN-0002", -11000)]}
        currency="AUD"
        netBalanceCents={-11000}
      />,
    );
    fireEvent.press(getByLabelText("Open credit note CN-0002"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/credit-notes/[id]",
      params: { id: "b" },
    });
  });
});
