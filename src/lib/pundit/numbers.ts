/** Reading numbers out of football prose.
 *
 *  Scripts are spoken, so numbers arrive as words at least as often as digits:
 *  "twenty-four", "fifty-seventh", "two point eight three". They have to be
 *  read whole, because the parts are different numbers with different licences.
 *
 *  This lives apart from the gates so that both the script harness and the
 *  claim licence can use it without importing each other. */

/** Cardinals that can stand alone as a counted claim. */
const SPELLED_UNITS: Record<string, number> = {
  nil: 0,
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

/** Ordinals only count inside a compound ("fifty-seventh minute"). Alone they
 *  are ordinary English structure ("the second half", "the third time") rather
 *  than a claim about a quantity, so they are never checked on their own. */
const SPELLED_ORDINAL_UNITS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
};

const SPELLED_TENS: Record<string, number> = {
  twenty: 20,
  twentieth: 20,
  thirty: 30,
  thirtieth: 30,
  forty: 40,
  fortieth: 40,
  fifty: 50,
  fiftieth: 50,
  sixty: 60,
  sixtieth: 60,
  seventy: 70,
  seventieth: 70,
  eighty: 80,
  eightieth: 80,
  ninety: 90,
  ninetieth: 90,
};

/** Football idioms that state a count without spelling it. */
const COUNT_IDIOMS: Record<string, number> = {
  twice: 2,
  double: 2,
  brace: 2,
  "hat-trick": 3,
  hattrick: 3,
  treble: 3,
};

/** Football constants every listener already holds: a point, three for a win,
 *  eleven players, forty-five minute halves, ninety minutes. These are not
 *  match facts and never need evidence. */
/** Numbers that are part of the game rather than part of a match.
 *
 *  A point, three for a win, eleven players, and the two halves. Eighteen joins
 *  them because the eighteen-yard box is the name of a piece of the pitch: on
 *  2026-09-04 two pundits were refused for "the edge of the eighteen-yard line"
 *  and "bodies into the eighteen-yard box", which name a location and assert
 *  nothing about the match. Six is the goal area for the same reason. */
export const FOOTBALL_CONSTANTS = [1, 3, 6, 11, 18, 45, 90];

const UNIT_ALT = Object.keys(SPELLED_UNITS).join("|");
const TENS_ALT = Object.keys(SPELLED_TENS).join("|");
const ORDINAL_ALT = Object.keys(SPELLED_ORDINAL_UNITS).join("|");
const WHOLE_ALT = `(?:${TENS_ALT})(?:[-\\s](?:${UNIT_ALT}|${ORDINAL_ALT}))?|(?:${UNIT_ALT})`;

/** Compound numbers are matched whole so that "twenty-four" reads as 24 rather
 *  than as an unlicensed "four", and "fifty-seventh" as 57 rather than "seven".
 *  The longer alternatives come first: regex alternation is ordered, so the
 *  whole form wins and its parts are never rescanned. */
const SPELLED_NUMBER_RE = new RegExp(
  [
    // Scripts are spoken, so a decimal is written out: "two point eight three"
    // is 2.83, not an eight and a three.
    `\\b(?:${WHOLE_ALT})[-\\s]point(?:[-\\s](?:${UNIT_ALT}))+\\b`,
    `\\b(?:${TENS_ALT})(?:[-\\s](?:${UNIT_ALT}|${ORDINAL_ALT}))?\\b`,
    `\\b(?:${UNIT_ALT})\\b`,
    `\\b(?:${Object.keys(COUNT_IDIOMS)
      .map((word) => word.replace("-", "[- ]?"))
      .join("|")})\\b`,
  ].join("|"),
  "gi",
);

/** A digit glued to the end of a word belongs to an identifier ("c4", a hash),
 *  not to a quantity. Only the leading side is guarded so "45th" still reads
 *  as 45. */
const DIGIT_NUMBER_RE = /(?<![A-Za-z0-9])\d+(?:\.\d+)?/g;

/** The value a matched spelled number states, or undefined when the phrase is
 *  not a number after all. */
export function spelledNumberValue(phrase: string): number | undefined {
  const key = phrase.toLowerCase().trim().replace(/\s+/g, "-");
  if (key in COUNT_IDIOMS) return COUNT_IDIOMS[key];
  const tokens = key.split("-").filter(Boolean);
  const pointAt = tokens.indexOf("point");
  const whole = pointAt === -1 ? tokens : tokens.slice(0, pointAt);
  const fraction = pointAt === -1 ? [] : tokens.slice(pointAt + 1);
  if (!whole.length) return undefined;
  let total = 0;
  for (const token of whole) {
    const value = SPELLED_TENS[token] ?? SPELLED_UNITS[token] ?? SPELLED_ORDINAL_UNITS[token];
    if (value === undefined) return undefined;
    total += value;
  }
  if (!fraction.length) return total;
  let digits = "";
  for (const token of fraction) {
    const value = SPELLED_UNITS[token];
    if (value === undefined || value > 9) return undefined;
    digits += String(value);
  }
  return Number(`${total}.${digits}`);
}

/** Every spelled number a text states, each as the whole phrase that carries
 *  the value rather than as its parts. */
export function spelledNumbersIn(text: string): Array<{ span: string; value: number }> {
  SPELLED_NUMBER_RE.lastIndex = 0;
  return [...text.matchAll(SPELLED_NUMBER_RE)]
    .map((match) => ({ span: match[0], value: spelledNumberValue(match[0]) }))
    .filter((item): item is { span: string; value: number } => item.value !== undefined);
}

/** Every number written in digits. */
export function digitNumbersIn(text: string): Array<{ span: string; value: number }> {
  DIGIT_NUMBER_RE.lastIndex = 0;
  return [...text.matchAll(DIGIT_NUMBER_RE)].map((match) => ({
    span: match[0],
    value: Number(match[0]),
  }));
}

/** Every number a text states, in digits or in words. */
export function numbersIn(text: string): Array<{ span: string; value: number }> {
  return [...digitNumbersIn(text), ...spelledNumbersIn(text)];
}
