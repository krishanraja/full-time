// Server-only. NARRATION.
//
// The live episode measured LRA 1.9 LU: the whole 55 seconds inside a 2 dB
// dynamic window, which is the acoustic signature of a machine reading a page.
// eleven_v3 with placed delivery tags measured 2.7 to 3.4 LU. That is the whole
// reason for this module.
//
// THE CRITICAL ARCHITECTURE: the writer never emits tags, CODE inserts them.
// If the model emitted a tagged script, the gate would check one string and
// ElevenLabs would speak a different one, with nothing proving they match.
//
// script --(gate passes)--> speakNumbers() --> applyHouseCadence()
// --> spoken_script --> ElevenLabs --> Scribe --> fidelity gate
//
// `script` is the display transcript and never contains a bracket (enforced by
// the gate AND a DB CHECK constraint). `spoken_script` is TTS-only and never
// reaches a screen or the RSS feed.

import { assertPerformanceIdentity } from "@/lib/pundit/performance";
import { concatenateNarrationMp3 } from "@/lib/pundit/audio-mastering.server";
import type { PerformanceBeat, PunditId } from "@/lib/pundit/types";

const MP3_BITRATE = 128_000; // matches ?output_format=mp3_44100_128

const VOICE_ENV: Record<PunditId, string> = {
  zen: "ELEVENLABS_VOICE_REPORTER",
  gaffer: "ELEVENLABS_VOICE_GAFFER",
  stats: "ELEVENLABS_VOICE_NUMBERS",
  romantic: "ELEVENLABS_VOICE_ROMANTIC",
  doomer: "ELEVENLABS_VOICE_DOOMER",
  banter: "ELEVENLABS_VOICE_WINDUP",
};

function voiceIdFor(punditId: PunditId, candidate: "A" | "B" | "selected" = "selected") {
  const base = VOICE_ENV[punditId];
  const selected = process.env[base];
  const audition = candidate === "selected" ? undefined : process.env[`${base}_${candidate}`];
  const fallback = punditId === "zen" ? process.env.ELEVENLABS_VOICE_ID : undefined;
  const voiceId = audition ?? selected ?? fallback;
  if (!voiceId) throw new Error(`No licensed voice configured for ${punditId} (${base}).`);
  return voiceId;
}

/** Delivery directions are a CONTENT SAFETY surface. The approved script owns
 *  the opinion and the performance plan owns the delivery; writers never emit
 *  TTS tags. The allowlist keeps performance expressive without introducing a
 *  second, unaudited editorial layer or enabling impersonation-style prompts. */
export const TAG_ALLOWLIST = new Set([
  "measured",
  "dry",
  "flat",
  "slower",
  "warmer",
  "wry",
  "matter of fact",
  "quietly",
  "resigned",
  "thoughtful",
  "curious",
  "excited",
  "sarcastic",
  "mischievously",
]);

// ------------------------------------------------------- numbers to words

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ORDINAL_ONES: Record<string, string> = {
  one: "first",
  two: "second",
  three: "third",
  five: "fifth",
  eight: "eighth",
  nine: "ninth",
  twelve: "twelfth",
};

export function intToWords(n: number): string {
  if (n < 0) return "minus " + intToWords(-n);
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const r = n % 10;
    return r ? `${t} ${ONES[r]}` : t;
  }
  if (n < 1000) {
    const hundreds = `${ONES[Math.floor(n / 100)]} hundred`;
    const r = n % 100;
    return r ? `${hundreds} ${intToWords(r)}` : hundreds;
  }
  return String(n);
}

function ordinalWords(n: number): string {
  const w = intToWords(n);
  const parts = w.split(" ");
  const last = parts[parts.length - 1];
  if (ORDINAL_ONES[last]) parts[parts.length - 1] = ORDINAL_ONES[last];
  else if (last.endsWith("y")) parts[parts.length - 1] = last.slice(0, -1) + "ieth";
  else parts[parts.length - 1] = last + "th";
  return parts.join(" ");
}

/** Digits to words, so apply_text_normalization can be turned off and no
 *  unaudited second text rewriter sits between the gated script and the audio.
 *  Order matters: percentages and scorelines before bare integers. */
export function speakNumbers(text: string): string {
  let s = text;
  // 62% -> sixty two percent
  s = s.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, d) => `${numToSpoken(d)} percent`);
  // 3-1 -> three one (a scoreline, not a range)
  s = s.replace(
    /\b(\d+)\s*-\s*(\d+)\b/g,
    (_, x, y) => `${intToWords(Number(x))} ${intToWords(Number(y))}`,
  );
  // 76th -> seventy sixth
  s = s.replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, (_, d) => ordinalWords(Number(d)));
  // 2.1 -> two point one
  s = s.replace(
    /\b(\d+)\.(\d+)\b/g,
    (_, a, b) =>
      `${intToWords(Number(a))} point ${String(b)
        .split("")
        .map((c) => ONES[Number(c)])
        .join(" ")}`,
  );
  // bare integers
  s = s.replace(/\b\d+\b/g, (d) => intToWords(Number(d)));
  return s;
}

function numToSpoken(d: string): string {
  if (d.includes(".")) {
    const [a, b] = d.split(".");
    return `${intToWords(Number(a))} point ${b
      .split("")
      .map((c) => ONES[Number(c)])
      .join(" ")}`;
  }
  return intToWords(Number(d));
}

// ------------------------------------------------------------ house cadence

const normSent = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Exactly three tags and one ellipsis beat at fixed positions. A daily format
 *  wants a recognisable rhythm, and a fixed shape removes a class of model
 *  variance. v3 has no SSML break tag; the ellipsis is the documented beat. */
export function applyHouseCadence(spoken: string, magicSpoken: string): string {
  const sents = spoken
    .trim()
    .split(/(?<=[.?!])\s+/)
    .filter(Boolean);
  if (sents.length < 4) return "[measured] " + spoken.trim();
  const magicIdx = magicSpoken ? sents.findIndex((s) => normSent(s) === normSent(magicSpoken)) : -1;
  const beforeMagic = magicIdx > 1 ? magicIdx - 1 : Math.max(1, Math.floor(sents.length * 0.5));
  const out = sents.map((s, i) => {
    if (i === 0) return "[measured] " + s;
    if (i === beforeMagic) return "[slower] " + s;
    if (i === sents.length - 1) return "[warmer] " + s;
    return s;
  });
  out[0] = out[0] + " ...";
  return out.join(" ");
}

const PERSONA_TAGS: Record<
  PunditId,
  { setup: string; evidence: string; verdict: string; punchline: string; close: string }
> = {
  zen: {
    setup: "measured",
    evidence: "matter of fact",
    verdict: "dry",
    punchline: "wry",
    close: "warmer",
  },
  gaffer: {
    setup: "matter of fact",
    evidence: "measured",
    verdict: "dry",
    punchline: "wry",
    close: "resigned",
  },
  stats: {
    setup: "measured",
    evidence: "excited",
    verdict: "thoughtful",
    punchline: "wry",
    close: "warmer",
  },
  romantic: {
    setup: "warmer",
    evidence: "curious",
    verdict: "thoughtful",
    punchline: "wry",
    close: "warmer",
  },
  doomer: {
    setup: "quietly",
    evidence: "measured",
    verdict: "resigned",
    punchline: "dry",
    close: "quietly",
  },
  banter: {
    setup: "mischievously",
    evidence: "matter of fact",
    verdict: "dry",
    punchline: "sarcastic",
    close: "measured",
  },
};

function tagForBeat(punditId: PunditId, beat: PerformanceBeat, index: number, total: number) {
  const tags = PERSONA_TAGS[punditId];
  if (index === total - 1) return tags.close;
  if (beat.pace === "slow" || beat.energy <= 2) return "thoughtful";
  if (beat.intent === "evidence" || beat.intent === "explanation") return tags.evidence;
  if (beat.intent === "verdict" || beat.intent === "prediction" || beat.intent === "receipt") {
    return tags.verdict;
  }
  if (beat.intent === "punchline") return tags.punchline;
  return tags.setup;
}

function applyEmphasis(text: string, emphasis: readonly string[] | undefined) {
  let rendered = text;
  for (const phrase of (emphasis ?? []).slice(0, 3)) {
    const wanted = phrase.trim();
    if (!wanted || wanted.length > 40) continue;
    const index = rendered.toLocaleLowerCase("en-GB").indexOf(wanted.toLocaleLowerCase("en-GB"));
    if (index < 0) continue;
    rendered = `${rendered.slice(0, index)}${rendered.slice(index, index + wanted.length).toUpperCase()}${rendered.slice(index + wanted.length)}`;
  }
  return rendered;
}

function taggedBeatIndexes(plan: readonly PerformanceBeat[]) {
  const indexes = new Set<number>([0, plan.length - 1]);
  for (const intents of [
    ["evidence", "explanation"],
    ["punchline", "verdict", "prediction", "receipt"],
  ] as const) {
    const index = plan.findIndex((beat) => intents.some((intent) => intent === beat.intent));
    if (index >= 0) indexes.add(index);
  }
  return indexes;
}

export function applyPerformanceCadence(
  displayScript: string,
  punditId: PunditId,
  plan?: readonly PerformanceBeat[],
  magicSentence = "",
): string {
  if (!plan?.length) {
    const base = applyHouseCadence(speakNumbers(displayScript.trim()), speakNumbers(magicSentence));
    const houseTags = PERSONA_TAGS[punditId];
    return base
      .replace("[measured]", `[${houseTags.setup}]`)
      .replace("[slower]", `[${houseTags.evidence}]`)
      .replace("[warmer]", `[${houseTags.close}]`);
  }

  const identity = assertPerformanceIdentity(plan, displayScript);
  if (!identity.passed) throw new Error(identity.failure);
  const tagged = taggedBeatIndexes(plan);
  return plan
    .map((beat, index) => {
      const tag = tagForBeat(punditId, beat, index, plan.length);
      const pause =
        (beat.pauseBeforeMs && beat.pauseBeforeMs >= 250) || beat.pace === "slow" ? "... " : "";
      const text = applyEmphasis(speakNumbers(beat.text.trim()), beat.emphasis);
      return `${pause}${tagged.has(index) ? `[${tag}] ` : ""}${text}`;
    })
    .join(" ");
}

export function chunkSpokenForTts(spoken: string, maxCharacters = 4_500): string[] {
  if (maxCharacters < 500) throw new Error("TTS chunk size is too small for stable narration.");
  const chunks: string[] = [];
  let remaining = spoken.trim();
  while (remaining.length > maxCharacters) {
    const window = remaining.slice(0, maxCharacters + 1);
    const boundaries = [
      window.lastIndexOf(". "),
      window.lastIndexOf("? "),
      window.lastIndexOf("! "),
    ];
    let boundary = Math.max(...boundaries);
    if (boundary < Math.floor(maxCharacters * 0.6)) boundary = window.lastIndexOf(" ");
    if (boundary <= 0) throw new Error("Narration contains a TTS segment with no safe boundary.");
    chunks.push(remaining.slice(0, boundary + 1).trim());
    remaining = remaining.slice(boundary + 1).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export const stripTags = (s: string) => s.replace(/\[[^\]]*\]/g, " ").replace(/\.\.\./g, " ");

/** Lowercase, strip punctuation, spell out numerals. Used on BOTH sides of
 *  every comparison so the two sides are always canonicalised identically. */
export function canonWords(text: string): string[] {
  return speakNumbers(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Stripping tags and ellipses from the spoken track must yield exactly the
 *  display script. Since the transform is code this should never fail;
 *  asserting it anyway is what turns "should never" into "cannot". */
export function spokenIdentity(spoken: string, script: string): boolean {
  return canonWords(stripTags(spoken)).join(" ") === canonWords(script).join(" ");
}

export function tagsAllowlisted(spoken: string): boolean {
  const tags = [...spoken.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].trim().toLowerCase());
  return tags.every((t) => TAG_ALLOWLIST.has(t));
}

export const tagBudgetOk = (spoken: string) => (spoken.match(/\[/g) || []).length <= 4;

// ------------------------------------------------------------- fidelity

const NUMBER_WORDS = new Set([
  ...ONES,
  ...TENS.filter(Boolean),
  "hundred",
  "point",
  "percent",
  ...Object.values(ORDINAL_ONES),
  "twentieth",
  "thirtieth",
  "fortieth",
  "fiftieth",
  "sixtieth",
  "seventieth",
  "eightieth",
  "ninetieth",
  "fourth",
  "sixth",
  "seventh",
  "tenth",
  "eleventh",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
]);

const numberSeq = (words: string[]) => words.filter((w) => NUMBER_WORDS.has(w));

/** HARD. Every numeric token of the canonicalised display script must appear in
 *  the transcript, in order. This is what makes it safe to add expressive
 *  delivery: the file that ships is proven to say what the gate approved. */
export function fidelityNumbers(transcript: string, script: string): boolean {
  const want = numberSeq(canonWords(script));
  const got = numberSeq(canonWords(transcript));
  let i = 0;
  for (const g of got) if (i < want.length && g === want[i]) i++;
  return i === want.length;
}

/** HARD. Word error rate, with licensed entity tokens treated as WILDCARDS
 *  because Scribe reliably mangles proper nouns.
 *
 *  The wildcard has to be applied during ALIGNMENT, not by pre-filtering both
 *  sides. Filtering removes "aston villa" from the reference but leaves
 *  Scribe's "ashton viller" in the hypothesis, where it counts as two
 *  insertions: the exact error the wildcard exists to forgive. Instead the
 *  reference keeps its entity tokens, and a substitution or deletion is free
 *  when the REFERENCE token is an entity, so any hypothesis word may stand in
 *  for a name (or a merged "astonvilla" may cover two of them). Insertions
 *  still cost, so a transcript that invents extra prose is still caught. */
export function fidelityWer(transcript: string, script: string, entities: string[]): number {
  const wild = new Set(entities.flatMap((e) => canonWords(e)));
  const ref = canonWords(script);
  const hyp = canonWords(transcript);
  if (!ref.length) return 0;
  const scored = ref.filter((w) => !wild.has(w)).length || ref.length;

  let prev = Array.from({ length: hyp.length + 1 }, (_, i) => i);
  for (let i = 1; i <= ref.length; i++) {
    const refIsWild = wild.has(ref[i - 1]);
    const cur = [refIsWild ? prev[0] : prev[0] + 1];
    for (let j = 1; j <= hyp.length; j++) {
      const subCost = ref[i - 1] === hyp[j - 1] || refIsWild ? 0 : 1;
      cur[j] = Math.min(
        prev[j] + (refIsWild ? 0 : 1), // deletion of a name is free
        cur[j - 1] + 1, // insertion always costs
        prev[j - 1] + subCost,
      );
    }
    prev = cur;
  }
  return prev[hyp.length] / scored;
}

// --------------------------------------------------------------- the API

function crc32(s: string): number {
  let c = ~0;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) & 0xff;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

async function tts(
  spoken: string,
  modelId: string,
  seed: number,
  apiKey: string,
  voiceId: string,
  pronunciationDictionaryLocators: Array<{
    pronunciation_dictionary_id: string;
    version_id: string;
  }> = [],
): Promise<Uint8Array> {
  const body: Record<string, unknown> = {
    text: spoken,
    model_id: modelId,
    // Never 0.0 (Creative): documented as prone to hallucination, and a
    // hallucinating TTS can utter a word the gate never approved. That is a
    // fact risk, not a taste risk. Never 1.0 (Robust) either: documented as
    // less responsive to direction, which removes the reason to be on v3.
    voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    seed,
  };
  if (pronunciationDictionaryLocators.length) {
    body.pronunciation_dictionary_locators = pronunciationDictionaryLocators;
  }
  // v3 verifiably ignores style / speed / use_speaker_boost, so they are not
  // sent. v2 is the fallback and does use style.
  if (modelId === "eleven_v3") body.apply_text_normalization = "off";
  else
    body.voice_settings = {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    };

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!res.ok)
    throw new Error(`ElevenLabs ${modelId} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function transcribe(audio: Uint8Array, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([audio as BlobPart], { type: "audio/mpeg" }), "episode.mp3");
  form.append("model_id", "scribe_v1");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Scribe ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const d = (await res.json()) as { text?: string };
  return d.text ?? "";
}

/** Minimum monthly character capacity the plan must expose before narration
 *  starts. TTS_MONTHLY_CHARACTER_CAPACITY is optional; when unset or zero the
 *  only protection is the retry reserve below. */
export function monthlyCapacityFloor(env: NodeJS.ProcessEnv = process.env) {
  const value = Number(env.TTS_MONTHLY_CHARACTER_CAPACITY ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Fails closed when the plan is below the configured floor or cannot afford
 *  three takes of the requested script plus a margin. */
export function quotaShouldStop(input: {
  used: number;
  limit: number;
  requestedCharacters: number;
  floor: number;
}) {
  const remaining = Math.max(0, input.limit - input.used);
  const retryReserve = input.requestedCharacters * 3 + 10_000;
  return { remaining, stop: input.limit < input.floor || remaining < retryReserve };
}

/** Quota tripwire for six full variants plus retries. */
async function quotaState(
  apiKey: string,
  requestedCharacters: number,
): Promise<{ used: number; limit: number; remaining: number; stop: boolean }> {
  const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
    headers: { "xi-api-key": apiKey },
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    throw new Error(`ElevenLabs capacity verification failed (${r.status}).`);
  }
  const d = (await r.json()) as { character_count?: number; character_limit?: number };
  if (!Number.isFinite(d.character_count) || !Number.isFinite(d.character_limit)) {
    throw new Error("ElevenLabs capacity response is incomplete.");
  }
  const used = d.character_count!;
  const limit = d.character_limit!;
  const { remaining, stop } = quotaShouldStop({
    used,
    limit,
    requestedCharacters,
    floor: monthlyCapacityFloor(),
  });
  if (stop) {
    console.warn(`[narrate] quota gate: used=${used} limit=${limit} remaining=${remaining}`);
  }
  return { used, limit, remaining, stop };
}

export type NarrationResult = {
  audio: Uint8Array;
  spokenScript: string;
  ttsModel: string;
  ttsSeed: number;
  ttsVoiceId: string;
  ttsSegments: number;
  durationSec: number;
  fidelity: { wer: number; numbers: boolean; transcript: string };
};

export type NarrationOptions = {
  punditId?: PunditId;
  performancePlan?: readonly PerformanceBeat[];
  voiceCandidate?: "A" | "B" | "selected";
  voiceId?: string;
  pronunciationDictionaryLocators?: Array<{
    pronunciation_dictionary_id: string;
    version_id: string;
  }>;
};

/** The ladder: v3, v3, then eleven_multilingual_v2 once, then fail closed.
 *  It cannot loop, so an episode costs at most 3 takes. */
export async function narrate(
  displayScript: string,
  magicSentence: string,
  matchId: string,
  entities: string[] = [],
  options: NarrationOptions = {},
): Promise<NarrationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");
  const punditId = options.punditId ?? "zen";
  const voiceId = options.voiceId ?? voiceIdFor(punditId, options.voiceCandidate);

  const q = await quotaState(apiKey, displayScript.length);
  if (q.stop)
    throw new Error(
      `ElevenLabs capacity gate failed: used=${q.used}, limit=${q.limit}, remaining=${q.remaining}`,
    );

  const spokenScript = applyPerformanceCadence(
    displayScript.trim(),
    punditId,
    options.performancePlan,
    magicSentence,
  );

  // Pre-flight, before a single character is spent.
  if (!tagsAllowlisted(spokenScript))
    throw new Error("narration: a delivery tag is not on the allowlist");
  if (!tagBudgetOk(spokenScript)) throw new Error("narration: tag budget exceeded");
  if (!spokenIdentity(spokenScript, displayScript)) {
    throw new Error("narration: spoken_script does not canonicalise to the gated display script");
  }

  const seed = crc32(matchId) % 4_294_967_295;
  const ladder = ["eleven_v3", "eleven_v3", "eleven_multilingual_v2"];
  let lastErr: unknown;

  for (const modelId of ladder) {
    try {
      const providerScript =
        modelId === "eleven_v3" ? spokenScript : spokenScript.replace(/\[[^\]]*\]/g, " ");
      const chunks = chunkSpokenForTts(providerScript);
      const segments: Uint8Array[] = [];
      for (const chunk of chunks) {
        segments.push(
          await tts(chunk, modelId, seed, apiKey, voiceId, options.pronunciationDictionaryLocators),
        );
      }
      const audio = await concatenateNarrationMp3({ segments });
      let transcript: string;
      let wer: number;
      let numbersOk: boolean;
      try {
        transcript = await transcribe(audio, apiKey);
        numbersOk = fidelityNumbers(transcript, displayScript);
        wer = fidelityWer(transcript, displayScript, entities);
      } catch (e) {
        lastErr = new Error(`fidelity verification unavailable: ${String(e)}`);
        continue;
      }
      if (!numbersOk) {
        lastErr = new Error("fidelity_numbers failed");
        continue;
      }
      if (wer > 0.05) {
        lastErr = new Error(`fidelity_wer ${wer.toFixed(3)} > 0.05`);
        continue;
      }
      return finish(audio, spokenScript, modelId, seed, voiceId, chunks.length, {
        wer,
        numbers: numbersOk,
        transcript,
      });
    } catch (e) {
      lastErr = e;
      console.warn(`[narrate] ${modelId} take failed:`, e);
    }
  }
  throw new Error(`narration failed closed after ${ladder.length} takes: ${String(lastErr)}`);
}

function finish(
  audio: Uint8Array,
  spokenScript: string,
  ttsModel: string,
  ttsSeed: number,
  ttsVoiceId: string,
  ttsSegments: number,
  fidelity: { wer: number; numbers: boolean; transcript: string },
): NarrationResult {
  return {
    audio,
    spokenScript,
    ttsModel,
    ttsSeed,
    ttsVoiceId,
    ttsSegments,
    // This pre-mastering estimate is never published. FFmpeg measures the
    // mastered asset duration before it reaches the variant or RSS record.
    durationSec: Math.round((audio.byteLength * 8) / MP3_BITRATE),
    fidelity,
  };
}
