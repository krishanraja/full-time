import type { ClubInks } from "./club-colours";

/** The match seal: the engraved ring around the score on Today.
 *
 *  Ruling (Krish, 2026-10-02): adopt the premium design. A guilloche weave,
 *  like a watch dial or a banknote, in the home club's ink on the left half
 *  and the away club's on the right, around a 90-minute track whose marks
 *  echo the stopwatch in the Full Time mark: full time at the top, half time
 *  at the bottom, so the halfway line runs through both.
 *
 *  The weave is set by the match: more goals make it finer, the drop id sets
 *  its rhythm and rotation, the winner's half prints at full strength.
 *  Deterministic, so the same match always draws the same seal. */

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

const CREAM = "#F1E9DA";
const STRANDS = 22;
const RADIUS = 82;
const A1 = 4.6;
const A2 = 3.6;
/** Points per strand. Enough for a smooth weave at phone size without a
 *  heavy document: the weave is drawn in the browser, not sent as HTML. */
const STEPS = 420;

function ring(radius: (t: number) => number, steps: number) {
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const r = radius(t);
    d += `${i ? "L" : "M"}${(100 + r * Math.sin(t)).toFixed(1)} ${(100 - r * Math.cos(t)).toFixed(1)}`;
  }
  return `${d}Z`;
}

export type SealSide = Pick<ClubInks, "weave" | "weaveWidth" | "thread" | "rim">;

export type SealInput = {
  seed: string;
  homeGoals: number;
  awayGoals: number;
  home: SealSide;
  away: SealSide;
};

export function sealId(seed: string) {
  return `seal${hash(seed) % 999983}`;
}

/** The plate the seal is engraved on. It keeps any atmosphere out of the
 *  numerals. Cheap, so it renders on the server with the track and the seal
 *  never flashes in empty. */
export function sealPlate(seed: string): string {
  const uid = sealId(seed);
  return `<defs><radialGradient id="${uid}B"><stop offset="0" stop-color="#110D0A" stop-opacity=".93"/><stop offset=".66" stop-color="#140F0C" stop-opacity=".9"/><stop offset=".93" stop-color="#16110D" stop-opacity=".82"/><stop offset="1" stop-color="#16110D" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="100" r="107" fill="url(#${uid}B)"/>`;
}

/** The 90-minute track: 90 at the top, 45 at the bottom. */
export function sealTrack(): string {
  let h = `<g stroke="${CREAM}" stroke-linecap="round">`;
  for (let i = 1; i < 90; i += 1) {
    const a = (i / 90) * Math.PI * 2;
    const major = i % 15 === 0;
    const length = major ? 5.5 : i % 5 === 0 ? 3.4 : 1.8;
    const r1 = 99.2;
    const r2 = r1 - length;
    h += `<line x1="${(100 + r1 * Math.sin(a)).toFixed(2)}" y1="${(100 - r1 * Math.cos(a)).toFixed(2)}" x2="${(100 + r2 * Math.sin(a)).toFixed(2)}" y2="${(100 - r2 * Math.cos(a)).toFixed(2)}" stroke-width="${major ? 0.7 : 0.4}" opacity="${major ? 0.7 : 0.38}"/>`;
  }
  return `${h}<line x1="100" y1="0.8" x2="100" y2="8.6" stroke-width="1.5" opacity=".95"/><line x1="100" y1="191.4" x2="100" y2="199.2" stroke-width=".9" opacity=".6"/></g>`;
}

/** The two-ink weave, drawn once and shown on each half through a mask. */
export function sealWeave(input: SealInput): string {
  const seed = hash(input.seed);
  const random = seeded(seed);
  const uid = sealId(input.seed);
  const total = input.homeGoals + input.awayGoals;
  const k = 12 + 2 * Math.min(total, 14);
  const nodes = 2 + (seed % 3);
  const rotation = random() * Math.PI * 2;
  let main = "";
  let thread = "";
  for (let j = 0; j < STRANDS; j += 1) {
    const phase = (j * 2 * Math.PI) / STRANDS;
    const d = `<path d="${ring(
      (t) =>
        RADIUS +
        A1 * Math.sin(k * t + phase + rotation) +
        A2 * Math.sin((k + nodes) * t + 2 * phase),
      STEPS,
    )}"/>`;
    if (j % 4 === 2) thread += d;
    else main += d;
  }
  const homeWins = input.homeGoals > input.awayGoals;
  const awayWins = input.awayGoals > input.homeGoals;
  const homeOpacity = homeWins ? 1 : awayWins ? 0.8 : 0.9;
  const awayOpacity = awayWins ? 1 : homeWins ? 0.8 : 0.9;
  const inner = RADIUS - A1 - A2 - 3;
  const outer = RADIUS + A1 + A2 + 3;
  // The clubs' inks cross-fade over a few degrees at twelve and six o'clock,
  // so no strand is cut.
  const fade = (id: string, a: string, b: string) =>
    `<linearGradient id="${uid}${id}g" gradientUnits="userSpaceOnUse" x1="95" y1="0" x2="105" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><mask id="${uid}${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="220" height="220"><rect x="-10" y="-10" width="220" height="220" fill="url(#${uid}${id}g)"/></mask>`;
  let h = `<defs>${fade("L", "#fff", "#000")}${fade("R", "#000", "#fff")}<g id="${uid}M">${main}</g><g id="${uid}T">${thread}</g></defs>`;
  // A real second colour runs as the rim rules of its half; thin interleaved
  // strands of claret and sky blue mix optically into pink.
  const rims = (side: SealSide) =>
    side.rim
      ? `<circle cx="100" cy="100" r="${inner}" stroke="${side.rim}" stroke-width=".8" opacity=".85"/><circle cx="100" cy="100" r="${outer}" stroke="${side.rim}" stroke-width=".8" opacity=".85"/>`
      : `<circle cx="100" cy="100" r="${inner}" stroke="${CREAM}" stroke-width=".55" opacity=".55"/><circle cx="100" cy="100" r="${outer}" stroke="${CREAM}" stroke-width=".55" opacity=".5"/>`;
  const half = (id: string, side: SealSide, opacity: number) =>
    `<g mask="url(#${uid}${id})"><g opacity="${opacity}"><use href="#${uid}M" stroke="${side.weave}" stroke-width="${side.weaveWidth}"/>${
      side.thread
        ? `<use href="#${uid}T" stroke="${side.thread}" stroke-width=".34" opacity=".4"/>`
        : `<use href="#${uid}T" stroke="${side.weave}" stroke-width="${side.weaveWidth}"/>`
    }</g>${rims(side)}</g>`;
  h += `<g fill="none">${half("L", input.home, homeOpacity)}${half("R", input.away, awayOpacity)}</g>`;
  h += `<g fill="none" stroke="${CREAM}"><circle cx="100" cy="100" r="${inner - 1.8}" stroke-width=".25" opacity=".32"/><circle cx="100" cy="100" r="${outer + 1.8}" stroke-width=".25" opacity=".35"/></g>`;
  return h;
}
