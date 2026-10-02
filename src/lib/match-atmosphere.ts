import type { ClubInks } from "./club-colours";

/** The matchday atmosphere behind the seal on Today.
 *
 *  Ruling (Krish, 2026-10-02): adopt the premium design. A broadcast-gantry
 *  view of the halfway line: the far touchline sits behind the seal like a
 *  horizon, a thin LED strip split home and away runs along it, mown stripes
 *  fan toward the camera, and each club's floodlight spills in from its own
 *  corner. The winner's light is brighter; its strength follows the goals.
 *  It stays atmosphere: quiet, faded out before the AI Pundits.
 *
 *  Pure: it takes the laid-out size and the seal's position and returns SVG
 *  markup, so the component only has to measure. */

function hash(value: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number) => (Math.round(v * 10) / 10).toString();

export type AtmosphereInput = {
  seed: string;
  homeGoals: number;
  awayGoals: number;
  home: Pick<ClubInks, "glow" | "glowStrength" | "led">;
  away: Pick<ClubInks, "glow" | "glowStrength" | "led">;
  /** The layer's size, and the seal's centre and radius inside it, in px. */
  width: number;
  height: number;
  cx: number;
  cy: number;
  radius: number;
};

export function atmosphere(input: AtmosphereInput): string {
  const { width: W, height: H, cx, cy, radius: R } = input;
  if (!(W > 0 && H > 0 && R > 0)) return "";
  const random = seeded(hash(input.seed));
  const top = Math.max(input.homeGoals, input.awayGoals, 1);
  const hi = (0.15 + (0.85 * input.homeGoals) / top) * input.home.glowStrength;
  const ai = (0.15 + (0.85 * input.awayGoals) / top) * input.away.glowStrength;
  const yFar = cy - R * 0.6;
  const yh = yFar - R * 0.95;
  const fadeFrom = Math.min(1, Math.max(0, (cy + R * 0.35) / H));
  const s: string[] = [];
  s.push("<defs>");
  s.push(
    `<linearGradient id="atmFv" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${n(H)}"><stop offset="0" stop-color="#fff"/><stop offset="${fadeFrom.toFixed(3)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="atmMv"><rect width="${n(W)}" height="${n(H)}" fill="url(#atmFv)"/></mask>`,
  );
  s.push(
    `<linearGradient id="atmFh"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".16" stop-color="#fff"/><stop offset=".84" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="atmMh"><rect width="${n(W)}" height="${n(H)}" fill="url(#atmFh)"/></mask>`,
  );
  const lamp = (id: string, x: number, colour: string, k: number) =>
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(x)}" cy="${n(yFar - R * 1.35)}" r="${n(W * 1.05)}"><stop offset="0" stop-color="${colour}" stop-opacity="${(0.34 * k).toFixed(3)}"/><stop offset=".3" stop-color="${colour}" stop-opacity="${(0.16 * k).toFixed(3)}"/><stop offset=".7" stop-color="${colour}" stop-opacity="${(0.04 * k).toFixed(3)}"/><stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient>`;
  const pool = (id: string, colour: string, k: number) =>
    `<radialGradient id="${id}"><stop offset="0" stop-color="${colour}" stop-opacity="${(0.2 * k).toFixed(3)}"/><stop offset=".6" stop-color="${colour}" stop-opacity="${(0.07 * k).toFixed(3)}"/><stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient>`;
  s.push(
    lamp("atmLH", -W * 0.1, input.home.glow, hi),
    lamp("atmLA", W * 1.1, input.away.glow, ai),
    pool("atmPH", input.home.glow, hi),
    pool("atmPA", input.away.glow, ai),
  );
  s.push(
    `<filter id="atmBlur" x="-5%" y="-400%" width="110%" height="900%"><feGaussianBlur stdDeviation="${n(R * 0.045)}"/></filter>`,
  );
  s.push(`</defs><g mask="url(#atmMv)">`);
  // Floodlight spill from the two roof corners, then a pool of each club's
  // light on its own half.
  s.push(
    `<g style="mix-blend-mode:screen"><rect width="${n(W)}" height="${n(H)}" fill="url(#atmLH)"/><rect width="${n(W)}" height="${n(H)}" fill="url(#atmLA)"/>`,
  );
  s.push(
    `<ellipse cx="${n(cx - R * 1.15)}" cy="${n(cy + R * 0.05)}" rx="${n(R * 1.45)}" ry="${n(R * 0.8)}" fill="url(#atmPH)"/><ellipse cx="${n(cx + R * 1.15)}" cy="${n(cy + R * 0.05)}" rx="${n(R * 1.45)}" ry="${n(R * 0.8)}" fill="url(#atmPA)"/></g>`,
  );
  // Mown stripes, in perspective from the gantry; the seed picks how many.
  const N = 18 + 2 * Math.floor(random() * 3);
  const sw = 105 / N;
  const k = (R * 0.34) / (sw * (yFar - yh));
  const stripes: string[] = [];
  for (let i = 0; i < N; i += 2) {
    const u0 = i * sw - 52.5;
    const u1 = u0 + sw;
    stripes.push(
      `<path d="M${n(cx + u0 * k * (yFar - yh))} ${n(yFar)}L${n(cx + u1 * k * (yFar - yh))} ${n(yFar)}L${n(cx + u1 * k * (H - yh))} ${n(H)}L${n(cx + u0 * k * (H - yh))} ${n(H)}Z"/>`,
    );
  }
  s.push(`<g fill="#F1E9DA" opacity=".03">${stripes.join("")}</g>`);
  s.push(
    `<g mask="url(#atmMh)"><path d="M0 ${n(yFar)}H${n(W)}" stroke="#F1E9DA" stroke-opacity=".2" stroke-width="1"/></g>`,
  );
  // The LED boards along the far touchline, one strip per club meeting at
  // halfway, at about half strength: light off the stand roof, not a data bar.
  const bh = Math.max(2.4, R * 0.03);
  const yb = yFar - 2.5 - bh;
  const homeBoard = `<rect x="0" y="${n(yb)}" width="${n(cx)}" height="${n(bh)}" fill="${input.home.led}"/>`;
  const awayBoard = `<rect x="${n(cx)}" y="${n(yb)}" width="${n(W - cx)}" height="${n(bh)}" fill="${input.away.led}"/>`;
  s.push(
    `<g mask="url(#atmMh)"><g filter="url(#atmBlur)" style="mix-blend-mode:screen"><g opacity="${(0.3 * hi).toFixed(2)}">${homeBoard}</g><g opacity="${(0.3 * ai).toFixed(2)}">${awayBoard}</g></g>`,
  );
  s.push(
    `<g opacity="${(0.2 + 0.22 * hi).toFixed(2)}">${homeBoard}</g><g opacity="${(0.2 + 0.22 * ai).toFixed(2)}">${awayBoard}</g></g>`,
  );
  s.push("</g>");
  return s.join("");
}
