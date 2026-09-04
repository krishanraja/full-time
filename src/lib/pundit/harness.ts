import { licenseClaim, unsupportedTacticsSpans } from "./claim-lab";
import { assertPerformanceIdentity } from "./performance";
import { maxSourceSimilarity } from "./research-originality";
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

const CONSEQUENCE_LANGUAGE =
  /\b(relegat\w*|stay(?:ed|s|ing)? up|(?:went|go|goes|going|sends?|sent)\s+(?:\w+\s+){0,3}down|survival|survived|safety|clinch\w*|seal\w*|secur\w*|confirm\w*|guarantee\w*|qualif\w*|title|champions?|Europa|European (?:place|football|spot)|top four|play-?offs?)\b/gi;

const SPELLED_NUMBERS: Record<string, number> = {
  two: 2,
  twice: 2,
  double: 2,
  brace: 2,
  three: 3,
  "hat-trick": 3,
  hattrick: 3,
  treble: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const SPELLED_NUMBER_RE = new RegExp(
  `\\b(${Object.keys(SPELLED_NUMBERS)
    .map((word) => word.replace("-", "[- ]?"))
    .join("|")})\\b`,
  "gi",
);

const NAME_STOPWORDS = new Set(
  "the a an and but or so yet for nor if then than that this these those he she they it we there here when where what who which why how while after before during since until at in on by with from into over under between both all each every no not only just still even now once again however instead perhaps ultimately sometimes simply first second third half full time goal goals match football evidence result score data point process decision probability counterpoint verdict var xg saturday sunday monday tuesday wednesday thursday friday january february march april may june july august september october november december"
    .split(" ")
    .map((word) => word.toLowerCase()),
);

const NUMBER_WORDS = new Set(
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred first second third fourth fifth sixth seventh eighth ninth tenth".split(
    " ",
  ),
);

/** Football constants every listener already holds: a point, three for a win,
 *  eleven players, forty-five minute halves, ninety minutes. These are not
 *  match facts and never need evidence. */
const FOOTBALL_CONSTANTS = [1, 3, 11, 45, 90];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

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
      if (NAME_STOPWORDS.has(key) || isNumberPhrase(phrase)) continue;
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
      if (rest && !NAME_STOPWORDS.has(normalize(rest)) && !isNumberPhrase(rest)) {
        midSentence.push(rest);
      }
    }
  }
  const confirmed = new Set(midSentence.map(normalize));
  return [...midSentence, ...sentenceInitial.filter((phrase) => confirmed.has(normalize(phrase)))];
}

function entityLicensed(entity: string, licensed: ReadonlySet<string>) {
  const wanted = normalize(entity);
  return [...licensed].some((value) => {
    const allowed = normalize(value);
    return (
      allowed === wanted ||
      allowed.includes(wanted) ||
      wanted.includes(allowed) ||
      allowed.split(" ").at(-1) === wanted.split(" ").at(-1)
    );
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
  const writtenNumbers = [...candidate.displayScript.matchAll(/\d+(?:\.\d+)?/g)].map((match) => ({
    span: match[0],
    value: Number(match[0]),
  }));
  SPELLED_NUMBER_RE.lastIndex = 0;
  const writtenSpelled = [...candidate.displayScript.matchAll(SPELLED_NUMBER_RE)].map((match) => ({
    span: match[0],
    value: SPELLED_NUMBERS[match[0].toLowerCase().replace(" ", "-")],
  }));
  const unlicensedNumbers = [...writtenNumbers, ...writtenSpelled].filter(
    (item) => !licensed.numbers.has(item.value),
  );
  const unlicensedEntities = properNouns(candidate.displayScript).filter(
    (entity) => !entityLicensed(entity, licensed.entities),
  );
  CONSEQUENCE_LANGUAGE.lastIndex = 0;
  const consequences = [...candidate.displayScript.matchAll(CONSEQUENCE_LANGUAGE)].map(
    (match) => match[0],
  );
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
        : `Script is ${wordCount} words; required range is 750-1100.`,
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
