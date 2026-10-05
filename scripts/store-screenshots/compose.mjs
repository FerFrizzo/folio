// Composes captioned store screenshots from the raw captures.
// Usage: node scripts/store-screenshots/compose.mjs [target...]  (default: every target)
import { Buffer } from "node:buffer";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const { targets, slots, featureGraphic } = JSON.parse(
  readFileSync(new URL("./captions.json", import.meta.url), "utf8"),
);
const RAW_ROOT = "assets/screenshots/raw";
const OUT_ROOT = "assets/screenshots";
const FONT = "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function background(w, h) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1473FF"/><stop offset="1" stop-color="#0B4FC2"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
  </svg>`);
}

function caption(w, s, headline, sub) {
  const lines = headline.split("\n");
  const h = Math.round(520 * s);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    ${lines
      .map(
        (line, i) =>
          `<text x="50%" y="${Math.round((210 + i * 128) * s)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${Math.round(112 * s)}" fill="#fff">${escapeXml(line)}</text>`,
      )
      .join("")}
    <text x="50%" y="${Math.round((lines.length > 1 ? 470 : 340) * s)}" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="${Math.round(54 * s)}" fill="#D6E6FF">${escapeXml(sub)}</text>
  </svg>`);
}

async function framedShot(file, width, radiusRatio) {
  const img = sharp(file).resize({ width });
  const { height } = (await img.toBuffer({ resolveWithObject: true })).info;
  const radius = Math.round(width * radiusRatio);
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></svg>`,
  );
  const shot = await img.composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const border = Math.round(width * 0.025);
  const bezel = Buffer.from(
    `<svg width="${width + border * 2}" height="${height + border * 2}"><rect width="100%" height="100%" rx="${radius + border}" ry="${radius + border}" fill="#0A0F1C"/></svg>`,
  );
  return sharp(bezel).composite([{ input: shot, left: border, top: border }]).png().toBuffer();
}

async function composeTarget(name) {
  const t = targets[name];
  const W = t.width;
  const H = t.height;
  const s = W / 1320;
  const outDir = join(OUT_ROOT, t.out);
  mkdirSync(outDir, { recursive: true });
  const targetSlots = slots.filter((slot) => !t.skip?.includes(slot.raw));
  for (const [i, slot] of targetSlots.entries()) {
    const name = `${String(i + 1).padStart(2, "0")}-${slot.raw.replace(/^raw-\d+-/, "")}.png`;
    if (slot.finished) {
      await sharp(slot.finished.file)
        .extract(slot.finished.crop)
        .resize(W, H, { fit: "cover", kernel: "lanczos3" })
        .png()
        .toFile(join(outDir, name));
      console.log(`wrote ${join(outDir, name)} (finished image)`);
      continue;
    }
    const rawFile = join(RAW_ROOT, t.raw, `${slot.raw}.png`);
    if (!existsSync(rawFile)) {
      console.warn(`skip ${name}/${slot.raw}: no raw capture`);
      continue;
    }
    const phone = await framedShot(rawFile, Math.round(W * t.deviceWidth), t.radius);
    const { width: phoneW } = await sharp(phone).metadata();
    const top = Math.round((slot.headline.includes("\n") ? 600 : 470) * s);
    const file = join(outDir, name);
    await sharp(background(W, H))
      .composite([
        { input: caption(W, s, slot.headline, slot.sub), left: 0, top: 0 },
        { input: phone, left: Math.round((W - phoneW) / 2), top },
      ])
      .flatten({ background: "#0B4FC2" })
      .png()
      .toFile(file);
    console.log(`wrote ${file}`);
  }
}

async function composeFeatureGraphic() {
  const f = featureGraphic;
  const [W, H] = [1024, 500];
  const rawFile = join(RAW_ROOT, f.raw);
  const iconMask = Buffer.from('<svg width="96" height="96"><rect width="96" height="96" rx="22" ry="22"/></svg>');
  const icon = await sharp(f.icon).resize(96, 96).composite([{ input: iconMask, blend: "dest-in" }]).png().toBuffer();
  const framed = await framedShot(rawFile, 300, 0.11);
  const { width: fw } = await sharp(framed).metadata();
  const phone = await sharp(framed).extract({ left: 0, top: 0, width: fw, height: H - 60 }).toBuffer();
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <text x="64" y="232" font-family="${FONT}" font-weight="800" font-size="62" fill="#fff">${escapeXml(f.headline[0])}</text>
    <text x="64" y="302" font-family="${FONT}" font-weight="800" font-size="62" fill="#fff">${escapeXml(f.headline[1])}</text>
    <text x="64" y="362" font-family="${FONT}" font-weight="500" font-size="28" fill="#D6E6FF">${escapeXml(f.sub)}</text>
  </svg>`);
  const file = join(OUT_ROOT, "android", "feature-graphic.png");
  mkdirSync(join(OUT_ROOT, "android"), { recursive: true });
  await sharp(background(W, H))
    .composite([
      { input: icon, left: 64, top: 64 },
      { input: text, left: 0, top: 0 },
      { input: phone, left: W - 300 - 90, top: 60 },
    ])
    .flatten({ background: "#0B4FC2" })
    .png()
    .toFile(file);
  console.log(`wrote ${file}`);
}

const wanted = process.argv.slice(2);
for (const name of wanted.length ? wanted : [...Object.keys(targets), "feature-graphic"]) {
  if (name === "feature-graphic") await composeFeatureGraphic();
  else if (targets[name]) await composeTarget(name);
  else throw new Error(`Unknown target ${name}`);
}
