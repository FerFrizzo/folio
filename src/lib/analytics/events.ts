// Typed event catalogue. track() only accepts names and props declared here,
// so a typo or an unexpected (possibly sensitive) prop fails tsc. Keep props to
// enums/booleans/route templates — never amounts, names, emails, or doc IDs.

export type PaywallSource =
  | "onboarding"
  | "invoice_send"
  | "watermark"
  | "dashboard_banner"
  | "settings"
  | "unknown";

export type AuthMethod = "email" | "google" | "apple";

export type ReviewTrigger = "first_paid" | "third_sent";

type NoProps = Record<string, never>;

export type EventProps = {
  screen_viewed: { route: string };
  signed_up: { method: AuthMethod };
  signed_in: { method: AuthMethod };
  onboarding_step_completed: {
    step: "profile" | "logo" | "payment";
    skipped: boolean;
  };
  client_created: NoProps;
  invoice_drafted: NoProps;
  invoice_sent: { channel: "email" | "manual" };
  payment_recorded: { fully_paid: boolean };
  credit_note_created: NoProps;
  paywall_viewed: { source: PaywallSource };
  paywall_dismissed: { source: PaywallSource };
  purchase_completed: { source: PaywallSource; is_trial: boolean; product_id: string };
  purchase_restored: { source: PaywallSource };
  review_prompt_shown: { trigger: ReviewTrigger };
  analytics_opted_out: NoProps;
};

export type AnalyticsEventName = keyof EventProps;
