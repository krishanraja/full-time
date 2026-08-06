// Server-only. The Full Time recap engine.
//
// Deterministic fact pack from match_events + match_stats + pre-computed
// enrichment clauses -> Opus writer conditioned on the voice corpus -> a
// deterministic code gate -> a claim-scoped Sonnet judge -> up to 5 surgical
// regens, failing closed. Accuracy is guaranteed by construction, never by a
// prompt instruction.
//
// THE LICENCE SYSTEM is what pays for enrichment. A richer fact pack opens new
// degrees of freedom for the model, and every one of them is closed here by a
// matching deterministic check:
//
//   numeric_licence      every digit must come from the fact pack or the ONE
//                        declared angle. The model may not calculate.
//   spelled_numerals     the same, for quantities spelled as words.
//   consequence_licence  no relegation / survival / title / qualification
//                        lexeme unless the declared clause contains it. This is
//                        the check that blocks a cross-match causal claim, the
//                        failure mode that disqualified the whole web tier.
//   entity_licence       every proper noun must be in this match's data.
//
// CLASS H blocks forever. CLASS Q (taste) blocks on attempts 1 and 2 and goes
// advisory from attempt 3, because a rhythm rule must never kill the day's drop.

import type { Angle } from "@/lib/api/angles.server";

export type MatchInfo = {
  homeId: string;
  awayId: string;
  homeName: string;
  homeShort: string;
  awayName: string;
  awayShort: string;
  leagueName: string;
  homeScore: number;
  awayScore: number;
};
export type EventRow = {
  minute: number | null;
  added_time: number | null;
  type: string;
  team_id: string | null;
  player_id: string | null;
  player_name: string | null;
  assist_player_id: string | null;
  detail: string | null;
};
export type StatRow = {
  home_possession: number | null;
  away_possession: number | null;
  home_shots: number | null;
  away_shots: number | null;
  home_sot: number | null;
  away_sot: number | null;
  home_xg: number | null;
  away_xg: number | null;
  home_corners: number | null;
  away_corners: number | null;
  home_blocked?: number | null;
  away_blocked?: number | null;
  home_saves?: number | null;
  away_saves?: number | null;
  home_fouls?: number | null;
  away_fouls?: number | null;
  home_offsides?: number | null;
  away_offsides?: number | null;
} | null;
export type CorpusRow = {
  kind: string;
  content: string;
  match_type?: string | null;
  weight?: number | null;
};

export type RecapResult = {
  ok: boolean;
  title: string;
  script: string;
  magic_sentence: string;
  referenced_scorers: string[];
  used_angle: string;
  offered_angles: string[];
  attempts: number;
  judge: unknown;
  checks: Record<string, boolean>;
  /** Per-attempt record of what blocked, for observability and for tuning the
   *  gate. Without this, a high retry rate is invisible: the stored `checks`
   *  only ever describe the attempt that finally passed. */
  attempt_log: Array<{ attempt: number; failed: string[]; judge: string[] }>;
  quality_relaxed: string[];
  name_license_mode: string;
};

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The three phrases the founder has banned outright. */
const CLICHE = /(draw your own conclusions|not drawing them for you|table does not ask)/i;

/** Any word that asserts a season-level consequence. Forbidden unless the exact
 *  lexeme appears in the declared angle clause. On matchday 1 there is no
 *  table, so during the launch window nothing licenses these at all.
 *
 *  The "sends them down" / "going down" family is NOT in the original design's
 *  regex, which listed only "went down". That is the single most idiomatic way
 *  an English recap states relegation, and the design's own adversarial case
 *  ("that sends them down") sailed through the check it was written to fail.
 *  Added here, with the verb tied to "down" so an ordinary "2-0 down" is not
 *  caught. */
const CONSEQUENCE =
  /\b(relegat\w*|stay(?:ed|s|ing)? up|(?:went|go|goes|going|sends?|sent)\s+(?:\w+\s+){0,3}down|survival|survived|safety|clinch\w*|seal\w*|secur\w*|confirm\w*|guarantee\w*|qualif\w*|title|champions?|Europa|European (?:place|football|spot)|top four|play-?offs?)\b/gi;

/** Spelled quantities that must still be covered by the numeric licence.
 *  `one`, `once` and `single` are excluded as too idiomatic, and 1 is licensed
 *  by default anyway. Matched as exact whole words, so "doubled the lead" is
 *  not treated as the numeral 2. */
const SPELLED: Record<string, number> = {
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
  // ten, eleven and twelve are deliberately NOT here, for the same reason the
  // design excludes "one", "once" and "single": in football prose they are
  // overwhelmingly clock phases ("inside the first ten minutes"), squad
  // references ("the starting eleven") or "ten men", none of which is an
  // invented statistic. Leaving them in dropped an episode that said "two
  // goals inside the first ten minutes", which is both true and unremarkable.
  // The dodge this check exists to close is spelling out a small COUNT to
  // evade the digit check, and two through nine covers that. A genuine
  // statistic written as digits is still caught by numeric_licence.
};
const SPELLED_RE = new RegExp(
  `\\b(${Object.keys(SPELLED)
    .map((k) => k.replace("-", "[- ]?"))
    .join("|")})\\b`,
  "gi",
);

/** Words that get capitalised in ordinary prose and are not proper nouns. */
const NAME_STOPWORDS = new Set(
  (
    "the a an and but or so yet for nor if then than that this these those he she they it his her their its " +
    "there here when where what who whom which why how while after before during since until at in on by " +
    "with from into over under between both all each every no not only just still even now once again " +
    "var fa uefa fifa premier league first second third half time full stop end start goal goals minute " +
    "minutes penalty corner offside foul card yellow red sunday monday tuesday wednesday thursday friday " +
    "saturday january february march april may june july august september october november december"
  ).split(" "),
);

function extractJson(s: string): Record<string, unknown> {
  const t = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const a = t.indexOf("{");
  if (a < 0) throw new Error("no json");
  let depth = 0,
    inStr = false,
    esc = false;
  for (let i = a; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(t.slice(a, i + 1));
    }
  }
  throw new Error("unbalanced json");
}

async function llm(
  system: string,
  user: string,
  model: string,
  max: number,
  key: string,
): Promise<Record<string, unknown>> {
  let lastErr: unknown;
  for (let i = 0; i < 5; i++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: max,
        system,
        messages: [
          { role: "user", content: user + (i ? "\n\nRespond with ONLY the JSON object." : "") },
        ],
      }),
    });
    if (!r.ok) {
      const b = await r.text();
      if ([429, 500, 502, 503, 529].includes(r.status) && i < 4) {
        await sleep(2500 * (i + 1));
        continue;
      }
      throw new Error("llm " + r.status + " " + b.slice(0, 140));
    }
    const d = (await r.json()) as { content: Array<{ text: string }> };
    try {
      return extractJson(d.content[0].text);
    } catch (e) {
      lastErr = e;
      await sleep(400);
    }
  }
  throw lastErr || new Error("llm exhausted");
}

// -------------------------------------------------------------- the licence

/** Every number the writer is allowed to state. Anything else is an invention,
 *  including a number it derived correctly: a correct derivation today is an
 *  incorrect one tomorrow, and neither is verifiable. */
export function licensedNumbers(
  m: MatchInfo,
  goals: EventRow[],
  cards: EventRow[],
  st: StatRow,
  offered: Angle[],
  used: string,
): Set<number> {
  const s = new Set<number>([
    0,
    1,
    45,
    90,
    m.homeScore,
    m.awayScore,
    m.homeScore + m.awayScore,
    cards.length,
  ]);
  // Every integer from 0 up to the number of goals in this match. These are
  // COUNTING numbers, not statistics: "he added two more" in a 5-goal game is
  // something a listener can verify by counting, and it is the natural way
  // football is written. What this check exists to stop is an INVENTED
  // STATISTIC ("their 47th win of the season", "26 shots"), and any such number
  // is either far above the goal total or simply absent from the fact pack, so
  // it is still caught. Without this a hat-trick recap is close to unwritable:
  // "scored the first, then added two more" was blocked on five consecutive
  // attempts and dropped the episode.
  for (let i = 0; i <= m.homeScore + m.awayScore; i++) s.add(i);
  for (const g of goals) {
    if (g.minute != null) {
      s.add(g.minute);
      if (g.added_time) s.add(g.minute + g.added_time);
    }
  }
  for (const c of cards) if (c.minute != null) s.add(c.minute);
  if (st) {
    for (const v of [
      st.home_possession,
      st.away_possession,
      st.home_shots,
      st.away_shots,
      st.home_sot,
      st.away_sot,
      st.home_corners,
      st.away_corners,
      st.home_xg,
      st.away_xg,
    ]) {
      if (v != null) s.add(Number(v));
    }
  }
  if (used && used !== "none") {
    const a = offered.find((x) => x.id === used);
    if (a) for (const n of a.numbers) s.add(n);
  }
  return s;
}

/** Proper-noun phrases in the script, minus sentence-initial single tokens and
 *  ordinary capitalised words. Deliberately lossy: a missed phrase costs
 *  coverage, a false positive costs a wasted attempt. */
export function properNouns(script: string): string[] {
  const sentences = script.split(/(?<=[.?!])\s+/);
  const out: string[] = [];
  for (const sent of sentences) {
    const re = /\b[A-Z][a-zA-Z'’-]*(?:\s+(?:[A-Z][a-zA-Z'’-]*|of|de|van|der|del))*/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(sent))) {
      const phrase = mm[0].trim();
      const isSentenceInitial = mm.index === 0;
      const single = !/\s/.test(phrase);
      if (isSentenceInitial && single) continue; // just capitalisation
      if (single && NAME_STOPWORDS.has(norm(phrase))) continue;
      // A leading initial like "O. Watkins" survives; a bare stopword does not.
      if (NAME_STOPWORDS.has(norm(phrase))) continue;
      out.push(phrase);
    }
  }
  return out;
}

const fuzzyEq = (a: string, b: string) => {
  const A = norm(a),
    B = norm(b);
  if (!A || !B) return false;
  return A.includes(B) || B.includes(A) || A.split(" ").pop() === B.split(" ").pop();
};

// ---------------------------------------------------------------- the gate

export type GateInput = {
  out: Record<string, unknown>;
  m: MatchInfo;
  goals: EventRow[];
  cards: EventRow[];
  st: StatRow;
  offered: Angle[];
  allowed: string[];
  licensedEntities: string[];
  realScore: string;
  totalGoals: number;
  attempt: number;
  nameLicenseMode: string;
};

export type GateResult = {
  checks: Record<string, boolean>;
  failed: string[];
  hardFailed: string[];
  softFailed: string[];
  relaxed: string[];
  codePass: boolean;
  detail: {
    unlicensedNumbers: number[];
    unlicensedSpelled: number[];
    unlicensedConsequences: string[];
    unlicensedNames: string[];
  };
};

/** The deterministic code gate, as a pure function of the model output and the
 *  match data. Extracted so the adversarial set can be run in full without
 *  spending a single Anthropic or ElevenLabs token: a fail-closed guarantee
 *  that is expensive to test is a guarantee that stops being tested. */
export function runGate(input: GateInput): GateResult {
  const {
    out,
    m,
    goals,
    cards,
    st,
    offered,
    allowed,
    licensedEntities,
    realScore,
    totalGoals,
    attempt,
    nameLicenseMode,
  } = input;

  const script = String(out.script ?? "");
  const magic = String(out.magic_sentence ?? "");
  const usedAngle = String(out.used_angle ?? "none") || "none";
  const usedClause = offered.find((x) => x.id === usedAngle)?.clause ?? "";

  const words = script.trim().split(/\s+/).filter(Boolean).length;
  const sentences = script
    .trim()
    .split(/(?<=[.?!])\s+/)
    .filter(Boolean);
  const sentenceWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const numericTokens = (s: string) => (s.match(/\d+(?:\.\d+)?/g) || []).length;

  // Repaired: the old detector matched only "2-1", but live scripts open
  // "Sevilla 1, Barcelona 2.", so scoreCount was almost always 0 and the check
  // was vacuous.
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dashForm = new RegExp(`\\b${m.homeScore}\\s*-\\s*${m.awayScore}\\b`, "g");
  const nameForm = new RegExp(
    `${esc(m.homeName)}\\s+${m.homeScore}\\s*,\\s*${esc(m.awayName)}\\s+${m.awayScore}`,
    "gi",
  );
  const scoreCount = (script.match(dashForm) || []).length + (script.match(nameForm) || []).length;
  // Widened from \d{1,2} so a 102nd minute is caught.
  const minutesUsed: string[] = script.match(/\b(\d{1,3})(st|nd|rd|th)\b/g) || [];
  const bothScored = m.homeScore > 0 && m.awayScore > 0;
  const refScorers = (out.referenced_scorers as string[]) || [];

  // --- numeric licence
  const licensed = licensedNumbers(m, goals, cards, st, offered, usedAngle);
  const written = [...script.matchAll(/\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));
  const unlicensedNumbers = written.filter((n) => !licensed.has(n));

  // --- spelled numerals
  SPELLED_RE.lastIndex = 0;
  const spelled = [...script.matchAll(SPELLED_RE)]
    .map((x) => SPELLED[x[1].toLowerCase().replace(/\s/g, "-")] ?? SPELLED[x[1].toLowerCase()])
    .filter((n): n is number => n != null);
  const unlicensedSpelled = spelled.filter((n) => !licensed.has(n));

  // --- consequence lexemes
  CONSEQUENCE.lastIndex = 0;
  const consequences = [...script.matchAll(CONSEQUENCE)].map((x) => x[0]);
  const unlicensedConsequences = consequences.filter(
    (t) => !usedClause || !norm(usedClause).includes(norm(t)),
  );

  // --- entity licence
  const unlicensedNames = properNouns(script).filter(
    (p) => !licensedEntities.some((e) => fuzzyEq(e, p)),
  );

  const magicIdx = magic ? norm(script).indexOf(norm(magic)) : -1;
  const magicPos = magicIdx >= 0 && norm(script).length ? magicIdx / norm(script).length : -1;

  const checks: Record<string, boolean> = {
    // ---- Class H: accuracy and safety. Never relaxes.
    score: out.stated_score === realScore,
    goalsConsistent: goals.length === totalGoals, // retained for the record
    scorers: refScorers.every((n) => allowed.some((x) => fuzzyEq(x, n))),
    length_ok: words >= 90 && words <= 150,
    no_every_goal: !(
      bothScored &&
      /(scored|netted) (every|all|all six|all five|all four|all three|both) (the )?goals?/i.test(
        script,
      )
    ),
    noDash: !/[—–]/.test(script),
    noCliche: !CLICHE.test(script),
    angle_id_valid: usedAngle === "none" || offered.some((x) => x.id === usedAngle),
    numeric_licence: unlicensedNumbers.length === 0,
    spelled_numerals_licensed: unlicensedSpelled.length === 0,
    consequence_lexeme_licensed: unlicensedConsequences.length === 0,
    entity_licence: nameLicenseMode === "enforce" ? unlicensedNames.length === 0 : true,
    no_brackets: !/[[\]]/.test(script),
    // Strip the licensed club and competition names before testing for
    // shouting. "FSV Mainz 05" is a club, not emphasis: it failed this check on
    // two separate attempts and helped drop an episode on the golden set.
    no_caps_emphasis: !/\b[A-Z]{3,}\b/.test(
      licensedEntities
        .reduce((acc, e) => acc.split(e).join(" "), script)
        .replace(/\b(VAR|FA|UEFA|FIFA)\b/g, ""),
    ),
    magic_verbatim: !!magic && norm(script).includes(norm(magic)),

    // ---- Class Q: taste. Advisory from attempt 4.
    no_score_repeat: scoreCount <= 1,
    no_minute_repeat: !minutesUsed.some((x, i) => minutesUsed.indexOf(x) !== i),
    // Band widened from the design's [0.50, 0.85] to [0.45, 0.90]. The design
    // derived that band from five hand-authored founder scripts measured at
    // 0.31, 0.61, 0.59, 0.53 and 0.54, so [0.50, 0.85] rejects the founder's
    // own writing one time in five: it is stricter than the human standard it
    // was calibrated against. On the golden set it also rejected a script at
    // 0.86, one hundredth outside. The rule's real job is to stop the model
    // front-loading its best line into the opening third, which [0.45, 0.90]
    // still does: the model's untreated positions measured 0.22, 0.30 and 0.33.
    magic_position: magicPos < 0 ? false : magicPos >= 0.45 && magicPos <= 0.9,
    sentence_max: sentences.every((s) => sentenceWords(s) <= 26),
    sentence_short: sentences.filter((s) => sentenceWords(s) < 8).length >= 2,
    numeric_budget: numericTokens(sentences.slice(1).join(" ")) <= 4,
    no_stat_run: !sentences.some(
      (_, i) =>
        i + 2 < sentences.length &&
        numericTokens(sentences[i]) > 0 &&
        numericTokens(sentences[i + 1]) > 0 &&
        numericTokens(sentences[i + 2]) > 0,
    ),
  };

  if (nameLicenseMode !== "enforce" && unlicensedNames.length) {
    // Shadow mode: log candidates so the false-positive rate can be measured
    // before the check is ever allowed to block anything.
    console.warn("[gate] entity_licence SHADOW flagged:", JSON.stringify(unlicensedNames));
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const hardFailed = failed.filter((k) => !QUALITY_KEYS.has(k));
  const softFailed = failed.filter((k) => QUALITY_KEYS.has(k));
  // A taste rule must never kill the day's drop. Taste blocks on attempts 1 and
  // 2, which is where nearly all of the corrective value is, then goes
  // advisory. The design said attempt 4; measurement on the clean golden set
  // put mean attempts at 3.0 with magic_position alone causing 6 of 17 retry
  // failures, which is the >2.0 trigger the design itself names as the signal
  // to relax taste earlier.
  const relaxNow = attempt >= 3;

  return {
    checks,
    failed,
    hardFailed,
    softFailed,
    relaxed: relaxNow ? softFailed : [],
    codePass: hardFailed.length === 0 && (relaxNow || softFailed.length === 0),
    detail: { unlicensedNumbers, unlicensedSpelled, unlicensedConsequences, unlicensedNames },
  };
}

// ------------------------------------------------------------ the feedback

const FEEDBACK: Record<string, string> = {
  numeric_licence:
    "You used a number that is not in the fact pack. Every number must be copied from the fact pack or from the one angle you declared. Do not calculate anything.",
  spelled_numerals_licensed:
    "You spelled out a quantity that is not in the fact pack. Use only quantities that are given to you.",
  consequence_lexeme_licensed:
    "You said something about relegation, survival, titles, qualification, or European places. You do not know the other results. Remove it.",
  entity_licence:
    "You named someone or something that is not in this match. Only the two clubs, the competition, and the players listed may be named.",
  angle_id_valid: "used_angle must be the exact id of one of the offered angles, or the word none.",
  magic_verbatim: "magic_sentence must be copied word for word from your script.",
  magic_position:
    "Move your sharpest sentence to roughly 60 percent of the way through, not the opening third.",
  sentence_max: "One of your sentences runs past 26 words. Break it.",
  sentence_short: "Add at least two short sentences, under 8 words. The rhythm is flat.",
  numeric_budget:
    "Too many numbers after the opening line. Keep at most 4 in the whole piece. This is a story, not a stat sheet.",
  no_stat_run: "Three sentences in a row contain numbers. Break them up with prose.",
  no_brackets: "Remove all square brackets. Write plain sentences.",
  no_caps_emphasis: "Remove capitalised emphasis.",
  length_ok: "Your script is outside 105 to 135 words.",
  score: "stated_score must be exactly the real final score, home then away.",
  scorers: "referenced_scorers must contain only players who actually scored in this match.",
  no_score_repeat: "You stated the scoreline more than once. State each fact once.",
  no_minute_repeat: "You used the same minute twice.",
  no_every_goal: "Both teams scored, so no one 'scored all the goals'.",
  noDash: "No em dashes or en dashes. Use periods and commas.",
  noCliche: "You used a banned house phrase. Write it fresh.",
};

/** Which checks are taste rather than accuracy. These relax after attempt 3. */
const QUALITY_KEYS = new Set([
  "no_score_repeat",
  "no_minute_repeat",
  "magic_position",
  "sentence_max",
  "sentence_short",
  "numeric_budget",
  "no_stat_run",
]);

// ------------------------------------------------------------------ writer

export type GenerateOpts = {
  angles?: Angle[];
  context?: string[];
  matchType?: string | null;
};

export async function generateRecap(
  m: MatchInfo,
  events: EventRow[],
  st: StatRow,
  corpus: CorpusRow[],
  opts: GenerateOpts = {},
): Promise<RecapResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  // Do NOT bump to claude-opus-5 during the launch window: it has thinking ON
  // by default and max_tokens caps thinking plus text together, so max 900
  // truncates the JSON. Stay on 4-8 through 2026-09-30.
  const WRITER_MODEL = process.env.WRITER_MODEL || "claude-opus-4-8";
  const JUDGE_MODEL = process.env.JUDGE_MODEL || "claude-sonnet-4-6";
  const NAME_LICENSE_MODE = process.env.NAME_LICENSE_MODE || "shadow";

  const offered = (opts.angles ?? []).slice(0, 4);

  // ---- corpus assembly (T12). Deterministic ordering: without it Postgres
  // returns rows in whatever order it likes and two identical runs differ.
  //
  // Rows carrying a banned house phrase are DROPPED here rather than allowed to
  // reach the model. voice_corpus is founder-editable and several live rows
  // quote the banned phrases as worked examples ("State your observation, then
  // retreat. 'Draw your own conclusions...'"). Feeding the model a phrase the
  // gate rejects costs attempts and can fail an episode closed.
  const poisoned = corpus.filter((c) => CLICHE.test(c.content));
  if (poisoned.length) {
    console.warn(
      `[corpus] dropped ${poisoned.length} row(s) containing a banned house phrase: ` +
        JSON.stringify(poisoned.map((c) => `${c.kind}:${c.content.slice(0, 60)}`)),
    );
  }
  const clean = corpus.filter((c) => !CLICHE.test(c.content));
  const pick = (kind: string) =>
    clean
      .filter((c) => c.kind === kind)
      .sort(
        (a, b) => Number(b.weight ?? 0) - Number(a.weight ?? 0) || (a.content < b.content ? -1 : 1),
      );

  // Pack WHOLE rows only, and keep going after one does not fit rather than
  // stopping. The old behaviour joined every style_rule and took `.slice(0,
  // 1300)`, which delivered 8 percent of the founder's 15,754 characters of
  // voice doctrine, cut the first row off mid-sentence, and dropped all ten
  // SCREENSHOT-SAFE brand-safety rules entirely. A half-sentence of doctrine is
  // worse than no sentence, and the short safety rules are the highest value
  // per character in the corpus.
  //
  // Shortest-first ordering is deliberate: it fits many complete rules instead
  // of one truncated essay. Weight still leads, so the founder can promote any
  // row by raising its weight.
  const pack = (rows: CorpusRow[], budget: number, bullet: boolean) => {
    const out: string[] = [];
    let used = 0;
    for (const r of [...rows].sort(
      (a, b) =>
        Number(b.weight ?? 0) - Number(a.weight ?? 0) || a.content.length - b.content.length,
    )) {
      if (used + r.content.length > budget) continue; // skip, do not stop
      out.push(bullet ? "- " + r.content : r.content);
      used += r.content.length;
    }
    return out.join("\n");
  };
  // 9000 is about 2,250 tokens, roughly $0.011 per attempt, and it is the
  // cheapest quality lever in the pipeline. It fits all ten SCREENSHOT-SAFE
  // rules, the load-bearing calm-voice principle and the humour doctrine with
  // its four mechanics, while still excluding the two longest rows, which are
  // architecture notes ABOUT the corpus system rather than instructions to the
  // writer ("THE PRINCIPLE: the voice must NOT live in a hardcoded LLM prompt",
  // and a Nielsen Norman tone-dimension analysis). Sending those would spend
  // tokens telling the model how the pipeline is built.
  const persona = pack(pick("style_rule"), 9000, false);
  const examples = pick("example")
    .slice(0, 8)
    .map((c) => "- " + c.content)
    .join("\n");
  // 53 do/dont rows used to be fetched and silently discarded entirely.
  const dos = pack(pick("do"), 900, true);
  const donts = pack(pick("dont"), 900, true);
  const perType = opts.matchType
    ? (corpus.find((c) => c.kind === "per_match_type" && c.match_type === opts.matchType)
        ?.content ?? "")
    : "";

  const WRITER = `You are FULL TIME, a daily football recap read aloud by a calm broadcaster. Calm delivery, sharp writing.

VOICE (persona):
${persona}

DO:
${dos}

DO NOT:
${donts}
${perType ? `\nTHIS KIND OF MATCH:\n${perType}\n` : ""}
EXAMPLE LINES (register only, never copy):
${examples}

THE FACTS: scorer_summary lists exactly how many goals each team scored and who scored them. goal_log gives them in order with the running score. These are the truth.

THE ANGLES: the angles array holds facts we have already proved from the match data. Each one is a finished English statement. You may use AT MOST ONE of them, and you must name which one in used_angle. You may rephrase it in your own voice. You may not combine two. You may not use a number, a name or a claim from an angle you did not declare. If none of them fits, set used_angle to "none" and write the match without one. Writing without an angle is always allowed and is better than forcing one.

YOUR JOB: write ONE flowing recap in the Full Time voice. Get the WINNER and the FINAL SCORE exactly right. You do NOT need to mention every goal; name only the decisive or notable ones. Never say a team "scored every goal" or "all the goals" unless scorer_summary shows the other team scored zero. Never credit a goal to the wrong team.

RULES:
1. 105 to 135 words, one continuous piece. Brevity is the product.
2. Open with the result in one clean line. Tell the story that decided it. Land ONE sharp observation about 60 percent of the way through. Close with one short forward line. That closing line must name NO opponent, NO date and NO competition: you do not know the fixture list. "They go again" is right. "They travel to Anfield on Saturday" is forbidden.
3. State each fact once. No repetition of a scoreline, scorer, minute, or stat.
4. ONE angle, the most interesting TRUE one. Do not list multiple stats. Vary across matches. Do not default to "xG vs scoreline".
5. NEVER use "draw your own conclusions", "we are not drawing them for you", or "the table does not ask how you felt".
6. An own goal: the named player turned it into his own net; it counts for the OTHER team (scorer_summary already shows the correct team). A penalty: say so.
7. Stats are full-match unless a minute is given. No invented sweeping claims.
8. Calm, dry, identity-safe (mock the game or the situation, never a club, player, or manager). No exclamation marks. No em dashes (periods and commas). No emoji. Numbers as digits.
9. EVERY NUMBER you write must come from this fact pack or from the one angle you declared. Do not compute a new number. Do not add, subtract, average, or convert. Do not state a percentage that is not printed above.
10. EVERY NAME you write must be a team, player or competition that appears in this fact pack. No manager, no referee, no pundit, no other club.
11. Say NOTHING about relegation, survival, staying up, going down, titles, champions, European qualification, the top four, play-offs, or what this result means for the season, unless those exact words appear in the angle you declared. You do not know the other results from today. Never imply you do.
12. Say nothing about transfers, contracts, injuries, a manager's job, refereeing decisions, betting, or anything political.
13. Your script is the on-screen transcript AND it is read aloud. Write plain sentences only. No square brackets, no stage directions, no ellipses, no ALL CAPS for emphasis. Delivery direction is added by the system afterwards, not by you.
14. Longest sentence 26 words. Include at least two sentences shorter than 8 words. After the opening line, use at most 4 numbers in the whole script, and never put numbers in three sentences in a row.`;

  // RISK 11: voice_corpus is founder-editable and feeds the prompt with no gate.
  //
  // This used to THROW when a banned phrase reached the prompt, which was the
  // wrong response to the wrong risk. A banned phrase in the corpus is a TASTE
  // problem: the output-side noCliche check already guarantees it can never
  // ship, so throwing converted a taste problem into a total outage that would
  // drop every match of the day. Offending rows are now filtered out at
  // assembly (above) and logged, so the day still ships.
  //
  // This was not theoretical. Four live rows quote the banned phrases as worked
  // examples, including a `do` rule reading "State your observation, then
  // retreat. 'Draw your own conclusions. We are not drawing them for you.'".
  // They escaped the old throw only because they happened to fall outside the
  // 1300 and 600 character caps: luck, not design, and one founder edit away
  // from a silent all-day outage.
  //
  // A CONSEQUENCE scan of the prompt was tried and removed for the same class
  // of reason: it is an output-shaped test applied to input guidance, and it
  // blocked 100 percent of generations on the real corpus, firing on
  // "Relegation and survival get composure and respect, not jokes" (a restraint
  // rule) and on "SCREENSHOT-SAFE: if a line's safety depends on...". The
  // corpus may DISCUSS stakes; the model may not ASSERT one, and that is
  // enforced on the output where no prompt row can bypass it.
  const promptBody = [persona, dos, donts, perType, examples].join("\n");
  if (CLICHE.test(promptBody)) {
    // Unreachable: `clean` already removed these. Kept as a last-resort assert
    // so a future refactor that bypasses the filter is caught immediately.
    throw new Error("voice_corpus poisoned: a banned house phrase survived corpus filtering");
  }

  // ------------------------------------------------------------ fact pack
  const goals = events.filter((e) => /goal/.test(e.type) && e.type !== "penalty_miss");
  const tag = (g: EventRow) =>
    g.type === "own_goal" ? " (own goal)" : g.type === "penalty_goal" ? " (penalty)" : "";
  const byTeam: Record<string, string[]> = { [m.homeName]: [], [m.awayName]: [] };
  let h = 0,
    a = 0;
  const goalLog = goals.map((g) => {
    const creditedHome = g.team_id === m.homeId;
    const team = creditedHome ? m.homeName : m.awayName;
    if (creditedHome) h++;
    else a++;
    byTeam[team].push(`${g.player_name} ${g.minute}'${tag(g)}`);
    const ownNote =
      g.type === "own_goal"
        ? ` (${g.player_name} of ${creditedHome ? m.awayName : m.homeName} put it into his own net)`
        : "";
    return `${g.minute}' GOAL for ${team}: ${g.player_name}${tag(g)}${ownNote}. Score now ${m.homeName} ${h}, ${m.awayName} ${a}.`;
  });
  const cards = events.filter((e) => /yellow|red/.test(e.type));
  const reds = cards
    .filter((c) => /red|second/.test(c.type))
    .map((c) => `${c.minute}' ${c.player_name} sent off`);
  const allowed = goals.map((g) => g.player_name).filter(Boolean) as string[];
  const realScore = `${m.homeScore}-${m.awayScore}`;
  const totalGoals = (m.homeScore || 0) + (m.awayScore || 0);
  const winner =
    m.homeScore > m.awayScore ? m.homeName : m.awayScore > m.homeScore ? m.awayName : null;

  // T3 FAIL FAST. goalsConsistent is a data-integrity check on the INGEST, not
  // on the model, and it is invariant across all five attempts. Hoisted above
  // the loop so a short fact pack costs zero Anthropic calls instead of five
  // writer calls and five judge calls.
  if (goals.length !== totalGoals) {
    throw new Error(
      `fact pack incomplete: ${goals.length} goal events for a ${m.homeScore}-${m.awayScore}`,
    );
  }

  const scorer_summary = {
    [`${m.homeName} (home) scored ${m.homeScore}`]: byTeam[m.homeName].length
      ? byTeam[m.homeName]
      : ["none"],
    [`${m.awayName} (away) scored ${m.awayScore}`]: byTeam[m.awayName].length
      ? byTeam[m.awayName]
      : ["none"],
  };
  const factPack = {
    competition: m.leagueName,
    winner: winner ? `${winner} won` : "a draw",
    final_score: `${m.homeName} ${m.homeScore}, ${m.awayName} ${m.awayScore}`,
    scorer_summary,
    goal_log: goalLog,
    total_cards: cards.length,
    red_cards: reds,
    "stats (full match)": st
      ? {
          possession: `${m.homeName} ${st.home_possession}%, ${m.awayName} ${st.away_possession}%`,
          shots: `${m.homeName} ${st.home_shots}, ${m.awayName} ${st.away_shots}`,
          on_target: `${m.homeName} ${st.home_sot}, ${m.awayName} ${st.away_sot}`,
          xg: `${m.homeName} ${st.home_xg}, ${m.awayName} ${st.away_xg}`,
          corners: `${m.homeName} ${st.home_corners}, ${m.awayName} ${st.away_corners}`,
        }
      : "no detailed stats",
    context: opts.context ?? [],
    // numbers[] and teams[] stay server-side. The writer never sees the licence,
    // only the clause, so it cannot treat the number list as a menu.
    angles: offered.map((x) => ({ id: x.id, clause: x.clause })),
  };
  const fixedFacts = `${winner ? winner + " won" : "It was a draw"}. ${m.homeName} scored ${m.homeScore} (${byTeam[m.homeName].join(", ") || "none"}). ${m.awayName} scored ${m.awayScore} (${byTeam[m.awayName].join(", ") || "none"}).`;
  const userBase =
    `FACT PACK:\n${JSON.stringify(factPack, null, 2)}\n\n` +
    `Return ONLY this JSON: {"title":"<=6 words, in voice",` +
    `"script":"the 105-135 word recap",` +
    `"magic_sentence":"the single sharpest sentence, verbatim from the script",` +
    `"referenced_scorers":["each scorer you named"],` +
    `"used_angle":"the id of the ONE angle you used, or none",` +
    `"stated_score":"${realScore}"}`;

  // The entity licence: the closed world of names this script may contain.
  const licensedEntities = [
    m.homeName,
    m.homeShort,
    m.awayName,
    m.awayShort,
    m.leagueName,
    ...events.map((e) => e.player_name).filter(Boolean),
    ...offered.flatMap((x) => x.teams),
  ].filter(Boolean) as string[];

  let out: Record<string, unknown> = {};
  let judge: Record<string, unknown> = {};
  let attempt = 0,
    feedback = "",
    pass = false;
  let cc: Record<string, boolean> = {};
  let relaxed: string[] = [];
  let usedAngle = "none";
  const attemptLog: Array<{ attempt: number; failed: string[]; judge: string[] }> = [];

  while (!pass && attempt < 5) {
    attempt++;
    out = await llm(WRITER, userBase + feedback, WRITER_MODEL, 900, key);
    const script = String(out.script ?? "");
    usedAngle = String(out.used_angle ?? "none") || "none";
    const usedClause = offered.find((x) => x.id === usedAngle)?.clause ?? "";

    const gate = runGate({
      out,
      m,
      goals,
      cards,
      st,
      offered,
      allowed,
      licensedEntities,
      realScore,
      totalGoals,
      attempt,
      nameLicenseMode: NAME_LICENSE_MODE,
    });
    cc = gate.checks;
    relaxed = gate.relaxed;
    const codePass = gate.codePass;
    const { unlicensedNumbers, unlicensedConsequences, unlicensedNames } = gate.detail;
    const failed = gate.failed;
    const hardFailed = gate.hardFailed;

    // The judge is given the SAME licensed sets the code gate enforces, so it
    // is checking MEMBERSHIP rather than inferring what was permitted.
    //
    // The first version of this was shown only the score and the declared
    // angle. It therefore flagged every possession, shot, corner and xG figure
    // as unlicensed, even though those live in the fact pack and
    // numeric_licence explicitly permits them. That alone drove the judge
    // contradiction rate to ~80 percent of attempts on the clean golden set.
    // Never hand the judge a narrower world than the gate enforces.
    const licensedForJudge = [...licensedNumbers(m, goals, cards, st, offered, usedAngle)]
      .sort((x, y) => x - y)
      .join(", ");
    const statLine = st
      ? `possession ${m.homeName} ${st.home_possession}% / ${m.awayName} ${st.away_possession}%; ` +
        `shots ${st.home_shots} / ${st.away_shots}; on target ${st.home_sot} / ${st.away_sot}; ` +
        `xG ${st.home_xg} / ${st.away_xg}; corners ${st.home_corners} / ${st.away_corners}; ` +
        `cards ${cards.length}`
      : "(no detailed stats were given to the writer)";

    judge = await llm(
      `You compare a football recap to the facts it was allowed to use.
Flag a contradiction ONLY if the recap:
(a) states the wrong winner or the wrong final score;
(b) attributes a named goal to the wrong team;
(c) makes a factual claim about history, past meetings, the league table, form,
    streaks, expectation, or ANY other match, that is not stated in LICENSED CONTEXT;
(d) states a number that is not in LICENSED NUMBERS;
(e) names a person or club that is not in LICENSED NAMES.

NOT contradictions, never flag these:
- any statistic drawn from MATCH STATS below, which the writer was given;
- a closing forward line such as "they go again", so long as it names no
  opponent, no date and no competition;
- phrasing, tone, adjectives, restatement, or any goal the recap leaves out;
- describing a player as belonging to one of the two clubs in this match.

"contradictions" must contain ONLY actual contradictions, each ONE plain
sentence naming the false statement. Do not reason in the array. Do not include
an entry whose own explanation concludes the recap is correct, consistent or
accurate: if your analysis clears the statement, the entry does not belong
there at all. If the recap is fine, return an empty array.
Do not derive new facts by arithmetic and then object to your own derivation.
Output ONLY JSON.`,
      `CORRECT RESULT: ${fixedFacts}\n` +
        `Final score (home then away): ${realScore}\n` +
        `MATCH STATS the writer was given: ${statLine}\n` +
        `LICENSED NUMBERS: ${licensedForJudge}\n` +
        `LICENSED NAMES: ${[...new Set(licensedEntities)].join(", ")}\n` +
        `LICENSED CONTEXT: ${usedAngle === "none" || !usedClause ? "(none: the recap may state no fact beyond the result, the goals and the stats above)" : usedClause}\n\n` +
        `RECAP:\n"${script}"\n\n` +
        `JSON only: {"contradictions":[],"coherent":true}`,
      JUDGE_MODEL,
      600,
      key,
    );
    // Sonnet occasionally returns objects rather than strings here. Coercing
    // with String() renders them "[object Object]", which makes the retry
    // feedback useless precisely when it matters most.
    const contradictions = ((judge.contradictions as unknown[]) || [])
      .map((c) => (typeof c === "string" ? c : JSON.stringify(c)))
      .filter((c) => c && c !== "{}")
      // Sonnet reasons inside the array despite being told not to, and a
      // meaningful share of entries end by clearing the very statement they
      // raise ("...which is actually consistent"). An entry that argues itself
      // down is not a contradiction, and treating it as one burns an attempt
      // and can fail a correct recap closed. Measured at 3 of 8 entries on the
      // clean golden set before this filter.
      .filter(
        (c) =>
          !/\b(is|are|was|were) (actually )?(correct|consistent|accurate|fine)\b|no contradiction|not a contradiction|this is consistent/i.test(
            c,
          ),
      );
    const judgePass = contradictions.length === 0 && judge.coherent !== false;
    pass = codePass && judgePass;
    attemptLog.push({
      attempt,
      failed: attempt >= 3 ? gate.hardFailed : gate.failed,
      judge: contradictions,
    });

    if (!pass) {
      // Once taste rules are advisory, only surface what still blocks: telling
      // the model to fix a rule that no longer blocks wastes the attempt.
      const blocking = attempt >= 3 ? hardFailed : failed;
      const detail: string[] = [];
      if (unlicensedNumbers.length)
        detail.push(`Unlicensed numbers: ${[...new Set(unlicensedNumbers)].join(", ")}.`);
      if (unlicensedConsequences.length)
        detail.push(
          `Forbidden consequence words: ${[...new Set(unlicensedConsequences)].join(", ")}.`,
        );
      if (NAME_LICENSE_MODE === "enforce" && unlicensedNames.length)
        detail.push(`Unlicensed names: ${[...new Set(unlicensedNames)].join(", ")}.`);
      feedback =
        `\n\nREJECTED, attempt ${attempt}. THE FACTS YOU MUST MATCH: ${fixedFacts}\n` +
        (blocking.length ? blocking.map((k) => `- ${FEEDBACK[k] ?? k}`).join("\n") + "\n" : "") +
        (detail.length ? detail.map((d) => `- ${d}`).join("\n") + "\n" : "") +
        (contradictions.length ? `- FACTUAL ERRORS: ${contradictions.join(" | ")}\n` : "") +
        `Final score is ${realScore}. Only these scorers exist: ${allowed.join(", ")}.\n` +
        `Do not enumerate every goal. Get the winner and score right. Return JSON only.`;
    }
  }

  return {
    ok: pass,
    title: String(out.title ?? ""),
    script: String(out.script ?? ""),
    magic_sentence: String(out.magic_sentence ?? ""),
    referenced_scorers: (out.referenced_scorers as string[]) || [],
    used_angle: usedAngle,
    offered_angles: offered.map((x) => x.id),
    attempts: attempt,
    judge,
    checks: cc,
    attempt_log: attemptLog,
    quality_relaxed: relaxed,
    name_license_mode: NAME_LICENSE_MODE,
  };
}
