// The favicon, app icons and social card are committed output of
// scripts/generate-brand-images.mjs. This proves each file is the size its
// declarations claim, which was false for every icon before 2026-10-21.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { SOCIAL_IMAGE } from "./site-url";

const pub = (name: string) => resolve(process.cwd(), "public", name);

describe("brand image files", () => {
  it.each([
    ["favicon-16.png", 16],
    ["favicon-32.png", 32],
    ["apple-touch-icon.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
    ["podcast-cover.png", 2000],
  ])("%s is %ipx square", async (name, size) => {
    const meta = await sharp(pub(name)).metadata();
    expect([meta.width, meta.height]).toEqual([size, size]);
  });

  it("the apple touch icon and maskable icon are opaque", async () => {
    for (const name of ["apple-touch-icon.png", "icon-maskable-512.png"]) {
      expect((await sharp(pub(name)).stats()).isOpaque, name).toBe(true);
    }
  });

  it("the social card is the size the head declares", async () => {
    const meta = await sharp(pub("og-card.png")).metadata();
    expect([meta.width, meta.height]).toEqual([SOCIAL_IMAGE.width, SOCIAL_IMAGE.height]);
  });

  it("favicon.ico holds 16, 32 and 48 pixel frames", () => {
    const ico = readFileSync(pub("favicon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + 16 * i));
    expect(sizes).toEqual([16, 32, 48]);
  });

  it("favicon.svg is an SVG on the brand ground", () => {
    const svg = readFileSync(pub("favicon.svg"), "utf8");
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain("#6BFF46");
  });

  it("the manifest declares only sizes the files have", async () => {
    const manifest = JSON.parse(readFileSync(pub("manifest.webmanifest"), "utf8")) as {
      icons: Array<{ src: string; sizes: string; type: string }>;
    };
    for (const icon of manifest.icons.filter((i) => i.type === "image/png")) {
      const meta = await sharp(pub(icon.src.replace(/^\//, ""))).metadata();
      expect(`${meta.width}x${meta.height}`, icon.src).toBe(icon.sizes);
    }
  });
});
