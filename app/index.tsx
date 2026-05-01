import { Redirect } from "expo-router";

// Phase 1 POC lands on Invoices. Phase 2 will switch this to /dashboard.
export default function Index() {
  return <Redirect href="/invoices" />;
}
