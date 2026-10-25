import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { CreditNote } from "@/src/types/schemas";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("lucide-react-native", () => ({ ArrowLeft: () => null }));
jest.mock("react-native-webview", () => ({ __esModule: true, default: () => null }));
const mockShow = jest.fn();
jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => ({ show: mockShow }),
}));
// Render the dialog's confirm action inline so the test can press it.
jest.mock("@/src/components/ui/ConfirmDialog", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    ConfirmDialog: ({
      visible,
      onConfirm,
    }: {
      visible: boolean;
      onConfirm: () => void;
    }) =>
      visible ? (
        <Pressable accessibilityLabel="Confirm archive" onPress={onConfirm}>
          <Text>Confirm</Text>
        </Pressable>
      ) : null,
  };
});
const mockGenerate = jest.fn();
const mockShare = jest.fn();
jest.mock("@/src/lib/pdf/generate-credit-note", () => ({
  generateCreditNotePdf: (...a: unknown[]) => mockGenerate(...a),
  shareCreditNotePdf: (...a: unknown[]) => mockShare(...a),
}));
const mockArchive = jest.fn();
jest.mock("@/src/features/credit-notes/queries", () => ({
  useArchiveCreditNote: () => ({ mutateAsync: mockArchive }),
  useRestoreCreditNote: () => ({ mutateAsync: jest.fn() }),
}));
const mockProfile = { businessName: "Biz" };
const mockSettings = { numbering: {} };
jest.mock("@/src/features/settings/queries", () => ({
  useProfile: () => ({ data: mockProfile }),
  useSettings: () => ({ data: mockSettings }),
}));

import { CreditNoteDetail } from "@/src/features/credit-notes/CreditNoteDetail";

const creditNote = {
  id: "cn1",
  number: "CN-0002",
  originalInvoiceNumber: "INV-0001",
  issueDate: "2026-10-01",
  currency: "AUD",
  reason: "",
  totalCents: -11000,
  clientSnapshot: { name: "Client" },
  lineItems: [],
} as unknown as CreditNote;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockGenerate.mockResolvedValue({ uri: "file:///cn.pdf", html: "<p/>" });
});
afterEach(() => jest.restoreAllMocks());

async function renderAndArchive() {
  const utils = render(<CreditNoteDetail creditNote={creditNote} />);
  await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
  fireEvent.press(utils.getByText("Archive"));
  await act(async () => {
    fireEvent.press(utils.getByLabelText("Confirm archive"));
  });
  return utils;
}

describe("CreditNoteDetail", () => {
  it("archives, confirms and goes back", async () => {
    mockArchive.mockResolvedValueOnce(undefined);
    await renderAndArchive();
    expect(mockArchive).toHaveBeenCalledWith("cn1");
    expect(mockShow).toHaveBeenCalledWith({ message: "CN-0002 archived.", variant: "info" });
    expect(mockBack).toHaveBeenCalled();
  });

  // Regression: a failed archive was an unhandled rejection — the dialog
  // closed and nothing else happened.
  it("shows an error and stays when archiving fails", async () => {
    mockArchive.mockRejectedValueOnce(new Error("offline"));
    await renderAndArchive();
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" }),
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("shares the generated PDF", async () => {
    mockShare.mockResolvedValueOnce(undefined);
    const { getByText } = render(<CreditNoteDetail creditNote={creditNote} />);
    await waitFor(() => expect(getByText("Share PDF")).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText("Share PDF"));
    });
    expect(mockShare).toHaveBeenCalledWith("file:///cn.pdf", "CN-0002.pdf");
    expect(mockShow).not.toHaveBeenCalled();
  });

  // Regression: share failures were swallowed by try/finally.
  it("shows an error when sharing fails", async () => {
    mockShare.mockRejectedValueOnce(new Error("Sharing is not available on this device."));
    const { getByText } = render(<CreditNoteDetail creditNote={creditNote} />);
    await waitFor(() => expect(getByText("Share PDF")).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText("Share PDF"));
    });
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" }),
    );
    await waitFor(() => expect(getByText("Share PDF")).toBeTruthy());
  });

  // Regression: a failed PDF render left an empty preview and a disabled
  // Share button with no explanation.
  it("shows an error when the PDF can't be generated", async () => {
    mockGenerate.mockReset().mockRejectedValueOnce(new Error("print failed"));
    render(<CreditNoteDetail creditNote={creditNote} />);
    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      ),
    );
  });
});
