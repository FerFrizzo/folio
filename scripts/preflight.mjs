#!/usr/bin/env node
// Pre-flight: run every quality gate before cutting an EAS build / submit.
// Bails on the first failure so the next failure isn't masked by upstream
// fallout. Print one final ✓ summary if everything passes.

import { execSync } from "node:child_process";
import process from "node:process";

const steps = [
  { name: "icons", cmd: "node scripts/icons.mjs" },
  { name: "tsc",   cmd: "npx tsc --noEmit" },
  { name: "lint",  cmd: "npm run lint" },
  { name: "test",  cmd: "npm test --silent" },
  { name: "expo-doctor", cmd: "npx expo-doctor" },
  { name: "functions:build", cmd: "npm --prefix functions run build" },
  { name: "functions:test",  cmd: "npm --prefix functions test --silent" },
];

const failures = [];

for (const step of steps) {
  process.stdout.write(`▶ ${step.name}…  `);
  try {
    execSync(step.cmd, { stdio: ["ignore", "ignore", "pipe"] });
    process.stdout.write("ok\n");
  } catch (err) {
    process.stdout.write("FAILED\n");
    const stderr = err.stderr ? err.stderr.toString() : "";
    const stdout = err.stdout ? err.stdout.toString() : "";
    console.error(stderr || stdout || err.message);
    failures.push(step.name);
    break; // bail on first failure
  }
}

console.log();
if (failures.length === 0) {
  console.log("✓ pre-flight clean — ready to ship.");
  process.exit(0);
} else {
  console.error(`✗ pre-flight failed at: ${failures.join(", ")}`);
  process.exit(1);
}
