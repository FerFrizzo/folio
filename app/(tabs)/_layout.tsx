import { Tabs, Slot, Link, usePathname } from "expo-router";
import { Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react-native";

const NAV_ITEMS: {
  href: "/dashboard" | "/invoices" | "/clients" | "/settings";
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function WebSidebarLayout({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  return (
    <View style={{ flex: 1, flexDirection: "row" }} className="bg-background">
      <View
        style={{ width: collapsed ? 64 : 240 }}
        className="border-r border-border bg-surface px-3 py-4"
      >
        <Text
          className="mb-6 text-h2 text-foreground"
          style={{ paddingLeft: collapsed ? 0 : 8, textAlign: collapsed ? "center" : "left" }}
        >
          {collapsed ? "F" : "Folio"}
        </Text>
        <View className="gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={label}
                  className={
                    active
                      ? "flex-row items-center gap-3 rounded-button bg-background px-3 py-2"
                      : "flex-row items-center gap-3 rounded-button px-3 py-2 active:bg-background"
                  }
                  style={collapsed ? { justifyContent: "center" } : undefined}
                >
                  <Icon size={18} color={active ? "#1473FF" : "#4B5563"} />
                  {collapsed ? null : (
                    <Text
                      className={
                        active
                          ? "text-body font-semibold text-accent"
                          : "text-body text-foreground"
                      }
                    >
                      {label}
                    </Text>
                  )}
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}

function MobileTabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1473FF",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E5E0",
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          height: 56 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const name = href.replace("/", ""); // /invoices -> invoices
        return (
          <Tabs.Screen
            key={href}
            name={name}
            options={{
              title: label,
              tabBarIcon: ({ color, size }) => <Icon size={size} color={color} />,
            }}
          />
        );
      })}
    </Tabs>
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const usesSidebar =
    width >= 768 &&
    (Platform.OS === "web" || (Platform as { isPad?: boolean }).isPad === true);

  if (usesSidebar) {
    return <WebSidebarLayout collapsed={width < 1024} />;
  }
  return <MobileTabsLayout />;
}
