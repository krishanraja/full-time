import sharp from "sharp";
import { getPunditSpec } from "./specs";
import type { PunditId } from "./types";

const ACCENTS: Record<PunditId, string> = {
  zen: "#8AE66E",
  gaffer: "#F3B95F",
  stats: "#68C7FF",
  romantic: "#FF8FB8",
  doomer: "#B7A2FF",
  banter: "#FF7657",
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function lines(value: string, maxCharacters: number, maxLines: number) {
  const words = value.trim().split(/\s+/);
  const output: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharacters) {
      current = next;
      continue;
    }
    if (current) output.push(current);
    current = word;
    if (output.length === maxLines - 1) break;
  }
  if (current && output.length < maxLines) output.push(current);
  const consumed = output.join(" ").length;
  if (consumed < value.trim().length && output.length) {
    output[output.length - 1] = `${output[output.length - 1].replace(/[.,;:!?]$/, "")}...`;
  }
  return output;
}

export async function renderPunditShareCard(input: {
  punditId: PunditId;
  title: string;
  portableLine: string;
  coverageDate: string;
}) {
  const spec = getPunditSpec(input.punditId);
  const accent = ACCENTS[input.punditId];
  const titleLines = lines(input.title, 32, 2);
  const quoteLines = lines(input.portableLine, 58, 3);
  const titleTspans = titleLines
    .map((line, index) => `<tspan x="76" dy="${index === 0 ? 0 : 70}">${escapeXml(line)}</tspan>`)
    .join("");
  const quoteTspans = quoteLines
    .map((line, index) => `<tspan x="76" dy="${index === 0 ? 0 : 48}">${escapeXml(line)}</tspan>`)
    .join("");
  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#0B0D0F"/>
      <rect x="32" y="32" width="1136" height="566" rx="28" fill="#121619" stroke="#263036" stroke-width="2"/>
      <rect x="76" y="72" width="124" height="8" rx="4" fill="${accent}"/>
      <text x="76" y="128" fill="#D7DEE2" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="3">FULL TIME</text>
      <text x="76" y="224" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="62" font-weight="800">${titleTspans}</text>
      <text x="76" y="390" fill="#C8D0D4" font-family="Arial, sans-serif" font-size="34" font-weight="500">${quoteTspans}</text>
      <text x="76" y="550" fill="${accent}" font-family="Arial, sans-serif" font-size="27" font-weight="700">${escapeXml(spec.name)}</text>
      <text x="1124" y="550" text-anchor="end" fill="#87939A" font-family="Arial, sans-serif" font-size="24">${escapeXml(input.coverageDate)}</text>
    </svg>`;

  return new Uint8Array(
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer(),
  );
}
