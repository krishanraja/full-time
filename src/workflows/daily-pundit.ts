import type { PunditId } from "@/lib/pundit/types";
import {
  claimEditorialRunStep,
  completeRunStep,
  finalizeProducedDropStep,
  generatePunditStep,
  persistEditorialStep,
  prepareEditorialStep,
  producePunditStep,
  publishDropStep,
  quarantineEditorialDropStep,
  selectFeatureMatchStep,
} from "./daily-pundit.steps";

// Keep workflow constants local. Importing this tiny list from the shared app
// graph makes Vite reuse the router chunk, which leaks Node-only server helpers
// into the deterministic workflow bundle before step isolation can occur.
const PUNDIT_IDS = ["zen", "gaffer", "stats", "romantic", "doomer", "banter"] as const;

export type DailyPunditWorkflowInput = {
  coverageDate: string;
  mode: DailyRunMode;
  /** Distinguishes one dispatch from another.
   *
   *  A durable run is identified by its arguments, so two dispatches carrying
   *  the same coverage date and mode resume the same run and replay every step
   *  that already completed. That is right for recovering an interrupted run
   *  and wrong for re-running a date against changed code: the replayed steps
   *  return their old verdicts and never see the new build. The token makes
   *  each deliberate dispatch its own run. Duplicate work is still prevented,
   *  one layer down, by the editorial run claim. */
  runToken?: string;
  /** Produce this exact match instead of the day's most important one.
   *
   *  The daily show covers one featured match, chosen by importance. Selling a
   *  specific match on demand, or battle-testing one that a listener actually
   *  cares about, needs the caller to name it. Everything downstream already
   *  works from a match id, so this only bypasses the selection step. */
  matchId?: string;
  /** Write only these pundits instead of all six.
   *
   *  Six variants is the product. One variant is a test, and telling the two
   *  apart is worth roughly six sevenths of the bill. Measured on the run of
   *  2026-09-06: $2.14, of which the writer took $1.06 across twelve Opus calls
   *  and the judges took $0.99 across eighty four Sonnet calls, both dominated
   *  by output tokens rather than by the cached evidence pack. Every one of
   *  those calls except a seventh of them existed to confirm a fix that one
   *  pundit would have shown just as clearly, and a week of debugging at full
   *  price is most of how a month of budget went.
   *
   *  A run naming a subset can never publish: the six-variant promise is
   *  checked downstream and a drop holding one variant fails it, which is the
   *  correct outcome for a diagnostic and is why this needs no separate guard. */
  punditIds?: PunditId[];
};

export type DailyRunMode = "full_rehearsal" | "publication";

function assertCoverageDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Coverage date must be YYYY-MM-DD.");
  return value;
}

export async function dailyPunditWorkflow(input: DailyPunditWorkflowInput) {
  "use workflow";
  const coverageDate = assertCoverageDate(input.coverageDate);
  const run = await claimEditorialRunStep({ ...input, coverageDate });
  if (!run) return { skipped: true, reason: "An idempotent run is already active or passed." };

  let matchId: string | undefined;
  let dropId: string | undefined;
  try {
    matchId = input.matchId ?? (await selectFeatureMatchStep(coverageDate));
    const prepared = await prepareEditorialStep(matchId, coverageDate);
    const writing = input.punditIds?.length
      ? PUNDIT_IDS.filter((punditId) => input.punditIds!.includes(punditId))
      : PUNDIT_IDS;
    const variants = await Promise.all(
      writing.map((punditId) =>
        generatePunditStep({
          punditId,
          pack: prepared.pack,
          claims: prepared.claims,
          originalityCorpus: prepared.originalityCorpus,
        }),
      ),
    );
    const persisted = await persistEditorialStep({ coverageDate, prepared, variants });
    dropId = persisted.dropId;
    if (persisted.status !== "narration_review") {
      const shared = persisted.sharedFailures.length
        ? ` Every pundit failed the same harnesses, which points at a shared input rather than at six writers: ${persisted.sharedFailures.join(", ")}.`
        : "";
      const promise = await quarantineEditorialDropStep(
        persisted.dropId,
        `No pundit script passed its independent editorial harnesses.${shared}`,
      );
      await completeRunStep({
        runId: run.id,
        coverageDate,
        mode: input.mode,
        status: "quarantined",
        matchId,
        dropId,
        successfulVariants: 0,
        promiseChecks: promise,
        failure: `No variant passed the editorial harnesses.${shared}`,
      });
      return { dropId, matchId, published: false, promise };
    }

    const variantIds = new Map(persisted.variantIds.map((item) => [item.punditId, item.variantId]));
    // Only the pundits that passed their own harnesses are narrated. Paying
    // ElevenLabs to voice a script that can never publish is money spent on
    // nothing, and a quarantined variant with audio attached reads as ready.
    const approved = new Set<string>(persisted.approvedPundits);
    const production = await Promise.all(
      variants
        .filter((generated) => approved.has(generated.candidate.punditId))
        .map((generated) =>
          producePunditStep({
            dropId: persisted.dropId,
            coverageDate,
            variantId: variantIds.get(generated.candidate.punditId)!,
            generated,
            entities: prepared.entities,
          }),
        ),
    );
    const promise = await finalizeProducedDropStep({
      dropId: persisted.dropId,
      coverageDate,
      production,
    });
    const successfulVariants = production.filter((item) => item.passed).length;
    if (!promise.passed) {
      await completeRunStep({
        runId: run.id,
        coverageDate,
        mode: input.mode,
        status: "quarantined",
        matchId,
        dropId,
        successfulVariants,
        promiseChecks: promise,
        failure: "No variant survived production and the promise checks.",
      });
      return { dropId, matchId, published: false, promise };
    }

    const publication = input.mode === "publication" ? await publishDropStep(dropId) : null;
    await completeRunStep({
      runId: run.id,
      coverageDate,
      mode: input.mode,
      status: "passed",
      matchId,
      dropId,
      successfulVariants,
      promiseChecks: promise,
    });
    return {
      dropId,
      matchId,
      published: input.mode === "publication",
      publication,
      promise,
    };
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    await completeRunStep({
      runId: run.id,
      coverageDate,
      mode: input.mode,
      status: "failed",
      matchId,
      dropId,
      successfulVariants: 0,
      promiseChecks: { passed: false, failure },
      failure,
    });
    throw error;
  }
}
