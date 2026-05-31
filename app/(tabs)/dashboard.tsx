import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format, parseISO } from "date-fns";
import { Card } from "@/src/components/ui/Card";
import { Chip } from "@/src/components/ui/Chip";
import { KPICard } from "@/src/components/ui/KPICard";
import { ListRow } from "@/src/components/ui/ListRow";
import { ListRowSkeleton } from "@/src/components/ui/Skeleton";
import { OnboardingBanner } from "@/src/features/dashboard/OnboardingBanner";
import { SubscriptionBanner } from "@/src/features/dashboard/SubscriptionBanner";
import {
  periodLabel,
  periodRange,
  type PeriodKey,
} from "@/src/features/dashboard/period";
import { useInvoices } from "@/src/features/invoices/queries";
import { useProfile } from "@/src/features/settings/queries";
import { useOnboardingStore } from "@/src/features/onboarding/store";
import { deriveDisplayStatus } from "@/src/lib/invoice-status";
import { formatMoney } from "@/src/lib/money";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "fy", label: "This FY" },
  { key: "all", label: "All" },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const profile = useProfile();
  const invoicesQuery = useInvoices();
  const hydrate = useOnboardingStore((s) => s.hydrate);
  const [period, setPeriod] = useState<PeriodKey>("month");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const all = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  // `today` is fixed for the lifetime of this render — memoising prevents
  // dependent useMemos from re-running every render.
  const today = useMemo(() => new Date(), []);
  const range = useMemo(() => periodRange(period, today), [period, today]);

  const stats = useMemo(() => {
    let outstandingCents = 0;
    let overdueCents = 0;
    let paidThisPeriodCents = 0;
    for (const inv of all) {
      if (inv.deletedAt) continue;
      const display = deriveDisplayStatus(inv, today);
      const balance = inv.totalCents - inv.amountPaidCents;
      if (display === "sent" || display === "partial" || display === "overdue") {
        outstandingCents += balance;
      }
      if (display === "overdue") overdueCents += balance;
      if (
        inv.paidAt &&
        new Date(inv.paidAt) >= range.start &&
        new Date(inv.paidAt) <= range.end
      ) {
        paidThisPeriodCents += inv.totalCents;
      }
    }
    return { outstandingCents, overdueCents, paidThisPeriodCents };
  }, [all, range, today]);

  const needsAttention = useMemo(() => {
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return all
      .filter((inv) => !inv.deletedAt)
      .filter((inv) => {
        const display = deriveDisplayStatus(inv, today);
        if (display === "overdue") return true;
        if (display === "sent" || display === "partial") {
          const due = new Date(inv.dueDate);
          return due <= sevenDaysFromNow;
        }
        return false;
      })
      .slice(0, 5);
  }, [all, today]);

  const recent = useMemo(
    () =>
      all
        .filter((inv) => !inv.deletedAt)
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 5),
    [all],
  );

  const greeting = profile.data?.businessName || "Welcome to Folio";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 48,
        gap: 16,
      }}
      refreshControl={
        !isWeb ? (
          <RefreshControl
            refreshing={invoicesQuery.isFetching && !invoicesQuery.isLoading}
            onRefresh={() => void invoicesQuery.refetch()}
          />
        ) : undefined
      }
    >
      <View className="flex-row items-start justify-between gap-3 px-4">
        <View className="flex-1">
          <Text className="text-display font-bold text-foreground">{greeting}</Text>
          <Text className="mt-1 text-caption text-muted">
            {periodLabel(period, today)}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {PERIODS.map((p) => (
          <Chip
            key={p.key}
            label={p.label}
            selected={period === p.key}
            onPress={() => setPeriod(p.key)}
          />
        ))}
      </ScrollView>

      <OnboardingBanner />
      <SubscriptionBanner />

      <View className="gap-3 px-4">
        <KPICard
          label="Outstanding"
          amount={formatMoney(stats.outstandingCents, "AUD")}
          emphasis="large"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <KPICard
              label="Overdue"
              amount={formatMoney(stats.overdueCents, "AUD")}
              tone={stats.overdueCents > 0 ? "overdue" : undefined}
            />
          </View>
          <View className="flex-1">
            <KPICard
              label="Paid this period"
              amount={formatMoney(stats.paidThisPeriodCents, "AUD")}
              tone={stats.paidThisPeriodCents > 0 ? "paid" : undefined}
            />
          </View>
        </View>
      </View>

      <View className="gap-3 px-4">
        <Text className="text-h2 text-foreground">Recent activity</Text>
        {invoicesQuery.isLoading ? (
          <View><ListRowSkeleton /><ListRowSkeleton /><ListRowSkeleton /></View>
        ) : recent.length === 0 ? (
          <Card>
            <Text className="text-body text-muted">No invoices yet.</Text>
          </Card>
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface">
            {recent.map((inv, idx) => (
              <View key={inv.id}>
                <ListRow
                  primary={inv.number || "Draft"}
                  secondary={inv.clientSnapshot.name}
                  trailingAmount={formatMoney(inv.totalCents, inv.currency)}
                  status={deriveDisplayStatus(inv, today)}
                  onPress={() => router.push(`/invoices/${inv.id}`)}
                />
                {idx < recent.length - 1 ? (
                  <View className="h-px bg-border" />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="gap-3 px-4">
        <Text className="text-h2 text-foreground">Needs attention</Text>
        {invoicesQuery.isLoading ? (
          <View><ListRowSkeleton /><ListRowSkeleton /></View>
        ) : needsAttention.length === 0 ? (
          <Card>
            <Text className="text-body text-muted">Nothing urgent.</Text>
          </Card>
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface">
            {needsAttention.map((inv, idx) => {
              const display = deriveDisplayStatus(inv, today);
              return (
                <View key={inv.id}>
                  <ListRow
                    primary={inv.number || "Draft"}
                    secondary={inv.clientSnapshot.name}
                    trailingAmount={formatMoney(inv.totalCents, inv.currency)}
                    trailingMeta={`Due ${format(parseISO(inv.dueDate), "d MMM yyyy")}`}
                    status={display}
                    overdue={display === "overdue"}
                    onPress={() => router.push(`/invoices/${inv.id}`)}
                  />
                  {idx < needsAttention.length - 1 ? (
                    <View className="h-px bg-border" />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
