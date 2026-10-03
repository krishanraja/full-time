import { getStepMetadata } from "workflow";
import type { GeneratedPunditVariant } from "@/lib/pundit/pundit-generator.server";
import type { PunditId } from "@/lib/pundit/types";

type DailyRunMode = "full_rehearsal" | "publication";

function assertCoverageDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Coverage date must be YYYY-MM-DD.");
  return value;
}

export async function claimEditorialRunStep(input: { coverageDate: string; mode: DailyRunMode }) {
  "use step";
  const { claimRun } = await import("@/lib/pundit/daily-orchestrator.server");
  const { stepId } = getStepMetadata();
  return claimRun({
    coverageDate: assertCoverageDate(input.coverageDate),
    mode: input.mode,
    requestId: stepId,
  });
}

export async function selectFeatureMatchStep(coverageDate: string) {
  "use step";
  const { selectFeatureMatch } = await import("@/lib/pundit/daily-orchestrator.server");
  return selectFeatureMatch(assertCoverageDate(coverageDate));
}

export async function prepareEditorialStep(matchId: string, requestedCoverageDate: string) {
  "use step";
  const [
    { loadStructuredMatch },
    { buildEvidencePack },
    { generateClaimLaboratory },
    { loadRightsClearedOriginalityCorpus },
    { loadRecentlyPublishedLines },
  ] = await Promise.all([
    import("@/lib/pundit/structured-match.server"),
    import("@/lib/pundit/evidence"),
    import("@/lib/pundit/pundit-generator.server"),
    import("@/lib/pundit/research-originality.server"),
    import("@/lib/pundit/self-originality.server"),
  ]);
  const structured = await loadStructuredMatch(matchId);
  if (structured.coverageDate !== requestedCoverageDate) {
    throw new Error(
      `Selected match belongs to ${structured.coverageDate}, not ${requestedCoverageDate}.`,
    );
  }
  const pack = buildEvidencePack(structured.input);
  const [claims, originalityCorpus, recentLines] = await Promise.all([
    generateClaimLaboratory(pack),
    loadRightsClearedOriginalityCorpus(),
    // What this product published in the last fortnight. The corpus above asks
    // whether a script is too close to someone else's writing; this asks
    // whether it is too close to ours, which nothing has ever asked.
    loadRecentlyPublishedLines(structured.coverageDate),
  ]);
  return {
    coverageDate: structured.coverageDate,
    entities: structured.entities,
    pack,
    claims,
    originalityCorpus,
    recentLines,
  };
}
prepareEditorialStep.maxRetries = 0;

export async function generatePunditStep(input: {
  punditId: PunditId;
  pack: Awaited<ReturnType<typeof prepareEditorialStep>>["pack"];
  claims: Awaited<ReturnType<typeof prepareEditorialStep>>["claims"];
  originalityCorpus: string[];
  /** Everything the product published in the last fortnight, for every
   *  pundit. Narrowed to this one inside the step. */
  recentLines?: Awaited<ReturnType<typeof prepareEditorialStep>>["recentLines"];
  coverageDate?: string;
  /** Fewer repair rounds than the environment allows, for a diagnostic run. */
  maxAttempts?: number;
}) {
  "use step";
  const [{ generatePunditVariant }, { linesToAvoid }] = await Promise.all([
    import("@/lib/pundit/pundit-generator.server"),
    import("@/lib/pundit/self-originality"),
  ]);
  // Only this pundit's own lines. A persona is supposed to sound like itself,
  // so holding one pundit to another's phrasing would punish it for having a
  // voice.
  const recentlyUsedLines =
    input.recentLines?.length && input.coverageDate
      ? linesToAvoid(input.punditId, input.recentLines, input.coverageDate)
      : undefined;
  return generatePunditVariant({ ...input, recentlyUsedLines });
}
generatePunditStep.maxRetries = 0;

export async function persistEditorialStep(input: {
  coverageDate: string;
  prepared: Awaited<ReturnType<typeof prepareEditorialStep>>;
  variants: GeneratedPunditVariant[];
}) {
  "use step";
  const [{ persistEditorialRehearsal }, { convergentVariants }] = await Promise.all([
    import("@/lib/pundit/editorial-repository.server"),
    import("@/lib/pundit/self-originality"),
  ]);

  // Six pundits share one evidence pack and one claim set and have never been
  // compared to each other. On 2026-09-04 the claim laboratory returned
  // thirty-five claims holding about ten ideas, all six built the same
  // argument and five were failed for a truism - and the only record of it was
  // five separate insight failures that each looked like one writer's problem.
  //
  // Reported, never failed. Convergence is a fact about the shared input, so
  // the fix is upstream in the claim laboratory and refusing the writers would
  // be blaming them for what they were given.
  const echoes = convergentVariants(
    input.variants.map((variant) => ({
      punditId: variant.candidate.punditId,
      text: variant.candidate.thesis.judgment,
    })),
  );
  if (echoes.length) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "pundits_converged",
        coverageDate: input.coverageDate,
        pairs: echoes.map((echo) => `${echo.left}/${echo.right}`),
        worst: echoes[0].similarity,
        hint: "Read the claim set before touching a prompt.",
      }),
    );
  }

  return persistEditorialRehearsal({
    coverageDate: input.coverageDate,
    pack: input.prepared.pack,
    claims: input.prepared.claims,
    variants: input.variants,
  });
}

type ProducedVariant = {
  punditId: PunditId;
  passed: boolean;
  reused?: boolean;
  failures?: readonly string[];
  assets?: { audioUrl: string; audioPath: string; shareImageUrl: string; sharePath: string };
};

/** Production runs in the Nitro server function, which is the only runtime
 *  that ships sharp and the ffmpeg binary. The step bundle calls it over HTTP
 *  with the cron bearer instead of importing the native modules itself. */
export async function producePunditStep(input: {
  dropId: string;
  coverageDate: string;
  variantId: string;
  generated: GeneratedPunditVariant;
  entities: string[];
}): Promise<ProducedVariant> {
  "use step";
  const base = (process.env.APP_URL ?? "https://fulltime.fm").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is required to call variant production.");
  const response = await fetch(`${base}/api/internal/produce-variant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(800_000),
  });
  const text = await response.text();
  if (!response.ok) {
    return {
      punditId: input.generated.candidate.punditId,
      passed: false,
      failures: [`Variant production ${response.status}: ${text.slice(0, 300)}`],
    };
  }
  return JSON.parse(text) as ProducedVariant;
}
producePunditStep.maxRetries = 0;

export async function quarantineEditorialDropStep(dropId: string, reason: string) {
  "use step";
  const { serviceRest } = await import("@/lib/pundit/service-rest.server");
  const promise = {
    passed: false,
    checks: [{ name: "editorial", passed: false, detail: reason }],
  };
  await serviceRest<null>(`daily_drops?id=eq.${encodeURIComponent(dropId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      status: "quarantined",
      approved_at: null,
      promise_checks: promise,
      promise_checked_at: new Date().toISOString(),
    },
  });
  return promise;
}

export async function finalizeProducedDropStep(input: {
  dropId: string;
  coverageDate: string;
  production: Array<{ punditId: PunditId; passed: boolean; failures?: readonly string[] }>;
}) {
  "use step";
  const [{ runDropPromiseChecks }, { serviceRest }] = await Promise.all([
    import("@/lib/pundit/promise-checks.server"),
    import("@/lib/pundit/service-rest.server"),
  ]);
  // A production failure withholds that pundit, not the show. The promise
  // checks read the database rather than this list, so a variant whose audio
  // never landed simply is not publishable, and the reason is recorded here.
  const failures = input.production.flatMap((item) =>
    item.passed
      ? []
      : [
          {
            name: `${item.punditId}_withheld`,
            passed: true,
            detail: `Withheld from this drop: ${item.failures?.join(" ") ?? "production failed closed"}.`,
          },
        ],
  );
  const promise = input.production.some((item) => item.passed)
    ? await runDropPromiseChecks({ dropId: input.dropId, coverageDate: input.coverageDate })
    : { passed: false, checks: [] };
  promise.checks = [...promise.checks, ...failures];
  await serviceRest<null>(`daily_drops?id=eq.${encodeURIComponent(input.dropId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      status: promise.passed ? "approved" : "quarantined",
      approved_at: promise.passed ? new Date().toISOString() : null,
      promise_checks: promise,
      promise_checked_at: new Date().toISOString(),
    },
  });
  return promise;
}

export async function publishDropStep(dropId: string) {
  "use step";
  const { serviceRpc } = await import("@/lib/pundit/service-rest.server");
  return serviceRpc("publish_daily_drop", { target_drop_id: dropId });
}

export async function completeRunStep(input: {
  runId: string;
  coverageDate: string;
  mode: DailyRunMode;
  status: "passed" | "quarantined" | "failed";
  matchId?: string;
  dropId?: string;
  successfulVariants: number;
  promiseChecks?: unknown;
  failure?: string;
}) {
  "use step";
  const { finishRun, recordRehearsal } = await import("@/lib/pundit/daily-orchestrator.server");
  await finishRun({
    runId: input.runId,
    status: input.status,
    matchId: input.matchId,
    promiseChecks: input.promiseChecks,
    failure: input.failure,
  });
  if (input.mode === "full_rehearsal") {
    await recordRehearsal({
      runId: input.runId,
      coverageDate: input.coverageDate,
      dropId: input.dropId,
      successfulVariants: input.successfulVariants,
      promiseChecks: input.promiseChecks ?? { passed: false, failure: input.failure },
      passed: input.status === "passed",
    });
  }
}
