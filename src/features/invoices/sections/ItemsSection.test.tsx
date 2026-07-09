import { render, fireEvent } from "@testing-library/react-native";
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
const mockToastShow = jest.fn();
jest.mock("@/src/features/settings/libraryQueries", () => ({
  useLineItemLibrary: () => ({ data: [] }),
  useCreateLibraryEntry: () => ({ mutateAsync: mockMutateAsync }),
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

function renderSection(items: LineItemInput[]) {
  const onChange = jest.fn();
  const utils = render(
    <ItemsSection
      items={items}
      onChange={onChange}
      currency="AUD"
      exportMode={false}
      defaultGstRate={0.1}
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
