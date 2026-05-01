import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Search } from "lucide-react-native";
import {
  Button,
  Card,
  CollapsibleCard,
  Chip,
  ConfirmDialog,
  CurrencyInput,
  DateInput,
  EmptyState,
  FAB,
  IconButton,
  Input,
  KPICard,
  ListRow,
  ListRowSkeleton,
  NumberInput,
  Select,
  Sheet,
  Skeleton,
  StatusBadge,
  Stepper,
  Switch,
  useToast,
} from "@/src/components/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-label uppercase tracking-wider text-muted">{title}</Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

export default function ComponentsPreview() {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [text, setText] = useState("");
  const [num, setNum] = useState("");
  const [money, setMoney] = useState("");
  const [date, setDate] = useState("2026-05-01");
  const [select, setSelect] = useState<string | null>("aud");
  const [switchOn, setSwitchOn] = useState(true);
  const [chip, setChip] = useState<"all" | "draft" | "sent">("all");
  const [collapseOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 96 }}
    >
      <View
        className="border-b border-border bg-background px-4 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Text className="text-h1 text-foreground">Components preview</Text>
        <Text className="mt-1 text-caption text-muted">
          Dev-only screen. Verifies every design-system component renders correctly
          in light and dark modes (toggle your OS appearance).
        </Text>
      </View>

      <View className="gap-8 px-4 py-6">
        <Section title="Buttons">
          <View className="flex-row flex-wrap gap-2">
            <Button label="Primary" onPress={() => undefined} />
            <Button label="Secondary" variant="secondary" onPress={() => undefined} />
            <Button label="Ghost" variant="ghost" onPress={() => undefined} />
            <Button label="Danger" variant="danger" onPress={() => undefined} />
          </View>
          <View className="flex-row gap-2">
            <Button label="Disabled" disabled onPress={() => undefined} />
            <Button label="Small" size="sm" onPress={() => undefined} />
            <Button label="Large" size="lg" onPress={() => undefined} />
          </View>
          <View className="flex-row gap-2">
            <IconButton icon={Plus} accessibilityLabel="Add" onPress={() => undefined} />
            <IconButton
              icon={Search}
              accessibilityLabel="Search"
              variant="filled"
              onPress={() => undefined}
            />
          </View>
        </Section>

        <Section title="Inputs">
          <Input
            label="Business name"
            required
            value={text}
            onChangeText={setText}
            placeholder="Acme Pty Ltd"
          />
          <Input label="With error" value="" error="ABN must be 11 digits" onChangeText={() => undefined} />
          <NumberInput label="Quantity" value={num} onChangeText={setNum} placeholder="1" />
          <CurrencyInput label="Unit price" value={money} onChangeText={setMoney} required />
          <DateInput label="Due date" value={date} onChange={setDate} required />
          <Select
            label="Currency"
            required
            value={select}
            onChange={setSelect}
            options={[
              { value: "aud", label: "AUD — Australian dollar" },
              { value: "usd", label: "USD — US dollar" },
              { value: "eur", label: "EUR — Euro" },
            ]}
          />
          <Switch
            label="Receive overdue reminders"
            helperText="Sends a digest at 9 am local time."
            value={switchOn}
            onValueChange={setSwitchOn}
          />
        </Section>

        <Section title="Chips & badges">
          <View className="flex-row flex-wrap gap-2">
            <Chip label="All" selected={chip === "all"} onPress={() => setChip("all")} />
            <Chip
              label="Draft"
              selected={chip === "draft"}
              onPress={() => setChip("draft")}
              status="draft"
            />
            <Chip
              label="Sent"
              selected={chip === "sent"}
              onPress={() => setChip("sent")}
              status="sent"
            />
          </View>
          <View className="flex-row flex-wrap gap-2">
            <StatusBadge status="paid" />
            <StatusBadge status="sent" />
            <StatusBadge status="overdue" />
            <StatusBadge status="partial" />
            <StatusBadge status="draft" />
          </View>
        </Section>

        <Section title="Surfaces">
          <Card>
            <Text className="text-h2 text-foreground">Card</Text>
            <Text className="mt-1 text-body text-muted">
              Subtle 1px shadow in light mode, hairline border in dark.
            </Text>
          </Card>
          <CollapsibleCard
            title="Collapsible card"
            defaultExpanded={collapseOpen}
          >
            <Text className="text-body text-muted">
              Tap header to collapse. Used in the Invoice editor for the
              Client / Items / Payment / Notes sections.
            </Text>
          </CollapsibleCard>
        </Section>

        <Section title="List rows">
          <View className="rounded-card border border-border bg-surface">
            <ListRow
              primary="INV-0042"
              secondary="Acme Pty Ltd"
              trailingAmount="$1,320.00"
              trailingMeta="Due in 3 days"
              status="sent"
            />
            <View className="h-px bg-border" />
            <ListRow
              primary="INV-0040"
              secondary="Lumiere & Co"
              trailingAmount="$2,420.00"
              trailingMeta="8 days overdue"
              status="overdue"
              overdue
            />
            <View className="h-px bg-border" />
            <ListRow
              primary="INV-0036"
              secondary="Hadley & Sons"
              trailingAmount="$3,520.00"
              trailingMeta="Paid 2026-03-22"
              status="paid"
            />
          </View>
          <ListRowSkeleton />
        </Section>

        <Section title="KPI">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <KPICard label="Outstanding" amount="$8,420.00" emphasis="large" />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <KPICard label="Overdue" amount="$2,420.00" tone="overdue" />
            </View>
            <View className="flex-1">
              <KPICard label="Paid this month" amount="$5,260.00" tone="paid" />
            </View>
          </View>
        </Section>

        <Section title="Misc">
          <Stepper steps={["Profile", "Logo", "Payment", "PIN"]} currentIndex={2} />
          <Skeleton width={"100%"} height={20} />
        </Section>

        <Section title="Overlays & toasts">
          <Button label="Open sheet" onPress={() => setSheetOpen(true)} />
          <Button
            label="Confirm dialog"
            variant="danger"
            onPress={() => setConfirmOpen(true)}
          />
          <Button
            label="Toast — success"
            variant="ghost"
            onPress={() =>
              toast.show({
                message: "Saved.",
                variant: "success",
                actionLabel: "Undo",
              })
            }
          />
        </Section>

        <Section title="Empty state">
          <EmptyState
            title="No invoices yet."
            description="Your first invoice is two minutes away."
            ctaLabel="Create your first invoice"
            onCtaPress={() => toast.show({ message: "(stub)" })}
          />
        </Section>
      </View>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sample sheet"
      >
        <Text className="mb-4 text-body text-muted">
          On mobile this slides up from the bottom; on web it&apos;s a centered modal.
        </Text>
        <Button label="Close" onPress={() => setSheetOpen(false)} />
      </Sheet>

      <ConfirmDialog
        visible={confirmOpen}
        title="Delete this draft?"
        description="This action cannot be undone."
        destructive
        confirmLabel="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast.show({ message: "Deleted.", variant: "warning" });
        }}
      />

      <FAB
        accessibilityLabel="Demo FAB"
        onPress={() => toast.show({ message: "FAB tapped." })}
      />
    </ScrollView>
  );
}
