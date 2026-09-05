import { licenseClaim, unsupportedTacticsSpans } from "./claim-lab";
import { assertPerformanceIdentity } from "./performance";
import { maxSourceSimilarity } from "./research-originality";
import {
  digitNumbersIn,
  FOOTBALL_CONSTANTS,
  spelledNumbersIn,
  spelledNumberValue,
} from "./numbers";
import { getPunditSpec } from "./specs";
import type {
  AnalysisClaim,
  EvidencePack,
  HarnessResult,
  PunditVariantCandidate,
  QualitativeHarness,
} from "./types";

const GENERIC_FOOTBALL_LANGUAGE = [
  /wanted it more/i,
  /fine margins/i,
  /at this level/i,
  /showed (?:more )?(?:desire|passion)/i,
];

const PROHIBITED_HUMOUR = [
  /jok(?:e|es|ing).{0,40}(?:injury|grief|mental health)/i,
  /(?:race|religion|sex|sexuality|disability).{0,25}(?:joke|banter|laugh)/i,
];

/** Season-level outcomes the structured evidence tier cannot support. These
 *  words carry the consequence on their own, whatever surrounds them. */
const CONSEQUENCE_ALWAYS =
  /\b(?:relegat\w*|stay(?:ed|s|ing)?\s+up|survival|top\s+four|play-?offs?|promotion|promoted|Europa|Champions\s+League|champions?|European\s+(?:place|football|spot)|titles?|drop\s+zone|the\s+drop)\b/gi;

/** Season-level stakes used to disambiguate the verbs below. */
const SEASON_STAKES =
  "(?:titles?|europe|european|europa|champions|relegation|survival|safety|top\\s+four|play-?offs?|promotion|drop\\s+zone)";

/** "Secured", "sealed" and "confirmed" are ordinary match verbs: a side secures
 *  three points without any season claim. They only assert a consequence when a
 *  season-level stake sits beside them in the same sentence. */
// "Survive" is an ordinary match verb before it is a season one. A side
// survives a corner, a spell of pressure, ten minutes of it. The Numbers pundit
// wrote "Liverpool didn't survive pressure, they survived optimism" and this
// gate failed the script, which was the single harness standing between that
// run and a published show. The noun "survival" stays absolute, because in
// football it means the season; the verb needs a season stake beside it.
const CONSEQUENCE_VERBS = "(?:clinch|seal|secur|confirm|guarantee|qualif|surviv)";

const CONSEQUENCE_NEAR_STAKES = new RegExp(
  `\\b${CONSEQUENCE_VERBS}\\w*\\b[^.?!]{0,60}?\\b${SEASON_STAKES}\\b` +
    `|\\b${SEASON_STAKES}\\b[^.?!]{0,60}?\\b${CONSEQUENCE_VERBS}\\w*\\b`,
  "gi",
);

/** Season-level consequence language in a script. Empty when the script only
 *  describes the match in front of it. */
export function consequenceSpans(script: string): string[] {
  CONSEQUENCE_ALWAYS.lastIndex = 0;
  CONSEQUENCE_NEAR_STAKES.lastIndex = 0;
  return [
    ...[...script.matchAll(CONSEQUENCE_ALWAYS)].map((match) => match[0]),
    ...[...script.matchAll(CONSEQUENCE_NEAR_STAKES)].map((match) => match[0]),
  ];
}

const NAME_STOPWORDS = new Set(
  "i the a an and but or so yet for nor if then than that this these those he she they it we there here when where what who which why how while after before during since until at in on by with from into over under between both all each every no not only just still even now once again however instead perhaps ultimately sometimes simply first second third half full time goal goals match football evidence result score data point process decision probability counterpoint verdict var xg saturday sunday monday tuesday wednesday thursday friday january february march april may june july august september october november december"
    .split(" ")
    .map((word) => word.toLowerCase()),
);

const NUMBER_WORDS = new Set(
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred first second third fourth fifth sixth seventh eighth ninth tenth".split(
    " ",
  ),
);

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").replace(/[‘’]/g, "'").toLowerCase().trim();

/** "I'll" and "he's" are the pronoun plus a contraction, never a name. Strip
 *  the contracted tail so the stopword list recognises the word underneath. */
const withoutContraction = (word: string) => word.replace(/'(?:ll|m|ve|d|re|s|t)$/, "");

function isNumberPhrase(phrase: string) {
  const tokens = normalize(phrase)
    .split(/[\s-]+/)
    .filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => NUMBER_WORDS.has(token));
}

/** A short window of script around a span, so a repair prompt says where the
 *  problem sits rather than only what it is. */
function contextFor(script: string, span: string) {
  const index = script.indexOf(span);
  if (index < 0) return span;
  const start = Math.max(0, script.lastIndexOf(" ", Math.max(0, index - 30)));
  const end = Math.min(script.length, script.indexOf(" ", index + span.length + 30));
  return `${span} (in: "${script.slice(start, end < 0 ? script.length : end).trim()}")`;
}

function collectEvidenceValues(value: unknown, numbers: Set<number>, entities: Set<string>): void {
  if (typeof value === "number" && Number.isFinite(value)) numbers.add(value);
  else if (typeof value === "string" && value.trim()) entities.add(value.trim());
  else if (Array.isArray(value)) {
    for (const item of value) collectEvidenceValues(item, numbers, entities);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectEvidenceValues(item, numbers, entities);
    }
  }
}

function licensedScriptValues(pack: EvidencePack, candidate: PunditVariantCandidate) {
  const numbers = new Set<number>();
  const entities = new Set<string>(["Full Time", getPunditSpec(candidate.punditId).name]);
  for (const item of [...pack.facts, ...pack.derivations]) {
    collectEvidenceValues(item.value, numbers, entities);
  }
  const homeScore = pack.facts.find((item) => item.id === "match.home_score")?.value;
  const awayScore = pack.facts.find((item) => item.id === "match.away_score")?.value;
  if (typeof homeScore === "number" && typeof awayScore === "number") {
    for (let count = 0; count <= homeScore + awayScore; count++) numbers.add(count);
  }
  for (const constant of FOOTBALL_CONSTANTS) numbers.add(constant);
  return { numbers, entities };
}

const PHRASE_CONNECTORS = new Set(["of", "de", "van", "der", "del", "i"]);

/** Trims connector words and the pronoun "I" from the ends of a matched
 *  phrase, so "Ten of" becomes "Ten" and "But I" becomes "But". */
function trimPhrase(phrase: string) {
  const tokens = phrase.split(/\s+/);
  while (tokens.length && PHRASE_CONNECTORS.has(tokens[0].toLowerCase())) tokens.shift();
  while (tokens.length && PHRASE_CONNECTORS.has(tokens.at(-1)!.toLowerCase())) tokens.pop();
  return tokens.join(" ");
}

/** Capitalised phrases that look like names. A capitalised word at the start
 *  of a sentence is only ordinary English, so it counts as a name only when the
 *  same phrase also appears capitalised mid-sentence somewhere in the script.
 *  Spelled numbers and ordinals are never names. */
export function properNouns(script: string): string[] {
  const midSentence: string[] = [];
  const sentenceInitial: string[] = [];
  for (const sentence of script.split(/(?<=[.?!])\s+/)) {
    const pattern = /\b[A-Z][a-zA-Z'’-]*(?:\s+(?:[A-Z][a-zA-Z'’-]*|of|de|van|der|del))*/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sentence))) {
      const phrase = trimPhrase(match[0].trim());
      if (!phrase) continue;
      const key = normalize(phrase);
      if (NAME_STOPWORDS.has(key) || NAME_STOPWORDS.has(withoutContraction(key))) continue;
      if (isNumberPhrase(phrase)) continue;
      const leading = sentence.slice(0, match.index).trim();
      const atSentenceStart = leading === "" || /^["'“‘(]+$/.test(leading);
      if (!atSentenceStart) {
        midSentence.push(phrase);
        continue;
      }
      sentenceInitial.push(phrase);
      // "Because North FC kept the ball": the starter word is ordinary English
      // but the rest of the phrase is a name in its own right.
      const rest = trimPhrase(phrase.split(/\s+/).slice(1).join(" "));
      const restKey = normalize(rest);
      if (
        rest &&
        !NAME_STOPWORDS.has(restKey) &&
        !NAME_STOPWORDS.has(withoutContraction(restKey)) &&
        !isNumberPhrase(rest)
      ) {
        midSentence.push(rest);
      }
    }
  }
  const confirmed = new Set(midSentence.map(normalize));
  return [...midSentence, ...sentenceInitial.filter((phrase) => confirmed.has(normalize(phrase)))];
}

/** "Rayo's" is the licensed Rayo Vallecano in the possessive, not a new name. */
const withoutPossessive = (value: string) =>
  normalize(value).replace(/'s\b/g, "").replace(/s'\b/g, "s").trim();

function entityLicensed(entity: string, licensed: ReadonlySet<string>) {
  const wanted = withoutPossessive(entity);
  if (!wanted) return true;
  const wantedTokens = wanted.split(/\s+/).filter(Boolean);
  return [...licensed].some((value) => {
    const allowed = withoutPossessive(value);
    if (!allowed) return false;
    if (allowed === wanted || allowed.includes(wanted) || wanted.includes(allowed)) return true;
    // A short form licenses against the full name it belongs to: "Rayo" against
    // "Rayo Vallecano", "Camello" against "Sergio Camello".
    const allowedTokens = allowed.split(/\s+/).filter(Boolean);
    return wantedTokens.every((token) => allowedTokens.includes(token));
  });
}

function beatsContaining(candidate: PunditVariantCandidate, spans: readonly string[]) {
  const normalizedSpans = spans.map(normalize).filter(Boolean);
  return (Object.entries(candidate.outline) as Array<[keyof typeof candidate.outline, string]>)
    .filter(([, text]) => normalizedSpans.some((span) => normalize(text).includes(span)))
    .map(([beat]) => beat);
}

function result(
  harness: string,
  passed: boolean,
  failure?: string,
  evidenceSpan?: string,
  failedBeats?: HarnessResult["failedBeats"],
): HarnessResult {
  return {
    harness,
    hardGate: true,
    passed,
    failure,
    evidenceSpan,
    requestedRepair: passed ? undefined : "Repair only the cited beat; preserve all passed beats.",
    failedBeats: passed ? undefined : failedBeats,
  };
}

export type HardGateContext = {
  pack: EvidencePack;
  claims: AnalysisClaim[];
  candidate: PunditVariantCandidate;
  originalitySimilarity?: number;
  originalitySources?: readonly string[];
  humourSafetyPassed?: boolean;
  audioNumbersVerified?: boolean;
  pronunciationVerified?: boolean;
};

export function runHardGates(context: HardGateContext): HarnessResult[] {
  const { candidate, pack } = context;
  const referencedClaims = candidate.claimIds
    .map((id) => context.claims.find((claim) => claim.id === id))
    .filter((claim): claim is AnalysisClaim => Boolean(claim));
  const claimFailures = referencedClaims.flatMap((claim) => licenseClaim(claim, pack).failures);
  const missingClaims = candidate.claimIds.filter(
    (id) => !context.claims.some((claim) => claim.id === id),
  );
  const tactics = unsupportedTacticsSpans(candidate.displayScript);
  const performanceIdentity = assertPerformanceIdentity(
    candidate.performancePlan,
    candidate.displayScript,
  );
  const wordCount = candidate.displayScript.trim().split(/\s+/).filter(Boolean).length;
  const genericSpan = GENERIC_FOOTBALL_LANGUAGE.find((pattern) =>
    pattern.test(candidate.displayScript),
  );
  const humourSpan = PROHIBITED_HUMOUR.find((pattern) => pattern.test(candidate.displayScript));
  const licensed = licensedScriptValues(pack, candidate);
  const writtenNumbers = digitNumbersIn(candidate.displayScript);
  const writtenSpelled = spelledNumbersIn(candidate.displayScript);
  const unlicensedNumbers = [...writtenNumbers, ...writtenSpelled]
    .filter((item) => !licensed.numbers.has(item.value))
    .filter(
      (item, index, all) =>
        all.findIndex((other) => other.span.toLowerCase() === item.span.toLowerCase()) === index,
    );
  const unlicensedEntities = properNouns(candidate.displayScript).filter(
    (entity) => !entityLicensed(entity, licensed.entities),
  );
  const consequences = consequenceSpans(candidate.displayScript);
  const predictionIsValid =
    !candidate.thesis.predictionClaimId ||
    (Boolean(candidate.predictionLockedAt) &&
      Boolean(candidate.kickoffAt) &&
      new Date(candidate.predictionLockedAt!).getTime() <=
        new Date(candidate.kickoffAt!).getTime());
  const originalityFailedBeats = context.originalitySources?.length
    ? (Object.entries(candidate.outline) as Array<[keyof typeof candidate.outline, string]>)
        .filter(([, text]) => maxSourceSimilarity(text, context.originalitySources!) >= 0.82)
        .map(([beat]) => beat)
    : [];

  const results = [
    result(
      "evidence_to_claim_entailment",
      missingClaims.length === 0 && claimFailures.length === 0,
      [...missingClaims.map((id) => `Missing claim ${id}`), ...claimFailures].join(" ") ||
        undefined,
    ),
    result(
      "unsupported_tactics",
      tactics.length === 0,
      tactics.length ? "The script claims film-specific evidence that is unavailable." : undefined,
      tactics.join(", ") || undefined,
      beatsContaining(candidate, tactics),
    ),
    result(
      "numeric_licence",
      unlicensedNumbers.length === 0,
      unlicensedNumbers.length
        ? `Unlicensed numerical claims (every number must appear in the evidence pack): ${unlicensedNumbers
            .map((item) => contextFor(candidate.displayScript, item.span))
            .join("; ")}.`
        : undefined,
      unlicensedNumbers.map((item) => item.span).join(", ") || undefined,
      beatsContaining(
        candidate,
        unlicensedNumbers.map((item) => item.span),
      ),
    ),
    result(
      "entity_licence",
      unlicensedEntities.length === 0,
      unlicensedEntities.length
        ? `Unlicensed proper nouns (only names present in the evidence pack may appear): ${unlicensedEntities
            .map((entity) => contextFor(candidate.displayScript, entity))
            .join("; ")}.`
        : undefined,
      unlicensedEntities.join(", ") || undefined,
      beatsContaining(candidate, unlicensedEntities),
    ),
    result(
      "consequence_licence",
      consequences.length === 0,
      consequences.length
        ? "Season-level consequences are unavailable in the structured evidence tier."
        : undefined,
      consequences.join(", ") || undefined,
      beatsContaining(candidate, consequences),
    ),
    result(
      "generic_language",
      !genericSpan,
      genericSpan ? "Generic football language lacks observable support." : undefined,
      genericSpan ? candidate.displayScript.match(genericSpan)?.[0] : undefined,
      genericSpan
        ? beatsContaining(candidate, [candidate.displayScript.match(genericSpan)?.[0] ?? ""])
        : undefined,
    ),
    result(
      "research_originality",
      context.originalitySimilarity == null || context.originalitySimilarity < 0.82,
      context.originalitySimilarity != null && context.originalitySimilarity >= 0.82
        ? `Corpus similarity ${context.originalitySimilarity.toFixed(2)} exceeds 0.81.`
        : undefined,
      undefined,
      context.originalitySimilarity != null && context.originalitySimilarity >= 0.82
        ? originalityFailedBeats.length
          ? originalityFailedBeats
          : (Object.keys(candidate.outline) as Array<keyof typeof candidate.outline>)
        : undefined,
    ),
    result(
      "humour_safety",
      context.humourSafetyPassed !== false && !humourSpan,
      context.humourSafetyPassed === false || humourSpan
        ? "Humour safety review failed."
        : undefined,
      humourSpan ? candidate.displayScript.match(humourSpan)?.[0] : undefined,
      humourSpan
        ? beatsContaining(candidate, [candidate.displayScript.match(humourSpan)?.[0] ?? ""])
        : undefined,
    ),
    result(
      "prediction_timestamp",
      predictionIsValid,
      predictionIsValid ? undefined : "Prediction was not immutably registered before kickoff.",
    ),
    result(
      "display_spoken_identity",
      candidate.displayScript === candidate.spokenScript && performanceIdentity.passed,
      candidate.displayScript === candidate.spokenScript
        ? performanceIdentity.failure
        : "Display and spoken scripts differ.",
    ),
    result(
      "spoken_length",
      wordCount >= 750 && wordCount <= 1100,
      wordCount >= 750 && wordCount <= 1100
        ? undefined
        : wordCount < 750
          ? `Script is ${wordCount} words; required range is 750-1100. Add at least ${
              750 - wordCount
            } more words by developing the existing beats (roughly ${Math.ceil(
              (750 - wordCount) / 10,
            )} per beat). Deepen the reasoning already present; introduce no new facts, numbers or names.`
          : `Script is ${wordCount} words; required range is 750-1100. Cut at least ${
              wordCount - 1100
            } words without dropping any beat.`,
      undefined,
      wordCount >= 750 && wordCount <= 1100
        ? undefined
        : (Object.keys(candidate.outline) as Array<keyof typeof candidate.outline>),
    ),
  ];
  if (context.audioNumbersVerified !== undefined) {
    results.push(
      result(
        "audio_number_fidelity",
        context.audioNumbersVerified,
        context.audioNumbersVerified ? undefined : "Produced audio failed numerical verification.",
      ),
    );
  }
  if (context.pronunciationVerified !== undefined) {
    results.push(
      result(
        "pronunciation_fidelity",
        context.pronunciationVerified,
        context.pronunciationVerified ? undefined : "Produced audio contains an unverified name.",
      ),
    );
  }
  return results;
}

export function validateQualitativeScores(
  punditId: PunditVariantCandidate["punditId"],
  scores: Partial<Record<QualitativeHarness, HarnessResult>>,
): HarnessResult[] {
  const thresholds = getPunditSpec(punditId).requiredThresholds;
  return (Object.keys(thresholds) as QualitativeHarness[]).map((harness) => {
    const judged = scores[harness];
    if (!judged?.score) {
      return {
        harness,
        hardGate: false,
        passed: false,
        failure: "Independent judge did not return a score.",
        requestedRepair: "Run the missing independent harness; do not infer or average it.",
      };
    }
    return {
      ...judged,
      harness,
      hardGate: false,
      passed: judged.score >= thresholds[harness],
      failure:
        judged.score >= thresholds[harness]
          ? undefined
          : (judged.failure ?? `Score ${judged.score} is below floor ${thresholds[harness]}.`),
      requestedRepair:
        judged.score >= thresholds[harness]
          ? undefined
          : (judged.requestedRepair ?? "Repair only the failed beat."),
      failedBeats: judged.score >= thresholds[harness] ? undefined : judged.failedBeats,
    };
  });
}

export function publicationDecision(results: readonly HarnessResult[]) {
  const failures = results.filter((item) => !item.passed);
  return {
    publishable: results.length > 0 && failures.length === 0,
    failures,
    status: failures.length ? "quarantined" : "approved",
  } as const;
}

export function requestedRepairs(results: readonly HarnessResult[]) {
  return results
    .filter((item) => !item.passed)
    .map((item) => ({
      harness: item.harness,
      evidenceSpan: item.evidenceSpan,
      exactFailure: item.failure ?? "Unspecified failure.",
      smallestRepair: item.requestedRepair ?? "Repair the smallest failing span.",
      failedBeats: item.failedBeats ?? [],
    }));
}

export { spelledNumberValue, spelledNumbersIn };
