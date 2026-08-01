import { render, fireEvent, act } from "@testing-library/react-native";
import { useWindowDimensions } from "react-native";
import { ItemsSection, type LineItemInput } from "@/src/features/invoices/sections/ItemsSection";

// Control the tablet-vs-phone breakpoint (ItemsSection treats width >= 768 as
// wide). react-native's index re-exports this module, so mocking the path
// replaces what the public `useWindowDimensions` export resolves to.
jest.mock("react-native/Libraries/Utilities/useWindowDimensions");
const mockUseWindowDimensions = useWindowDimensions as unknown as jest.Mock;

// Library query + mutation hooks and the toast are the component's only
// external dependencies; stub them so we can assert behaviour directly.
const mockMutateAsync = jest.fn(async () => {});
const mockDeleteMutateAsync = jest.fn(async () => {});
const mockToastShow = jest.fn();
const mockLibraryEntries = [
  { id: "e1", description: "Hour of design work", defaultQty: 1, unitPriceCents: 12000, gstRate: 0.1 },
  { id: "e2", description: "Callout fee", defaultQty: 1, unitPriceCents: 8000, gstRate: 0 },
];
jest.mock("@/src/features/settings/libraryQueries", () => ({
  useLineItemLibrary: () => ({ data: mockLibraryEntries }),
  useCreateLibraryEntry: () => ({ mutateAsync: mockMutateAsync }),
  useDeleteLibraryEntry: () => ({ mutateAsync: mockDeleteMutateAsync }),
}));
jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => ({ show: mockToastShow }),
}));

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 1000, scale: 2, fontScale: 1 });
}

const baseItem: LineItemInput = {
  description: "Consulting",
  qty: "2",
  unitPriceText: "150.00",
  gstRate: 0.1,
};

function renderSection(
  items: LineItemInput[],
  overrides: { defaultGstRate?: number; exportMode?: boolean } = {},
) {
  const onChange = jest.fn();
  const utils = render(
    <ItemsSection
      items={items}
      onChange={onChange}
      currency="AUD"
      exportMode={overrides.exportMode ?? false}
      defaultGstRate={overrides.defaultGstRate ?? 0.1}
      computedLineTotalsCents={items.map(() => 0)}
    />,
  );
  return { onChange, ...utils };
}

beforeEach(() => {
  jest.clearAllMocks();
  setWidth(375); // phone by default
});

describe("ItemsSection save-to-library affordance", () => {
  // Regression: the button must be present on tablet-width layouts, not only
  // buried inside the per-line Tax options.
  it("renders a Save-to-library button per line on tablet widths", () => {
    setWidth(1024);
    const { getAllByLabelText } = renderSection([baseItem, { ...baseItem, description: "Design" }]);
    expect(getAllByLabelText("Save line to library")).toHaveLength(2);
  });

  it("renders a Save-to-library button per line on phone widths", () => {
    setWidth(375);
    const { getAllByLabelText } = renderSection([baseItem]);
    expect(getAllByLabelText("Save line to library")).toHaveLength(1);
  });

  it("is reachable without expanding Tax options (button visible on initial render)", () => {
    setWidth(1024);
    const { queryByLabelText } = renderSection([baseItem]);
    // Tax options are collapsed on first render; the save button must still exist.
    expect(queryByLabelText("Save line to library")).not.toBeNull();
  });

  it("saves the line to the library with the mapped fields when tapped", () => {
    const { getByLabelText } = renderSection([baseItem]);
    fireEvent.press(getByLabelText("Save line to library"));
    expect(mockMutateAsync).toHaveBeenCalledWith({
      description: "Consulting",
      defaultQty: 2,
      unitPriceCents: 15000,
      gstRate: 0.1,
    });
  });

  it("blocks saving a line with no description and warns the user", () => {
    const { getByLabelText } = renderSection([{ ...baseItem, description: "   " }]);
    fireEvent.press(getByLabelText("Save line to library"));
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" }),
    );
  });

  it("confirms a successful save with a toast", async () => {
    const { getByLabelText } = renderSection([baseItem]);
    await fireEvent.press(getByLabelText("Save line to library"));
    // Flush the mutateAsync microtask before asserting the success toast.
    await Promise.resolve();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "success" }),
    );
  });
});

describe("ItemsSection GST default on added lines", () => {
  it("adds a GST-free line when the user's default is 0", () => {
    const { getByLabelText, onChange } = renderSection([baseItem], { defaultGstRate: 0 });
    fireEvent.press(getByLabelText("Add line item"));
    expect(onChange).toHaveBeenCalledWith([
      baseItem,
      { description: "", qty: "1", unitPriceText: "", gstRate: 0 },
    ]);
  });

  it("adds a 10% line when the user has opted into GST", () => {
    const { getByLabelText, onChange } = renderSection([baseItem], { defaultGstRate: 0.1 });
    fireEvent.press(getByLabelText("Add line item"));
    expect(onChange).toHaveBeenCalledWith([
      baseItem,
      { description: "", qty: "1", unitPriceText: "", gstRate: 0.1 },
    ]);
  });

  // Non-AUD invoices are GST-free exports; the setting must not override that.
  it("forces GST-free in export mode even when the default is 10%", () => {
    const { getByLabelText, onChange } = renderSection([baseItem], {
      defaultGstRate: 0.1,
      exportMode: true,
    });
    fireEvent.press(getByLabelText("Add line item"));
    expect(onChange).toHaveBeenCalledWith([
      baseItem,
      { description: "", qty: "1", unitPriceText: "", gstRate: 0 },
    ]);
  });
});

describe("ItemsSection library sheet deletion", () => {
  function openSheet(utils: ReturnType<typeof renderSection>) {
    fireEvent.press(utils.getByLabelText("Insert from library"));
    return utils;
  }

  it("shows a remove affordance for every saved entry", () => {
    const utils = openSheet(renderSection([baseItem]));
    expect(utils.getByLabelText("Remove Hour of design work")).toBeTruthy();
    expect(utils.getByLabelText("Remove Callout fee")).toBeTruthy();
  });

  // A stray tap on the trash must not destroy a saved line outright.
  it("asks for confirmation instead of deleting immediately", () => {
    const utils = openSheet(renderSection([baseItem]));
    fireEvent.press(utils.getByLabelText("Remove Hour of design work"));
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    expect(utils.getByLabelText("Confirm remove Hour of design work")).toBeTruthy();
  });

  it("deletes the entry by id once confirmed", async () => {
    const utils = openSheet(renderSection([baseItem]));
    fireEvent.press(utils.getByLabelText("Remove Hour of design work"));
    await act(async () => {
      fireEvent.press(utils.getByLabelText("Confirm remove Hour of design work"));
    });
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith("e1");
  });

  it("restores the row and deletes nothing when cancelled", () => {
    const utils = openSheet(renderSection([baseItem]));
    fireEvent.press(utils.getByLabelText("Remove Hour of design work"));
    fireEvent.press(utils.getByLabelText("Cancel remove Hour of design work"));
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    expect(utils.getByLabelText("Remove Hour of design work")).toBeTruthy();
  });

  // Confirming one row must not arm the other.
  it("only puts the tapped row into confirm state", () => {
    const utils = openSheet(renderSection([baseItem]));
    fireEvent.press(utils.getByLabelText("Remove Hour of design work"));
    expect(utils.queryByLabelText("Confirm remove Callout fee")).toBeNull();
    expect(utils.getByLabelText("Remove Callout fee")).toBeTruthy();
  });

  // Regression: adding the trash must not break the row's insert action.
  it("still inserts the entry when the row body is tapped", () => {
    const utils = openSheet(renderSection([baseItem]));
    fireEvent.press(utils.getByLabelText("Hour of design work"));
    expect(utils.onChange).toHaveBeenCalledWith([
      baseItem,
      { description: "Hour of design work", qty: "1", unitPriceText: "120.00", gstRate: 0.1 },
    ]);
  });
});
