import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEvidencePack, type StructuredMatchInput } from "./evidence";
import {
  replayGateCorpus,
  REPLAYABLE_HARD_GATES,
  type CorpusVerdict,
  type GateCorpus,
} from "./gate-corpus-replay";
import { runHardGates } from "./harness";
import type { AnalysisClaim, BeatName, PunditVariantCandidate } from "./types";

const BEAT_NAMES: BeatName[] = [
  "hook",
  "match_story",
  "evidence",
  "explanation",
  "judgment",
  "counterpoint",
  "humour",
  "portable_line",
  "prediction_or_receipt",
  "close",
];

const matchInput: StructuredMatchInput = {
  match: {
    id: "match-replay",
    homeTeam: "Brentford",
    awayTeam: "Everton",
    homeScore: 2,
    awayScore: 1,
    kickoffAt: "2026-09-12T14:00:00Z",
    competition: "Premier League",
    source: "provider-a",
  },
  events: [
    {
      id: "goal-1",
      type: "goal",
      minute: 12,
      team: "Brentford",
      player: "Kevin Schade",
      source: "provider-a",
    },
  ],
  stats: {
    homeShots: 14,
    awayShots: 9,
    homeShotsOnTarget: 6,
    awayShotsOnTarget: 3,
    source: "provider-a",
  },
};

const claim: AnalysisClaim = {
  id: "claim-1",
  matchId: "match-replay",
  type: "fact",
  thesis: "Brentford scored first.",
  evidenceRefs: ["event.goal-1"],
  confidence: 1,
};

function candidate(): PunditVariantCandidate {
  const beats = BEAT_NAMES.map(
    (name) => `The reasoning continues for the ${name.replaceAll("_", " ")} beat.`,
  );
  return {
    punditId: "zen",
    specVersion: 1,
    thesis: {
      punditId: "zen",
      headline: "A licensed reading",
      judgment: "The evidence supports it.",
      selectedClaimIds: [claim.id],
      rejectedClaimIds: [],
      counterpoint: "One match is a small sample.",
      changeMyMind: "More matches.",
    },
    outline: Object.fromEntries(
      BEAT_NAMES.map((name, index) => [name, beats[index]]),
    ) as PunditVariantCandidate["outline"],
    displayScript: beats.join(" "),
    spokenScript: beats.join(" "),
    performancePlan: beats.map((text) => ({
      text,
      intent: "explanation" as const,
      pace: "measured" as const,
      energy: 3 as const,
    })),
    claimIds: [claim.id],
  };
}

/** A corpus whose stored verdicts agree with what the gates say today, built by
 *  asking the gates and writing down the answer. Any mismatch the replay then
 *  reports is a mismatch the replay invented. */
function agreeingCorpus(): GateCorpus {
  const pack = buildEvidencePack(matchInput);
  const results = runHardGates({ pack, claims: [claim], candidate: candidate() });
  const verdicts: CorpusVerdict[] = results
    .filter((result) => (REPLAYABLE_HARD_GATES as readonly string[]).includes(result.harness))
    .map((result) => ({
      variant_id: "variant-1",
      harness_name: result.harness,
      attempt: 1,
      passed: result.passed,
      failure: result.failure ?? null,
      evidence_span: result.evidenceSpan ?? null,
    }));
  const built = candidate();
  return {
    exportedAt: "2026-09-21T00:00:00.000Z",
    packs: [
      {
        id: "pack-1",
        drop_id: "drop-1",
        match_id: pack.matchId,
        version: pack.version,
        created_at: pack.createdAt,
        facts: [...pack.facts],
        derivations: [...pack.derivations],
        unavailable_evidence: [...pack.unavailableEvidence],
      },
    ],
    variants: [
      {
        id: "variant-1",
        drop_id: "drop-1",
        pundit_id: "zen",
        spec_version: 1,
        status: "published",
        display_script: built.displayScript,
        spoken_script: built.spokenScript,
        thesis: built.thesis,
        beat_outline: built.outline,
        performance_plan: built.performancePlan,
      },
    ],
    claims: [
      {
        id: claim.id,
        evidence_pack_id: "pack-1",
        match_id: claim.matchId,
        type: claim.type,
        thesis: claim.thesis,
        evidence_refs: claim.evidenceRefs,
        confidence: claim.confidence,
        alternative_explanation: null,
        missing_evidence: [],
        falsifier: null,
        evaluation_rule: null,
      },
    ],
    verdicts,
  };
}

describe("replaying stored gate verdicts", () => {
  it("reports nothing when the gates still say what they said", () => {
    const report = replayGateCorpus(agreeingCorpus());
    expect(report.replayedVariants).toBe(1);
    expect(report.comparedVerdicts).toBeGreaterThan(0);
    expect(report.mismatches).toEqual([]);
  });

  /** The whole point. A gate that changes its mind about prose it has already
   *  judged must be visible here, in both directions, before it reaches a paid
   *  run. */
  it("catches a gate that has changed its mind, and says which way", () => {
    const corpus = agreeingCorpus();
    const target = corpus.verdicts.find((verdict) => verdict.harness_name === "numeric_licence");
    expect(target).toBeDefined();
    target!.passed = !target!.passed;
    target!.failure = "Refused a number the evidence does not carry.";

    const report = replayGateCorpus(corpus);
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({
      variantId: "variant-1",
      punditId: "zen",
      harness: "numeric_licence",
      recorded: false,
      replayed: true,
      recordedFailure: "Refused a number the evidence does not carry.",
    });
  });

  /** A repaired variant carries the verdicts of every attempt, and only the
   *  last one wrote the script that was stored. Comparing against attempt one
   *  would report a mismatch on every variant that was ever repaired. */
  it("compares against the final attempt only", () => {
    const corpus = agreeingCorpus();
    const final = corpus.verdicts.find((verdict) => verdict.harness_name === "numeric_licence")!;
    corpus.verdicts.push({ ...final, attempt: 2 });
    corpus.verdicts = corpus.verdicts.map((verdict) =>
      verdict.harness_name === "numeric_licence" && verdict.attempt === 1
        ? { ...verdict, passed: false, failure: "The first draft said something else." }
        : verdict,
    );
    expect(replayGateCorpus(corpus).mismatches).toEqual([]);
  });

  it("ignores the gates it cannot replay rather than failing them", () => {
    const corpus = agreeingCorpus();
    corpus.verdicts.push({
      variant_id: "variant-1",
      harness_name: "research_originality",
      attempt: 1,
      passed: false,
      failure: "Too close to a rights-cleared source.",
      evidence_span: null,
    });
    expect(replayGateCorpus(corpus).mismatches).toEqual([]);
  });

  it("skips a variant whose pack was not exported, and says so", () => {
    const corpus = agreeingCorpus();
    corpus.packs = [];
    const report = replayGateCorpus(corpus);
    expect(report.replayedVariants).toBe(0);
    expect(report.skipped).toEqual([
      { variantId: "variant-1", reason: "no evidence pack exported for its claims" },
    ]);
  });
});

/** The exported corpus is not in the repository until someone runs
 *  `scripts/export-gate-corpus.mjs` against the production database. Until then
 *  this suite proves the replay works and has nothing real to replay, so it
 *  reports that rather than passing silently. */
const corpusPath = resolve(process.cwd(), "src/lib/pundit/__fixtures__/gate-corpus.json");

describe.skipIf(!existsSync(corpusPath))("the exported corpus of real scripts", () => {
  /** Zero mismatches is the wrong bar, and the first real export proved it:
   *  fourteen of a hundred and ninety-two, every one a gate that refuses today
   *  what it allowed on 4-6 September. That is not drift, it is the tightening
   *  those weeks were spent on - `000826d` alone added the check that refuses a
   *  claim whose own list contradicts its count. A corpus of history will
   *  always carry verdicts from before the fix that followed them.
   *
   *  So the assertion is the direction. A gate that got STRICTER is expected
   *  and is left for a human to read. A gate that got LOOSER is an alarm with
   *  no innocent reading: something that was caught once is not caught now, and
   *  nothing in this repository has ever deliberately made a hard gate
   *  permissive. */
  it("has no hard gate that stopped catching something it used to catch", () => {
    const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as GateCorpus;
    const report = replayGateCorpus(corpus);
    expect(report.comparedVerdicts).toBeGreaterThan(0);

    const wentLooser = report.mismatches.filter((m) => !m.recorded && m.replayed);
    expect(wentLooser).toEqual([]);
  });

  /** Not an assertion, a report. The stricter mismatches are the interesting
   *  ones and they are worth a human eye, but they cannot fail a build without
   *  making every historical corpus permanently red. */
  it("reports how far the gates have moved since the corpus was written", () => {
    const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as GateCorpus;
    const report = replayGateCorpus(corpus);
    const stricter = report.mismatches.filter((m) => m.recorded && !m.replayed);
    const byHarness = stricter.reduce<Record<string, number>>((acc, m) => {
      acc[m.harness] = (acc[m.harness] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `[gate replay] ${report.comparedVerdicts} verdicts across ${report.replayedVariants} variants, ` +
        `${report.skipped.length} skipped, ${stricter.length} now refused that once passed:`,
      byHarness,
    );
    expect(report.skipped).toEqual([]);
  });
});
