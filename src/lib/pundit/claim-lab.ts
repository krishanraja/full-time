import { evidenceById } from "./evidence";
import { FOOTBALL_CONSTANTS, numbersIn } from "./numbers";
import type { AnalysisClaim, EvidencePack } from "./types";

const UNSUPPORTED_TACTICS = [
  /press(?:ing)? trigger/i,
  /pressing shape/i,
  /rest defen[cs]e/i,
  /overload/i,
  /off[- ]ball rotation/i,
  /spacing/i,
  /body shape/i,
  /scanning/i,
  /left (?:him|her|them) (?:one[- ]on[- ]one|1v1|one[- ]against[- ]two|1v2)/i,
  /told (?:him|her|them) to/i,
  /deliberately (?:left|created|pressed|inverted)/i,
  /dressing room/i,
  /wanted it more/i,
  /lack(?:ed|s)? (?:desire|passion|leadership|confidence|effort)/i,
];

const OUTCOME_AS_JUSTIFICATION = [
  /(?:because|since) it (?:worked|came off|went in),? (?:it was|that was) (?:a )?good/i,
  /the goal proves (?:the )?(?:shot|decision|substitution) was right/i,
];

export type ClaimLicenseResult = {
  licensed: boolean;
  failures: string[];
};

export function unsupportedTacticsSpans(text: string): string[] {
  return UNSUPPORTED_TACTICS.flatMap((pattern) => text.match(pattern)?.[0] ?? []);
}

function numericValuesWithin(value: unknown, found: Set<number>): void {
  if (typeof value === "number" && Number.isFinite(value)) found.add(value);
  else if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (value.trim() !== "" && Number.isFinite(parsed)) found.add(parsed);
  } else if (Array.isArray(value)) {
    for (const item of value) numericValuesWithin(item, found);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      numericValuesWithin(item, found);
    }
  }
}

/** A claim is handed to all six writers as licensed truth, so a claim that
 *  miscounts its own evidence poisons the whole show at once. Every number a
 *  claim states must be one the evidence it cites actually carries, the count
 *  of those citations, or a universal football constant.
 *
 *  This is the check that "Chelsea made four substitutions (James, Acheampong,
 *  Caicedo at 68'; Chavarria at 72'; Barco at 82')" fails: it names five
 *  players, cites five events, and says four. */
function numericConsistency(claim: AnalysisClaim, pack: EvidencePack): string[] {
  const evidence = evidenceById(pack);
  const cited = claim.evidenceRefs.map((ref) => evidence.get(ref)).filter(Boolean);
  if (cited.length !== claim.evidenceRefs.length) return [];

  const carried = new Set<number>();
  for (const item of cited) numericValuesWithin(item, carried);
  const supported = new Set<number>([...FOOTBALL_CONSTANTS, ...carried]);
  supported.add(claim.evidenceRefs.length);

  const failures = [...rosterConsistency(claim.thesis), ...comparisonConsistency(claim, carried)];
  const unsupported = numbersIn(claim.thesis)
    .filter((item) => !supported.has(item.value))
    .filter((item, index, all) => all.findIndex((other) => other.value === item.value) === index);
  if (unsupported.length) {
    failures.push(
      `States ${unsupported
        .map((item) => `"${item.span}"`)
        .join(", ")}, which the ${claim.evidenceRefs.length} cited evidence items do not carry.`,
    );
  }
  return failures;
}

const COMPARISON = /\b(?:versus|vs\.?|against|compared with|compared to)\b/i;
const CAPITALISED = /\p{Lu}\p{L}+/u;
const MINUTE_MARKER = /\b(?:minute|minutes|min|mins)\b|'/i;
const ORDINAL_WORD = /(?:^|[- ])(?:first|second|third|[a-z]*(?:th|eth|ieth))$/i;
const ORDINAL_DIGITS = /^\d+(?:st|nd|rd|th)$/i;

const isOrdinal = (span: string) => ORDINAL_DIGITS.test(span) || ORDINAL_WORD.test(span);

/** The count a parenthetical roster actually lists, or undefined when the
 *  parenthetical is not a roster of names.
 *
 *  "(Mac Allister, Jacquet, Kerkez)" lists three. "(3-1)" and "(min 41)" list
 *  nobody and are left alone. */
function rosterSize(inside: string): number | undefined {
  const parts = inside
    .split(/[;,]/)
    .map((part) => part.replace(/\bat\s+\d+'?\b|\bmin(?:ute)?\s*\d+\b|\b\d+'\b/gi, "").trim())
    .map((part) => part.replace(/^(?:and|&)\s+/i, "").trim())
    .filter(Boolean);
  if (!parts.length) return undefined;
  return parts.every((part) => CAPITALISED.test(part)) ? parts.length : undefined;
}

/** A count that names its members must name as many as it counts.
 *
 *  Both claims that have poisoned a whole show contradicted themselves in one
 *  line: "Chelsea made four substitutions (James, Acheampong, Caicedo at 68';
 *  Chavarria at 72'; Barco at 82')" names five, and "Liverpool received four
 *  yellow cards (Mac Allister, Jacquet, Kerkez)" names three. Six writers each
 *  repeated the count, and the judges rejected all six against the evidence. */
function rosterConsistency(thesis: string): string[] {
  const failures: string[] = [];
  for (const match of thesis.matchAll(/\(([^()]{2,160})\)/g)) {
    const listed = rosterSize(match[1]);
    if (listed === undefined) continue;
    const before = thesis.slice(Math.max(0, match.index - 80), match.index);
    if (/[.!?]\s*$/.test(before)) continue;
    const numbers = numbersIn(before)
      .filter((item) => !isOrdinal(item.span))
      .map((item) => ({ ...item, index: before.lastIndexOf(item.span) }))
      .filter((item) => item.index >= 0)
      .sort((left, right) => left.index - right.index);
    const stated = numbers.at(-1);
    if (!stated) continue;
    const between = before.slice(stated.index + stated.span.length);
    if (between.length > 40 || MINUTE_MARKER.test(between)) continue;
    if (stated.value !== listed) {
      failures.push(
        `States "${stated.span}" but names ${listed}: (${match[1].trim()}).`,
      );
    }
  }
  return failures;
}

/** Two counts compared against each other need citations for both sides.
 *
 *  "four yellow cards ... versus Ipswich's one" needs five cited events and had
 *  four, which is exactly how a claim can miscount while every number in it
 *  looks individually accountable: four was read as the number of citations and
 *  one as an ordinary football constant. */
function comparisonConsistency(claim: AnalysisClaim, carried: Set<number>): string[] {
  const split = COMPARISON.exec(claim.thesis);
  if (!split) return [];
  const sides = [
    claim.thesis.slice(0, split.index),
    claim.thesis.slice(split.index + split[0].length),
  ].map((side) =>
    numbersIn(side)
      .filter((item) => !carried.has(item.value))
      .filter((item) => Number.isInteger(item.value) && item.value > 0 && item.value <= 20)
      .filter((item) => !isOrdinal(item.span)),
  );
  if (sides[0].length !== 1 || sides[1].length !== 1) return [];
  const total = sides[0][0].value + sides[1][0].value;
  if (total <= claim.evidenceRefs.length) return [];
  return [
    `Compares "${sides[0][0].span}" with "${sides[1][0].span}", which needs ${total} cited items and has ${claim.evidenceRefs.length}.`,
  ];
}

export function licenseClaim(claim: AnalysisClaim, pack: EvidencePack): ClaimLicenseResult {
  const failures: string[] = [];
  const evidence = evidenceById(pack);

  if (claim.matchId !== pack.matchId)
    failures.push("Claim and evidence pack refer to different matches.");
  if (claim.evidenceRefs.length === 0) failures.push("Claim cites no evidence.");
  const missingRefs = claim.evidenceRefs.filter((ref) => !evidence.has(ref));
  if (missingRefs.length) failures.push(`Unknown evidence references: ${missingRefs.join(", ")}.`);
  if (claim.confidence < 0 || claim.confidence > 1)
    failures.push("Confidence must be between 0 and 1.");

  const unsupported = unsupportedTacticsSpans(claim.thesis);
  if (unsupported.length) {
    failures.push(`Requires unavailable film or tracking evidence: ${unsupported.join(", ")}.`);
  }
  if (OUTCOME_AS_JUSTIFICATION.some((pattern) => pattern.test(claim.thesis))) {
    failures.push("Confuses a successful outcome with decision quality.");
  }
  if ((claim.type === "counterfactual" || claim.type === "prediction") && !claim.falsifier) {
    failures.push(`${claim.type} requires a falsifier.`);
  }
  if ((claim.type === "counterfactual" || claim.type === "prediction") && !claim.evaluationRule) {
    failures.push(`${claim.type} requires a structured evaluation rule.`);
  }
  failures.push(...numericConsistency(claim, pack));
  if (claim.type === "mechanism" && /because|caused|led to|resulted in/i.test(claim.thesis)) {
    const causalSupport = claim.evidenceRefs.some(
      (ref) => ref.startsWith("event.") || ref.startsWith("derived."),
    );
    if (!causalSupport)
      failures.push("Causal-strength mechanism claim lacks event or derived support.");
  }

  return { licensed: failures.length === 0, failures };
}

export function licenseClaims(claims: AnalysisClaim[], pack: EvidencePack) {
  return claims.map((claim) => ({ claim, ...licenseClaim(claim, pack) }));
}
