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

const ACCENT = "#1473FF";

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

function adaptiveBackgroundSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="432" height="432">
      <rect width="432" height="432" fill="${ACCENT}" />
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
  // Foreground: source icon scaled to ~66% of canvas (safe zone), centred on
  // transparent 432×432. Background is solid accent. Monochrome is greyscale.
  const ADAPTIVE_SIZE = 432;
  const SAFE_SIZE = Math.round(ADAPTIVE_SIZE * 0.66); // ~285px
  const offset = Math.round((ADAPTIVE_SIZE - SAFE_SIZE) / 2);

  const scaledFg = await source
    .clone()
    .resize(SAFE_SIZE, SAFE_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const transparentBase = await sharp({
    create: { width: ADAPTIVE_SIZE, height: ADAPTIVE_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).png().toBuffer();

  const foreground = await sharp(transparentBase)
    .composite([{ input: scaledFg, top: offset, left: offset }])
    .png()
    .toBuffer();

  await sharp(foreground).toFile(path.join(outDir, "android-icon-foreground.png"));
  await sharp(Buffer.from(adaptiveBackgroundSvg()))
    .png()
    .toFile(path.join(outDir, "android-icon-background.png"));
  await sharp(foreground)
    .greyscale()
    .toFile(path.join(outDir, "android-icon-monochrome.png"));

  // Legacy square adaptive (some Expo configs still reference this name).
  await sharp(foreground).toFile(path.join(outDir, "adaptive-icon.png"));

  // Web favicon — small, padded.
  await source
    .clone()
    .resize(64, 64, { fit: "cover" })
    .png()
    .toFile(path.join(outDir, "favicon.png"));

  // Splash icon: source icon scaled to 200×200.
  await source
    .clone()
    .resize(200, 200, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
