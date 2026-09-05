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
    matchId = await selectFeatureMatchStep(coverageDate);
    const prepared = await prepareEditorialStep(matchId, coverageDate);
    const variants = await Promise.all(
      PUNDIT_IDS.map((punditId) =>
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
      const promise = await quarantineEditorialDropStep(
        persisted.dropId,
        "One or more pundit scripts failed independent editorial harnesses.",
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
        failure: "Six-variant editorial promise checks failed.",
      });
      return { dropId, matchId, published: false, promise };
    }

    const variantIds = new Map(persisted.variantIds.map((item) => [item.punditId, item.variantId]));
    const production = await Promise.all(
      variants.map((generated) =>
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
        failure: "Six-variant production promise checks failed.",
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
