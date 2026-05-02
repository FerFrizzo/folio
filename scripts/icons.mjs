#!/usr/bin/env node
// Asset pipeline. Reads assets/source/icon.png (1024×1024 PNG); if missing,
// generates a placeholder "F" mark in the brand accent. Produces every icon
// variant + the splash-icon at the paths that app.config.ts already points to.
//
// Run via `npm run icons`. Idempotent — re-running with a new source PNG
// overwrites all derivatives.

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "assets", "source", "icon.png");
const outDir = path.join(repoRoot, "assets", "images");

const ACCENT = "#0B3D5C";
const FOREGROUND = "#FAFAF7";

// 1024×1024 placeholder: solid navy with a centered serif "F" via SVG.
function placeholderSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <rect width="1024" height="1024" fill="${ACCENT}" />
      <text x="50%" y="50%" text-anchor="middle"
            font-family="Georgia, 'Source Serif 4', serif"
            font-size="640" font-weight="700"
            fill="${FOREGROUND}" dy="0.34em">F</text>
    </svg>`;
}

// 432×432 adaptive-icon foreground: smaller "F" inside the safe area
// (~66% of the 1024 source maps to ~432 with adaptive icon padding).
function adaptiveForegroundSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="432" height="432">
      <text x="50%" y="50%" text-anchor="middle"
            font-family="Georgia, 'Source Serif 4', serif"
            font-size="280" font-weight="700"
            fill="${FOREGROUND}" dy="0.34em">F</text>
    </svg>`;
}

function adaptiveBackgroundSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="432" height="432">
      <rect width="432" height="432" fill="${ACCENT}" />
    </svg>`;
}

function adaptiveMonochromeSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="432" height="432">
      <text x="50%" y="50%" text-anchor="middle"
            font-family="Georgia, 'Source Serif 4', serif"
            font-size="280" font-weight="700"
            fill="#FFFFFF" dy="0.34em">F</text>
    </svg>`;
}

function splashSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <text x="50%" y="50%" text-anchor="middle"
            font-family="Georgia, 'Source Serif 4', serif"
            font-size="140" font-weight="700"
            fill="${ACCENT}" dy="0.34em">F</text>
    </svg>`;
}

async function ensureSource() {
  try {
    await fs.access(sourcePath);
    return false; // user-provided source exists
  } catch {
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await sharp(Buffer.from(placeholderSvg())).png().toFile(sourcePath);
    return true; // generated placeholder
  }
}

async function generateAll() {
  const generatedPlaceholder = await ensureSource();
  await fs.mkdir(outDir, { recursive: true });

  const source = sharp(sourcePath);

  // Primary 1024×1024 icon (iOS + generic).
  await source
    .clone()
    .resize(1024, 1024, { fit: "cover" })
    .png()
    .toFile(path.join(outDir, "icon.png"));

  // Adaptive icon — Android. Three layers per Material design.
  await sharp(Buffer.from(adaptiveForegroundSvg()))
    .png()
    .toFile(path.join(outDir, "android-icon-foreground.png"));
  await sharp(Buffer.from(adaptiveBackgroundSvg()))
    .png()
    .toFile(path.join(outDir, "android-icon-background.png"));
  await sharp(Buffer.from(adaptiveMonochromeSvg()))
    .png()
    .toFile(path.join(outDir, "android-icon-monochrome.png"));

  // Legacy square adaptive (some Expo configs still reference this name).
  await sharp(Buffer.from(adaptiveForegroundSvg()))
    .png()
    .toFile(path.join(outDir, "adaptive-icon.png"));

  // Web favicon — small, padded.
  await source
    .clone()
    .resize(64, 64, { fit: "cover" })
    .png()
    .toFile(path.join(outDir, "favicon.png"));

  // Splash icon: navy "F" on transparent background.
  await sharp(Buffer.from(splashSvg()))
    .png()
    .toFile(path.join(outDir, "splash-icon.png"));

  console.log(
    `${generatedPlaceholder ? "[placeholder source generated] " : ""}` +
      `icons written to ${path.relative(repoRoot, outDir)}/`,
  );
}

generateAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
