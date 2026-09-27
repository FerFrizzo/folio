#!/usr/bin/env node
// Creates (or tops up) the "Folio funnel" dashboard in PostHog with the
// insights that read the analytics events defined in src/lib/analytics/events.ts.
//
// Dry run by default — prints what it would create and touches nothing.
//   node scripts/posthog-dashboard.mjs
// Apply (needs a personal API key with insight:write + dashboard:write):
//   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 \
//     node scripts/posthog-dashboard.mjs --apply
//
// Idempotent: reuses the dashboard if it exists and skips insights whose name
// is already on it. POSTHOG_API_HOST defaults to the EU cloud.

import process from "node:process";

const APPLY = process.argv.includes("--apply");
const HOST = process.env.POSTHOG_API_HOST || "https://eu.posthog.com";
const KEY = process.env.POSTHOG_PERSONAL_API_KEY || "";
const PROJECT = process.env.POSTHOG_PROJECT_ID || "";
const DASHBOARD_NAME = "Folio funnel";

const ev = (event) => ({ kind: "EventsNode", event, name: event, math: "total" });
const funnel = (events, extra = {}) => ({
  kind: "FunnelsQuery",
  series: events.map(ev),
  dateRange: { date_from: "-90d" },
  funnelsFilter: { funnelWindowInterval: 30, funnelWindowIntervalUnit: "day" },
  ...extra,
});
const eventBreakdown = (...props) =>
  props.length === 1
    ? { breakdownFilter: { breakdown: props[0], breakdown_type: "event" } }
    : { breakdownFilter: { breakdowns: props.map((property) => ({ property, type: "event" })) } };
const weeklyBars = (event, ...breakdown) => ({
  kind: "TrendsQuery",
  series: [ev(event)],
  interval: "week",
  dateRange: { date_from: "-90d" },
  trendsFilter: { display: "ActionsBar" },
  ...(breakdown.length ? eventBreakdown(...breakdown) : {}),
});

const INSIGHTS = [
  {
    name: "1. Main funnel: install → paying user",
    description: "Where new users drop off. Application Installed only fires for fresh installs.",
    source: funnel([
      "Application Installed",
      "signed_up",
      "invoice_drafted",
      "invoice_sent",
      "paywall_viewed",
      "purchase_completed",
    ]),
  },
  {
    name: "2. Paywall conversion by entry point",
    description: "paywall_viewed → purchase_completed, split by source.",
    source: funnel(["paywall_viewed", "purchase_completed"], eventBreakdown("source")),
  },
  {
    name: "3. Purchases: trial vs direct",
    description: "Weekly purchase_completed split by is_trial.",
    source: weeklyBars("purchase_completed", "is_trial"),
  },
  {
    name: "4. Onboarding steps completed vs skipped",
    description: "Onboarding opens from the dashboard banner only, so volumes are low.",
    source: weeklyBars("onboarding_step_completed", "step", "skipped"),
  },
  {
    name: "5. Retention: signed up → keeps sending invoices",
    description: "Weekly cohorts of signed_up returning to do invoice_sent.",
    source: {
      kind: "RetentionQuery",
      dateRange: { date_from: "-90d" },
      retentionFilter: {
        period: "Week",
        totalIntervals: 8,
        retentionType: "retention_first_time",
        targetEntity: { id: "signed_up", name: "signed_up", type: "events" },
        returningEntity: { id: "invoice_sent", name: "invoice_sent", type: "events" },
      },
    },
  },
  {
    name: "6. Review prompts shown by trigger",
    description: "Compare with the rating count in App Store Connect.",
    source: weeklyBars("review_prompt_shown", "trigger"),
  },
  {
    name: "7. Screen paths",
    description: "Most common routes through the app (screen_viewed.route).",
    source: {
      kind: "PathsQuery",
      dateRange: { date_from: "-30d" },
      pathsFilter: {
        includeEventTypes: ["hogql"],
        pathsHogQLExpression: "properties.route",
        stepLimit: 5,
      },
    },
  },
  {
    name: "8. Usage-data opt-outs",
    description: "Should stay near zero.",
    source: weeklyBars("analytics_opted_out"),
  },
];

async function api(method, path, body) {
  const res = await fetch(`${HOST}/api/projects/${PROJECT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  if (!APPLY) {
    console.log(`Dry run — would create dashboard "${DASHBOARD_NAME}" on ${HOST} with:`);
    for (const i of INSIGHTS) console.log(`  • ${i.name}  [${i.source.kind}]`);
    console.log("\nRe-run with --apply and POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID set.");
    return;
  }
  if (!KEY || !PROJECT) {
    console.error("Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID to apply.");
    process.exit(1);
  }

  const found = await api("GET", `/dashboards/?search=${encodeURIComponent(DASHBOARD_NAME)}`);
  let dashboard = (found.results ?? []).find((d) => d.name === DASHBOARD_NAME && !d.deleted);
  if (dashboard) {
    console.log(`Reusing dashboard "${DASHBOARD_NAME}" (id ${dashboard.id})`);
  } else {
    dashboard = await api("POST", "/dashboards/", {
      name: DASHBOARD_NAME,
      description: "Folio in-app funnel: install → invoice → paywall → purchase.",
    });
    console.log(`Created dashboard "${DASHBOARD_NAME}" (id ${dashboard.id})`);
  }

  const existing = await api("GET", `/insights/?dashboards=[${dashboard.id}]&limit=100`);
  const existingNames = new Set((existing.results ?? []).map((i) => i.name));

  let failures = 0;
  for (const i of INSIGHTS) {
    if (existingNames.has(i.name)) {
      console.log(`  skip   ${i.name} (already on dashboard)`);
      continue;
    }
    try {
      await api("POST", "/insights/", {
        name: i.name,
        description: i.description,
        query: { kind: "InsightVizNode", source: i.source },
        dashboards: [dashboard.id],
      });
      console.log(`  added  ${i.name}`);
    } catch (err) {
      failures += 1;
      console.error(`  FAILED ${i.name}: ${err.message}`);
    }
  }

  console.log(`\nDone. Open ${HOST}/project/${PROJECT}/dashboard/${dashboard.id}`);
  if (failures) process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
