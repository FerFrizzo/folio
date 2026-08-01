import { render, fireEvent, act } from "@testing-library/react-native";
import { LineItemLibraryCard } from "@/src/features/settings/LineItemLibraryCard";

// Query/mutation hooks and the toast are the card's only external dependencies;
// stub them so failures and loading states can be driven directly. Names carry
// the `mock` prefix because babel-plugin-jest-hoist hoists the factories above
// these declarations and rejects any other out-of-scope identifier.
const mockCreateMutateAsync = jest.fn(async () => {});
const mockDeleteMutateAsync = jest.fn(async () => {});
const mockToastShow = jest.fn();
const mockLibraryEntries = [
  {
    id: "e1",
    description: "Hour of design work",
    defaultQty: 1,
    unitPriceCents: 12000,
    gstRate: 0.1,
  },
];
// Mutable so a test can put settings into the still-loading state.
const mockSettings: {
  data: { defaultGstRate: number } | undefined;
  isLoading: boolean;
} = { data: { defaultGstRate: 0.1 }, isLoading: false };

jest.mock("@/src/features/settings/libraryQueries", () => ({
  useLineItemLibrary: () => ({ data: mockLibraryEntries }),
  useCreateLibraryEntry: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useDeleteLibraryEntry: () => ({ mutateAsync: mockDeleteMutateAsync }),
}));
jest.mock("@/src/features/settings/queries", () => ({
  useSettings: () => mockSettings,
}));
jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => ({ show: mockToastShow }),
}));

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockSettings.data = { defaultGstRate: 0.1 };
  mockSettings.isLoading = false;
  mockCreateMutateAsync.mockResolvedValue(undefined);
  mockDeleteMutateAsync.mockResolvedValue(undefined);
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

function openAddForm(utils: ReturnType<typeof render>) {
  fireEvent.press(utils.getByLabelText("Add a library entry"));
  fireEvent.changeText(
    utils.getByPlaceholderText("e.g. Hour of design work"),
    "Consulting",
  );
}

async function confirmDelete(utils: ReturnType<typeof render>) {
  fireEvent.press(utils.getByLabelText("Remove Hour of design work"));
  await act(async () => {
    fireEvent.press(utils.getByLabelText("Remove"));
  });
}

describe("LineItemLibraryCard delete", () => {
  it("removes the entry and confirms it when the delete succeeds", async () => {
    const utils = render(<LineItemLibraryCard />);
    await confirmDelete(utils);
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith("e1");
    expect(mockToastShow).toHaveBeenCalledWith({
      message: "Removed.",
      variant: "info",
    });
  });

  // Regression: performDelete used to have no catch, so a rejected delete was
  // an unhandled promise rejection with the ConfirmDialog already dismissed —
  // the entry stayed on screen and the user was told nothing.
  it("tells the user when the delete fails", async () => {
    mockDeleteMutateAsync.mockRejectedValue(new Error("offline"));
    const utils = render(<LineItemLibraryCard />);
    await confirmDelete(utils);
    expect(mockToastShow).toHaveBeenCalledWith({
      message: "offline",
      variant: "error",
    });
  });

  it("falls back to a generic message when the failure isn't an Error", async () => {
    mockDeleteMutateAsync.mockRejectedValue("nope");
    const utils = render(<LineItemLibraryCard />);
    await confirmDelete(utils);
    expect(mockToastShow).toHaveBeenCalledWith({
      message: "Couldn't remove.",
      variant: "error",
    });
  });

  it("logs the failure so it's diagnosable", async () => {
    mockDeleteMutateAsync.mockRejectedValue(new Error("offline"));
    const utils = render(<LineItemLibraryCard />);
    await confirmDelete(utils);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not delete anything when the dialog is cancelled", () => {
    const utils = render(<LineItemLibraryCard />);
    fireEvent.press(utils.getByLabelText("Remove Hour of design work"));
    fireEvent.press(utils.getByLabelText("Cancel"));
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });
});

describe("LineItemLibraryCard add", () => {
  // add() falls back to gstRate 0 until settings resolve, which would silently
  // save a GST-free entry for a user who is registered for GST.
  //
  // Asserted via accessibilityState rather than by pressing: `Button` gates the
  // tap internally with `onPress={disabled ? undefined : onPress}`, but its host
  // View carries no onPress prop, so fireEvent.press walks up and invokes the
  // `onPress` passed *to* Button — bypassing the gate. A real tap is unaffected
  // (a Pressable with onPress={undefined} fires nothing); only the test tool
  // sees through it, so pressing here would assert nothing true.
  it("blocks Add while settings are still loading", () => {
    mockSettings.isLoading = true;
    mockSettings.data = undefined;
    const utils = render(<LineItemLibraryCard />);
    openAddForm(utils);
    const addButton = utils.getByLabelText("Loading…");
    expect(addButton.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("re-enables Add once settings resolve", () => {
    const utils = render(<LineItemLibraryCard />);
    openAddForm(utils);
    const addButton = utils.getByLabelText("Add");
    expect(addButton.props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("saves with the user's GST default once settings have loaded", async () => {
    const utils = render(<LineItemLibraryCard />);
    openAddForm(utils);
    await act(async () => {
      fireEvent.press(utils.getByLabelText("Add"));
    });
    expect(mockCreateMutateAsync).toHaveBeenCalledWith({
      description: "Consulting",
      defaultQty: 1,
      unitPriceCents: 0,
      gstRate: 0.1,
    });
  });

  it("saves a GST-free entry when the user's default is 0", async () => {
    mockSettings.data = { defaultGstRate: 0 };
    const utils = render(<LineItemLibraryCard />);
    openAddForm(utils);
    await act(async () => {
      fireEvent.press(utils.getByLabelText("Add"));
    });
    expect(mockCreateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ gstRate: 0 }),
    );
  });

  it("warns instead of saving when the description is blank", () => {
    const utils = render(<LineItemLibraryCard />);
    fireEvent.press(utils.getByLabelText("Add a library entry"));
    fireEvent.press(utils.getByLabelText("Add"));
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" }),
    );
  });

  it("tells the user when the save fails", async () => {
    mockCreateMutateAsync.mockRejectedValue(new Error("quota exceeded"));
    const utils = render(<LineItemLibraryCard />);
    openAddForm(utils);
    await act(async () => {
      fireEvent.press(utils.getByLabelText("Add"));
    });
    expect(mockToastShow).toHaveBeenCalledWith({
      message: "quota exceeded",
      variant: "error",
    });
  });
});
