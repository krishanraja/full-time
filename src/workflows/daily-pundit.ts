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
  /** Cap the repair rounds for this run. Only ever lowers the environment's
   *  ceiling, so a diagnostic cannot quietly make the daily show cheaper. */
  maxAttempts?: number;
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
          // Narrowed to this pundit inside the step, not here. The comment at
          // the top of this file is the reason: pulling a module out of the
          // shared app graph into the workflow bundle makes Vite reuse the
          // router chunk and leaks Node-only helpers past step isolation.
          recentLines: prepared.recentLines,
          coverageDate,
          maxAttempts: input.maxAttempts,
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
    // What this drop cost, recorded where it can be read back.
    //
    // Nothing in the database held a cost before this. editorial_runs stores
    // status, failure, timings and the promise report, and no money at all, so
    // the only record of spend was the model_cache_usage log lines - which age
    // out of the log window. Answering "what did that run cost" on 2026-09-21
    // meant reconstructing $38.86 from 1,682 log entries, which is not a thing
    // anyone should have to do twice.
    //
    // It rides promise_checks because that column is jsonb and already written
    // on every path, so the cost arrives with no migration and no risk of a
    // schema change failing a run that has already been paid for.
    const spend = {
      totalUsd: Number(variants.reduce((sum, item) => sum + (item.costUsd ?? 0), 0).toFixed(4)),
      byPundit: Object.fromEntries(
        variants.map((item) => [item.candidate.punditId, Number((item.costUsd ?? 0).toFixed(4))]),
      ),
      attemptsByPundit: Object.fromEntries(
        variants.map((item) => [item.candidate.punditId, item.attempts]),
      ),
      // A variant that was written and then never narrated is spend with no
      // possible product at the end of it. Counting it separately is what
      // turns "the run cost six dollars" into "two of those dollars bought
      // nothing", which is the number worth acting on.
      writtenButNotProduced: variants
        .filter((item) => !approved.has(item.candidate.punditId))
        .map((item) => item.candidate.punditId),
    };

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
        promiseChecks: { ...promise, spend },
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
      promiseChecks: { ...promise, spend },
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
