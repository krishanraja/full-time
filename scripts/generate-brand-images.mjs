// Generates every favicon, app icon and the social card from the canonical
// brand assets in src/assets. Run it by hand after a brand change and commit
// the output; nothing calls it at build time and it spends no model credits.
//
//   node scripts/generate-brand-images.mjs
//
// Why a script and not hand-exported files: until 2026-10-21 favicon-16,
// favicon-32, icon-192, icon-512 and apple-touch-icon were five copies of the
// same 2000x2000 PNG (145 KB each), so a browser tab downloaded 145 KB to draw
// 16 pixels, the manifest declared sizes the files did not have, and iOS
// filled the transparent mark with black on the home screen.
//
// Outputs (all under public/):
// - favicon.svg: the stopwatch arc, pin and eyes from the mark, simplified so
//   it reads at 16px, on a rounded tile of the app's umber ground. The tile is
//   what makes it legible on both light and dark browser chrome: lime on a
//   white tab disappears, lime on umber does not.
// - favicon-16.png, favicon-32.png, favicon.ico (16, 32 and 48 inside).
// - apple-touch-icon.png (180, opaque umber ground, full mark).
// - icon-192.png, icon-512.png: the full transparent mark at true size. The
//   header and Wordmark render /icon-192.png at 28px, so it stays transparent.
// - icon-maskable-512.png: full mark inside the 80% maskable safe zone.
// - podcast-cover.png: the original 2000x2000 mark, byte for byte, for the
//   RSS itunes:image (Apple asks for 1400 to 3000 pixels).
// - og-card.png: the 1200x630 Open Graph and X card, rendered in Chromium
//   with the app's own self-hosted faces. Set CHROME_BIN to override the
//   browser; it defaults to the Playwright Chromium under /opt/pw-browsers.

import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdtempSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const pub = (name) => resolve(root, "public", name);
const MARK = resolve(root, "src/assets/full-time-icon-and-favicon.png");
const WORDMARK = resolve(root, "src/assets/full-time-wordmark-trim.png");

// Brand tokens, from src/styles.css and the mark itself.
const LIME = "#6BFF46"; // sampled from the mark
const PUPIL = "#004746"; // sampled from the mark
const GROUND = "#1c1611"; // --ground
const GROUND_2 = "#15110d"; // --ground-2
const INK = "#f1e9da"; // --ink
const INK_2 = "#b9ac98"; // --ink-2

// The mark's geometry in its own 2000-unit space, measured from the source
// PNG: arc centre (1020, 1004), radius 866, 223 wide, cut flat at y = 1301.
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e1813"/>
      <stop offset="1" stop-color="${GROUND_2}"/>
    </linearGradient>
    <clipPath id="c"><rect x="0" y="0" width="2000" height="1301"/></clipPath>
  </defs>
  <rect width="2000" height="2000" rx="440" fill="url(#g)"/>
  <g transform="translate(107 417) scale(0.88)">
    <path d="M222 1340A866 866 0 1 1 1818 1340" fill="none" stroke="${LIME}" stroke-width="223" clip-path="url(#c)"/>
    <path d="M259 225L621 587" stroke="${GROUND}" stroke-width="66"/>
    <path d="M187 220L676 709" stroke="${LIME}" stroke-width="67"/>
    <rect x="31" y="64" width="180" height="180" fill="${LIME}"/>
    <rect x="652" y="685" width="258" height="258" fill="${LIME}"/>
    <rect x="1154" y="685" width="258" height="258" fill="${LIME}"/>
    <rect x="730" y="772" width="135" height="93" rx="46" fill="${PUPIL}"/>
    <rect x="1207" y="772" width="135" height="93" rx="46" fill="${PUPIL}"/>
  </g>
</svg>
`;

async function onGround(size, markScale) {
  const inner = Math.round(size * markScale);
  const mark = await sharp(MARK).resize(inner, inner).png().toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: GROUND_2 },
  })
    .composite([{ input: mark, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ICO container holding PNG frames (supported by every browser since Vista).
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  const entries = [];
  let offset = 6 + 16 * frames.length;
  for (const { size, data } of frames) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const base = "/opt/pw-browsers";
  if (existsSync(base)) {
    for (const dir of readdirSync(base).filter((d) => /^chromium-\d+$/.test(d))) {
      const candidate = join(base, dir, "chrome-linux", "chrome");
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error("No Chromium found: set CHROME_BIN to render og-card.png");
}

const dataUri = (path, type) => `data:${type};base64,${readFileSync(path).toString("base64")}`;

function ogCardHtml() {
  const serif = resolve(
    root,
    "node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2",
  );
  const sans = resolve(
    root,
    "node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2",
  );
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Instrument Serif";src:url(${dataUri(serif, "font/woff2")}) format("woff2");}
@font-face{font-family:"Schibsted Grotesk";src:url(${dataUri(sans, "font/woff2")}) format("woff2");font-weight:100 900;}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:radial-gradient(ellipse 620px 420px at 250px 330px, color-mix(in oklab, ${LIME} 16%, transparent), transparent 70%),linear-gradient(180deg,#1e1813 0%,${GROUND} 38%,${GROUND_2} 100%);color:${INK};font-family:"Schibsted Grotesk",sans-serif;position:relative}
.mark{position:absolute;left:70px;top:125px;width:380px;height:380px}
.copy{position:absolute;left:510px;top:120px;width:620px}
.word{display:block;width:430px;height:auto}
h1{font-family:"Instrument Serif",serif;font-weight:400;font-size:76px;line-height:1.02;margin:44px 0 0;letter-spacing:-0.5px}
p{font-size:28px;color:${INK_2};margin:22px 0 0;font-weight:500}
.foot{position:absolute;left:510px;bottom:56px;font-size:22px;letter-spacing:3px;text-transform:uppercase;color:${INK_2};font-weight:600}
.foot b{color:${LIME};font-weight:600}
</style></head><body>
<img class="mark" src="${dataUri(MARK, "image/png")}" alt="">
<div class="copy">
<img class="word" src="${dataUri(WORDMARK, "image/png")}" alt="">
<h1>One real match.<br>Six AI Pundits.</h1>
<p>Pick the brain you fancy.</p>
</div>
<div class="foot"><b>&#9679;</b>&nbsp; fulltime.fm</div>
</body></html>`;
}

async function main() {
  const svg = Buffer.from(FAVICON_SVG);
  writeFileSync(pub("favicon.svg"), FAVICON_SVG);

  const raster = (size) =>
    sharp(svg, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  const f16 = await raster(16);
  const f32 = await raster(32);
  const f48 = await raster(48);
  writeFileSync(pub("favicon-16.png"), f16);
  writeFileSync(pub("favicon-32.png"), f32);
  writeFileSync(
    pub("favicon.ico"),
    ico([
      { size: 16, data: f16 },
      { size: 32, data: f32 },
      { size: 48, data: f48 },
    ]),
  );

  // Transparent mark at true size: the header draws /icon-192.png at 28px.
  for (const size of [192, 512]) {
    await sharp(MARK)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(pub(`icon-${size}.png`));
  }
  writeFileSync(pub("apple-touch-icon.png"), await onGround(180, 0.78));
  // Maskable: the safe zone is the centre circle of 80% diameter; the mark is
  // round, so 70% keeps the arc clear of every platform mask.
  writeFileSync(pub("icon-maskable-512.png"), await onGround(512, 0.7));

  if (!existsSync(pub("podcast-cover.png"))) copyFileSync(MARK, pub("podcast-cover.png"));

  const dir = mkdtempSync(join(tmpdir(), "og-card-"));
  const html = join(dir, "card.html");
  const shot = join(dir, "card.png");
  writeFileSync(html, ogCardHtml());
  execFileSync(findChrome(), [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    // Headless Chromium keeps some of the window for itself, so render taller
    // and crop the top 1200x630 exactly.
    "--window-size=1200,900",
    "--virtual-time-budget=3000",
    `--screenshot=${shot}`,
    `file://${html}`,
  ]);
  await sharp(shot)
    .extract({ left: 0, top: 0, width: 1200, height: 630 })
    .png({ compressionLevel: 9 })
    .toFile(pub("og-card.png"));

  for (const name of [
    "favicon.svg",
    "favicon.ico",
    "favicon-16.png",
    "favicon-32.png",
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-512.png",
    "podcast-cover.png",
    "og-card.png",
  ]) {
    const meta =
      name.endsWith(".ico") || name.endsWith(".svg") ? null : await sharp(pub(name)).metadata();
    const bytes = readFileSync(pub(name)).length;
    console.log(
      `${name.padEnd(22)} ${meta ? `${meta.width}x${meta.height}` : "-".padEnd(9)} ${bytes} bytes`,
    );
  }
}

await main();
