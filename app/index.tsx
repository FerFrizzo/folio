import { Redirect } from "expo-router";

// Land on the Dashboard. The OnboardingBanner there links into /onboarding
// when steps remain incomplete.
export default function Index() {
  return <Redirect href="/dashboard" />;
}
