import { contrast, deltaE, fromOklch, isNeutral, lift, oklch } from "./colour";
import type { PunditId } from "./pundit/types";

/** AI Pundit cover art, one cover per pundit per match.
 *
 *  Ruling (Krish, 2026-10-02): adopt the premium design. The six AI Pundits
 *  were the same small line icon in six rounded squares; each now prints a
 *  cover like a two-ink screenprint on its own paper: The Reporter's
 *  newsprint column, The Gaffer's tactics board, The Numbers Guy's bar
 *  stack, The Romantic's ribbon under a floodlit moon, The Doomer's falling
 *  line, The Wind-Up's clashing waves. Every goal is printed into the cover
 *  in the scoring club's colour.
 *
 *  Deterministic: the seed is the pundit plus the match, so the same show
 *  always prints the same cover and a new match prints a new one. The inputs
 *  are data the product already holds, so it costs nothing per match. This
 *  is procedural generation in product code (docs/00-product.md), never a
 *  request-time image model. Output is SVG markup built only from numbers
 *  and the fixed colours below, never from text a person supplied. */

export const COVER_WIDTH = 100;
export const COVER_HEIGHT = 118;

const CREAM = "#F1E9DA";

/** Each AI Pundit's paper. */
export const PUNDIT_HUES: Record<PunditId, string> = {
  zen: "#3F607C",
  gaffer: "#4E6B3C",
  stats: "#2E6463",
  romantic: "#9B6269",
  doomer: "#4F4868",
  banter: "#A3542E",
};

type Side = { goals: number; ink: string };
type Paper = { g: string; k: string; d: string; l: string };
type Random = () => number;

function hash(value: string) {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    const c = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return h2 >>> 0;
}

function seeded(seed: string): Random {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;
const rect = (x: number, y: number, w: number, h: number, fill: string, opacity?: number | null) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(0, w))}" height="${f(Math.max(0, h))}" fill="${fill}"${opacity != null ? ` opacity="${opacity}"` : ""}/>`;
const path = (d: string, stroke: string, width: number, opacity?: number | null, extra = "") =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"${opacity != null ? ` opacity="${opacity}"` : ""}${extra}/>`;

type Point = [number, number];

function smooth(points: Point[]) {
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const polyline = (points: Point[]) =>
  points.map((p, i) => `${i ? "L" : "M"}${f(p[0])} ${f(p[1])}`).join("");

function arrowHead(tip: Point, from: Point, length: number, spread: number) {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  return `M${f(tip[0] - length * Math.cos(a - spread))} ${f(tip[1] - length * Math.sin(a - spread))}L${f(tip[0])} ${f(tip[1])}L${f(tip[0] - length * Math.cos(a + spread))} ${f(tip[1] - length * Math.sin(a + spread))}`;
}

function sample(random: Random, n: number, k: number) {
  const index = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [index[i], index[j]] = [index[j], index[i]];
  }
  return index.slice(0, Math.min(k, n));
}

/** A club's colour as it prints on this paper: its true primary when it
 *  separates, then its primary lifted (hue and chroma kept), then its
 *  secondary, then cream. */
export function accentFor(colours: readonly [string, string], paper: string): string {
  const [primary, secondary] = colours;
  const candidates: string[] = [];
  if (!isNeutral(primary)) candidates.push(primary, lift(primary, 0.5, 0.84));
  if (!isNeutral(secondary)) candidates.push(secondary, lift(secondary, 0.5, 0.84));
  for (const c of candidates) {
    if (contrast(c, paper) >= 1.9 || (deltaE(c, paper) >= 0.2 && contrast(c, paper) >= 1.3)) {
      return c;
    }
  }
  return CREAM;
}

function paperInks(hue: string): Paper {
  const [L, C, H] = oklch(hue);
  return {
    g: hue,
    k: CREAM,
    d: fromOklch(Math.max(0.16, L - 0.17), C * 0.9, H),
    l: fromOklch(Math.min(0.9, L + 0.1), C * 0.8, H),
  };
}

/** The Reporter: a newsprint column, the goals marked up in each club's ink. */
function reporter(R: Random, P: Paper, home: Side, away: Side) {
  const o: string[] = [];
  const m = 11;
  const cw = 36;
  const gap = 6;
  const pitch = 5.1;
  const lh = 1.45;
  o.push(rect(m, 10, 78, 2.4, P.k), rect(m, 14.2, 78, 0.7, P.k));
  let y = 19;
  [0.94, 0.5 + R() * 0.22].forEach((w) => {
    o.push(rect(m, y, 78 * w, 6.6, P.k));
    y += 9.4;
  });
  y += 2.2;
  const top = y;
  const bottom = 110;
  const xs = [m, m + cw + gap];
  // A halftone photograph in the away column: a lit ball over the pitch.
  const ph = { x: xs[1], y: top, w: cw, h: 25 + R() * 6 };
  const bx = ph.x + ph.w * (0.35 + R() * 0.3);
  const by = ph.y + ph.h * (0.42 + R() * 0.16);
  const br = ph.h * 0.36;
  const dp = 2.35;
  const dots: string[] = [];
  for (let yy = ph.y + dp / 2; yy < ph.y + ph.h; yy += dp) {
    for (let xx = ph.x + dp / 2; xx < ph.x + ph.w; xx += dp) {
      const dx = xx - bx;
      const dy = yy - by;
      const dd = Math.hypot(dx, dy) / br;
      const v =
        dd < 1
          ? 0.25 + 0.7 * Math.max(0, 1 - Math.hypot(dx + br * 0.35, dy + br * 0.35) / (br * 1.5))
          : 0.06 + 0.42 * ((yy - ph.y) / ph.h) ** 1.4;
      const r = dp * 0.52 * Math.sqrt(Math.min(1, v));
      if (r > 0.18) dots.push(`<circle cx="${f(xx)}" cy="${f(yy)}" r="${f(r)}"/>`);
    }
  }
  o.push(`<g fill="${P.k}" opacity=".9">${dots.join("")}</g>`);
  const lines: Array<Array<[number, number, number]>> = [[], []];
  [top, ph.y + ph.h + pitch * 0.9].forEach((y0, c) => {
    let yy = y0;
    while (yy < bottom) {
      const n = 2 + Math.floor(R() * 4);
      for (let k = 0; k < n && yy < bottom; k += 1) {
        lines[c].push([xs[c], yy, k === n - 1 ? cw * (0.3 + R() * 0.5) : cw * (0.92 + R() * 0.08)]);
        yy += pitch;
      }
      yy += pitch * 0.7;
    }
  });
  o.push(rect(m + cw + gap / 2 - 0.3, top, 0.6, bottom - top, P.k, 0.35));
  // One marked-up line per goal: home goals in the home column, away goals in the away column.
  const marked = new Map<[number, number, number], string>();
  sample(R, lines[0].length, home.goals).forEach((i) => marked.set(lines[0][i], home.ink));
  sample(R, lines[1].length, away.goals).forEach((i) => marked.set(lines[1][i], away.ink));
  lines
    .flat()
    .forEach((L) =>
      o.push(
        marked.has(L)
          ? rect(L[0], L[1] - 0.55, L[2], lh + 1.1, marked.get(L)!, 0.8)
          : rect(L[0], L[1], L[2], lh, P.k, 0.86),
      ),
    );
  const angle = -(1.6 + R() * 1.8);
  return `<g transform="rotate(${f(angle)} 50 59) translate(0 -1)">${o.join("")}</g>`;
}

/** The Gaffer: a chalk tactics board, runs and Xs and Os. */
function gaffer(R: Random, P: Paper, home: Side, away: Side) {
  const o: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    if (i % 2) o.push(rect(i * (COVER_WIDTH / 7), 0, COVER_WIDTH / 7, COVER_HEIGHT, P.d, 0.28));
  }
  const c = P.k;
  const cop = 0.34;
  const sw = 0.9;
  o.push(
    path("M20 0V31H80V0", c, sw, cop),
    path("M36 0V11H64V0", c, sw, cop),
    path("M38.6 31A13 13 0 0 0 61.4 31", c, sw, cop),
  );
  o.push(
    `<circle cx="50" cy="113" r="18" fill="none" stroke="${c}" stroke-width="${sw}" opacity="${cop}"/>`,
    path("M0 113H100", c, sw, cop),
  );
  for (let a = 0; a < 3; a += 1) {
    const s: Point = [14 + R() * 72, 50 + R() * 50];
    const e: Point = [14 + R() * 72, 14 + R() * 40];
    const mx = (s[0] + e[0]) / 2;
    const my = (s[1] + e[1]) / 2;
    const k = (R() - 0.5) * 0.8;
    const c1: Point = [mx - (e[1] - s[1]) * k, my + (e[0] - s[0]) * k];
    o.push(
      path(
        `M${f(s[0])} ${f(s[1])}Q${f(c1[0])} ${f(c1[1])} ${f(e[0])} ${f(e[1])}`,
        c,
        1,
        0.5,
        ' stroke-dasharray="2.4 2.6"',
      ),
    );
    o.push(path(arrowHead(e, c1, 4, 0.5), c, 1, 0.5));
  }
  // Tokens: one O per home goal, one X per away goal, in each club's ink.
  const placed: Point[] = [];
  const tr = 3.4;
  const place = (): Point => {
    for (let t = 0; t < 80; t += 1) {
      const p: Point = [15 + R() * 70, 18 + R() * 80];
      if (placed.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 12)) {
        placed.push(p);
        return p;
      }
    }
    const p: Point = [15 + R() * 70, 18 + R() * 80];
    placed.push(p);
    return p;
  };
  for (let i = 0; i < home.goals; i += 1) {
    const p = place();
    o.push(
      `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${tr}" fill="none" stroke="${home.ink}" stroke-width="2"/>`,
    );
  }
  for (let i = 0; i < away.goals; i += 1) {
    const p = place();
    o.push(
      path(
        `M${f(p[0] - tr)} ${f(p[1] - tr)}L${f(p[0] + tr)} ${f(p[1] + tr)}M${f(p[0] + tr)} ${f(p[1] - tr)}L${f(p[0] - tr)} ${f(p[1] + tr)}`,
        away.ink,
        2,
      ),
    );
  }
  // The decisive run, in the same gesture as The Gaffer's mark.
  const j = () => (R() - 0.5) * 6;
  const p0: Point = [22 + j(), 94 + j()];
  const q1: Point = [27 + j(), 58 + j()];
  const q2: Point = [50 + j(), 40 + j()];
  const p3: Point = [79, 34 + j() * 0.5];
  const run = `M${f(p0[0])} ${f(p0[1])}C${f(q1[0])} ${f(q1[1])} ${f(q2[0])} ${f(q2[1])} ${f(p3[0])} ${f(p3[1])}`;
  o.push(
    `<g transform="translate(1.1 1.3)">${path(run, P.d, 4.4, 0.9)}${path(arrowHead(p3, q2, 11, 0.6), P.d, 4.4, 0.9)}</g>`,
  );
  o.push(path(run, P.k, 4.4), path(arrowHead(p3, q2, 11, 0.6), P.k, 4.4));
  return o.join("");
}

/** The Numbers Guy: a unit bar stack, the top cells unverified. */
function numbers(R: Random, P: Paper, home: Side, away: Side) {
  const o: string[] = [];
  const grid: string[] = [];
  for (let i = 0; i <= 16; i += 1) {
    grid.push(`<path d="M${f(i * 6.25)} 0V${COVER_HEIGHT}" opacity="${i % 4 ? 0.12 : 0.24}"/>`);
  }
  for (let i = 0; i <= 19; i += 1) {
    grid.push(`<path d="M0 ${f(i * 6.25)}H${COVER_WIDTH}" opacity="${i % 4 ? 0.12 : 0.24}"/>`);
  }
  o.push(`<g stroke="${P.k}" stroke-width=".45" fill="none">${grid.join("")}</g>`);
  const base = 100;
  const cell = 6.2;
  const cg = 1.3;
  const bw = 2 * cell + cg;
  const bgap = 5.5;
  const x0 = (COVER_WIDTH - (4 * bw + 3 * bgap)) / 2;
  const shape = [16, 30, 22, 41].map((v) =>
    Math.max(0.25, Math.min(1, (v + (R() - 0.5) * 9) / 41)),
  );
  const cells: Array<{ x: number; y: number; top: boolean; side: "h" | "a" }> = [];
  shape.forEach((hf, i) => {
    const rows = Math.max(3, Math.round(hf * 10));
    const unsure = 1 + (R() < 0.4 ? 1 : 0);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < 2; c += 1) {
        cells.push({
          x: x0 + i * (bw + bgap) + c * (cell + cg),
          y: base - 1.5 - (r + 1) * (cell + cg),
          top: r >= rows - unsure,
          side: i < 2 ? "h" : "a",
        });
      }
    }
  });
  // Goal cells: home goals in the two left bars, away goals in the two right bars.
  const highlighted = new Map<(typeof cells)[number], string>();
  const solidHome = cells.filter((c) => !c.top && c.side === "h");
  const solidAway = cells.filter((c) => !c.top && c.side === "a");
  sample(R, solidHome.length, home.goals).forEach((i) => highlighted.set(solidHome[i], home.ink));
  sample(R, solidAway.length, away.goals).forEach((i) => highlighted.set(solidAway[i], away.ink));
  cells.forEach((c) => {
    if (c.top) o.push(rect(c.x, c.y, cell, cell, P.k, 0.15));
    else {
      const ink = highlighted.get(c);
      o.push(rect(c.x, c.y, cell, cell, ink ?? P.k, ink ? null : 0.92));
    }
  });
  o.push(rect(9, base, 82, 1.2, P.k));
  for (let t = 0; t <= 10; t += 1) {
    o.push(rect(9 + t * 8.2 - 0.3, base + 2.2, 0.6, t % 5 ? 2 : 3.6, P.k, 0.7));
  }
  return o.join("");
}

/** The Romantic: a silk ribbon of strands under a floodlit moon. */
function romantic(R: Random, P: Paper, home: Side, away: Side) {
  const o: string[] = [];
  const K = 6;
  const N = 17;
  const mx = 62 + (R() - 0.5) * 16;
  const my = 34 + (R() - 0.5) * 10;
  o.push(
    `<circle cx="${f(mx)}" cy="${f(my)}" r="23" fill="${P.l}" opacity=".5"/>`,
    `<circle cx="${f(mx)}" cy="${f(my)}" r="29.5" fill="none" stroke="${P.k}" stroke-width=".7" opacity=".3"/>`,
  );
  const base: number[] = [];
  const twist: number[] = [];
  const phase = R() * Math.PI;
  const step = 0.8 + R() * 0.4;
  for (let k = 0; k < K; k += 1) {
    base.push(66 + Math.sin(k * 1.15 + R() * 0.8) * 15 + (R() - 0.5) * 10);
    twist.push(phase + k * step);
  }
  const strands: string[] = [];
  for (let i = 0; i < N; i += 1) {
    const offset = (i / (N - 1) - 0.5) * 50;
    strands.push(
      smooth(base.map((b, k) => [-8 + (116 * k) / (K - 1), b + offset * Math.cos(twist[k])])),
    );
  }
  const highlighted = new Map<number, string>();
  sample(R, N, home.goals + away.goals).forEach((s, i) =>
    highlighted.set(s, i < home.goals ? home.ink : away.ink),
  );
  strands.forEach((d, i) => {
    if (!highlighted.has(i))
      o.push(path(d, P.k, 0.75, f(0.26 + 0.55 * Math.abs(Math.sin(i * 0.41 + phase)))));
  });
  strands.forEach((d, i) => {
    if (highlighted.has(i)) o.push(path(d, highlighted.get(i)!, 1.5));
  });
  const j = () => (R() - 0.5) * 5;
  const wave = `M14 ${f(70 + j())}C25 ${f(36 + j())} 45 ${f(36 + j())} 55 ${f(62 + j())}S80 ${f(88 + j())} 86 ${f(48 + j())}`;
  o.push(
    `<g transform="translate(1.1 1.3)">${path(wave, P.d, 4.2, 0.9)}</g>`,
    path(wave, P.k, 4.2),
  );
  return o.join("");
}

/** The Doomer: a few calm contour lines in one tone, and the arrow that falls through them. */
function doomer(R: Random, P: Paper) {
  const o: string[] = [];
  const N = 5;
  const line = "#8A86A8";
  for (let i = 0; i < N; i += 1) {
    const y0 = 20 + (84 * i) / (N - 1) + (R() - 0.5) * 6;
    const sag = 4 + R() * 7;
    const phase = R() * 6.28;
    const points: Point[] = [];
    for (let s = 0; s <= 8; s += 1) {
      const t = s / 8;
      points.push([-6 + 112 * t, y0 + sag * t * t + 2.2 * Math.sin(phase + t * 5.2)]);
    }
    o.push(path(smooth(points), line, 1.5, 0.3));
  }
  const j = () => (R() - 0.5) * 6;
  const points: Point[] = [
    [20, 32 + j()],
    [38 + j(), 47 + j()],
    [53 + j(), 38 + j()],
    [78, 74],
  ];
  const fall = polyline(points);
  const head = arrowHead(points[3], points[2], 11, 0.6);
  o.push(
    `<g transform="translate(1.1 1.3)">${path(fall, P.d, 4.4, 0.9)}${path(head, P.d, 4.4, 0.9)}</g>`,
    path(fall, P.k, 4.4),
    path(head, P.k, 4.4),
  );
  return o.join("");
}

/** The Wind-Up: two families of tonal waves that cross and argue, under one cream mark. */
function windup(R: Random, P: Paper) {
  const o: string[] = [];
  const N = 7;
  const lambda = 58 + R() * 26;
  const A = 9;
  const d0 = 0.45 + R() * 0.2;
  const phase = R() * 6.28;
  const tones = ["#6B3A22", "#A86A45"];
  for (let fi = 0; fi < 2; fi += 1) {
    for (let i = 0; i < N; i += 1) {
      const yc = 10 + (98 * i) / (N - 1);
      const sign = fi ? -1 : 1;
      const points: Point[] = [];
      for (let s = 0; s <= 16; s += 1) {
        const x = -5 + (110 * s) / 16;
        points.push([x, yc + sign * A * Math.sin((6.283 * x) / lambda + phase + sign * i * d0)]);
      }
      o.push(path(smooth(points), tones[fi], 1.1, fi ? 0.5 : 0.45));
    }
  }
  const a = "M16 66C31 34 58 94 85 50";
  const b = "M20 40C33 68 60 16 82 46";
  o.push(
    `<g transform="translate(1.1 1.3)">${path(a, P.d, 4.4, 0.9)}${path(b, P.d, 4.4, 0.9)}</g>`,
  );
  o.push(path(b, P.k, 4.2), path(a, P.g, 8.4), path(a, P.k, 4.2));
  return o.join("");
}

const GENERATORS: Record<PunditId, (R: Random, P: Paper, home: Side, away: Side) => string> = {
  zen: reporter,
  gaffer,
  stats: numbers,
  romantic,
  doomer: (R, P) => doomer(R, P),
  banter: (R, P) => windup(R, P),
};

export type CoverMatch = {
  /** The drop id: the same match always prints the same covers. */
  seed: string;
  homeGoals: number;
  awayGoals: number;
  homeColours: readonly [string, string];
  awayColours: readonly [string, string];
};

/** Inner SVG markup for one AI Pundit's cover for one match, in a
 *  COVER_WIDTH x COVER_HEIGHT frame. */
export function coverArt(punditId: PunditId, match: CoverMatch): string {
  const paper = paperInks(PUNDIT_HUES[punditId]);
  const home = {
    goals: Math.max(0, Math.min(12, match.homeGoals)),
    ink: accentFor(match.homeColours, paper.g),
  };
  const away = {
    goals: Math.max(0, Math.min(12, match.awayGoals)),
    ink: accentFor(match.awayColours, paper.g),
  };
  const random = seeded(`${punditId}|${match.seed}`);
  return (
    `<rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="${paper.g}"/>` +
    GENERATORS[punditId](random, paper, home, away)
  );
}
