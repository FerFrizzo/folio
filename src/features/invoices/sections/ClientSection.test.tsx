import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ClientSection } from "@/src/features/invoices/sections/ClientSection";
import type { Client, ClientSnapshot } from "@/src/types/schemas";

// Client list + create-client mutation and the toast are the component's
// only external dependencies; stub them so we can assert behaviour directly.
const mockClients: Client[] = [];
const mockMutateAsync = jest.fn();
const mockToastShow = jest.fn();

jest.mock("@/src/features/clients/queries", () => ({
  useClients: () => ({ data: mockClients }),
  useCreateClient: () => ({ mutateAsync: mockMutateAsync }),
}));
jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => ({ show: mockToastShow }),
}));

function renderSection(overrides: { clientId?: string | null; snapshot?: ClientSnapshot } = {}) {
  const onChange = jest.fn();
  const utils = render(
    <ClientSection
      clientId={overrides.clientId ?? null}
      snapshot={overrides.snapshot ?? { name: "" }}
      onChange={onChange}
    />,
  );
  return { onChange, ...utils };
}

function openCreateClientForm(utils: ReturnType<typeof renderSection>) {
  fireEvent.press(utils.getByLabelText("Pick a client"));
  fireEvent.press(utils.getByLabelText("Add a new client"));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ClientSection create-new-client flow", () => {
  it("shows an inline error and does not call the mutation when name is blank", () => {
    const utils = renderSection();
    openCreateClientForm(utils);

    fireEvent.press(utils.getByText("Add client"));

    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error", message: "Client name is required." }),
    );
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("shows an inline error and does not call the mutation when name is only whitespace", () => {
    const utils = renderSection();
    openCreateClientForm(utils);

    fireEvent.changeText(utils.getByLabelText("Client name"), "   ");
    fireEvent.press(utils.getByText("Add client"));

    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error", message: "Client name is required." }),
    );
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("creates the client and selects it on success", async () => {
    const created: Client = {
      id: "c1",
      name: "Acme Pty Ltd",
      email: "billing@acme.com.au",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    mockMutateAsync.mockResolvedValueOnce(created);
    const utils = renderSection();
    openCreateClientForm(utils);

    fireEvent.changeText(utils.getByLabelText("Client name"), "Acme Pty Ltd");
    fireEvent.changeText(utils.getByLabelText("Client email"), "billing@acme.com.au");
    fireEvent.press(utils.getByText("Add client"));

    await waitFor(() => {
      expect(utils.onChange).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ name: "Acme Pty Ltd", email: "billing@acme.com.au" }),
      );
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: "Acme Pty Ltd",
      email: "billing@acme.com.au",
    });
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  // Regression: previously the mutation's rejection (e.g. an invalid email
  // failing Zod validation, or a Firestore write failing) was never caught,
  // so the "Add client" button silently did nothing.
  it("shows an error toast instead of silently failing when the mutation rejects", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Invalid email"));
    const utils = renderSection();
    openCreateClientForm(utils);

    fireEvent.changeText(utils.getByLabelText("Client name"), "Acme Pty Ltd");
    fireEvent.changeText(utils.getByLabelText("Client email"), "not-an-email");
    fireEvent.press(utils.getByText("Add client"));

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error", message: "Invalid email" }),
      );
    });
    expect(utils.onChange).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the rejection has no message", async () => {
    mockMutateAsync.mockRejectedValueOnce("network down");
    const utils = renderSection();
    openCreateClientForm(utils);

    fireEvent.changeText(utils.getByLabelText("Client name"), "Acme Pty Ltd");
    fireEvent.press(utils.getByText("Add client"));

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error", message: "Couldn't add client." }),
      );
    });
  });
});
