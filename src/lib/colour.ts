/** OKLCH colour helpers for the club inks.
 *
 *  Club colours have to glow and print on a dark umber ground. Lightening
 *  them in HSL, or mixing them with cream, turns Villa's claret pink and
 *  Spurs' navy periwinkle, and fans notice. These keep a colour's hue and
 *  chroma and move only its lightness, reducing chroma only as far as the
 *  sRGB gamut forces it. Pure and deterministic, so the same club always
 *  prints the same ink on the server and in the browser. */

type Rgb = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
}

export function rgbToHex(rgb: readonly number[]): string {
  return `#${rgb
    .map((c) =>
      Math.round(Math.max(0, Math.min(1, c)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

export function oklab(hex: string): Rgb {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** [lightness, chroma, hue in radians]. */
export function oklch(hex: string): Rgb {
  const [L, a, b] = oklab(hex);
  return [L, Math.hypot(a, b), Math.atan2(b, a)];
}

function linearFromOklch(L: number, C: number, H: number): Rgb {
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function fromOklch(L: number, C: number, H: number): string {
  let chroma = C;
  let linear = linearFromOklch(L, chroma, H);
  while (chroma > 0 && linear.some((v) => v < -0.0001 || v > 1.0001)) {
    chroma -= 0.002;
    linear = linearFromOklch(L, chroma, H);
  }
  return rgbToHex(linear.map((v) => toGamma(Math.max(0, Math.min(1, v)))));
}

/** A colour with its lightness held inside [low, high]; hue and chroma are its own. */
export function lift(hex: string, low: number, high: number): string {
  const [L, C, H] = oklch(hex);
  return fromOklch(Math.min(high, Math.max(low, L)), C, H);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio. */
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function deltaE(a: string, b: string): number {
  const p = oklab(a);
  const q = oklab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export function isNeutral(hex: string): boolean {
  return oklch(hex)[1] < 0.03;
}
