import { getStepMetadata } from "workflow";
import type { GeneratedPunditVariant } from "@/lib/pundit/pundit-generator.server";
import type { PunditId } from "@/lib/pundit/types";

type DailyRunMode = "full_rehearsal" | "publication";

function assertCoverageDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Coverage date must be YYYY-MM-DD.");
  return value;
}

export async function claimEditorialRunStep(input: {
  coverageDate: string;
  mode: DailyRunMode;
}) {
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
  ] = await Promise.all([
    import("@/lib/pundit/structured-match.server"),
    import("@/lib/pundit/evidence"),
    import("@/lib/pundit/pundit-generator.server"),
    import("@/lib/pundit/research-originality.server"),
  ]);
  const structured = await loadStructuredMatch(matchId);
  if (structured.coverageDate !== requestedCoverageDate) {
    throw new Error(
      `Selected match belongs to ${structured.coverageDate}, not ${requestedCoverageDate}.`,
    );
  }
  const pack = buildEvidencePack(structured.input);
  const [claims, originalityCorpus] = await Promise.all([
    generateClaimLaboratory(pack),
    loadRightsClearedOriginalityCorpus(),
  ]);
  return {
    coverageDate: structured.coverageDate,
    entities: structured.entities,
    pack,
    claims,
    originalityCorpus,
  };
}
prepareEditorialStep.maxRetries = 0;

export async function generatePunditStep(input: {
  punditId: PunditId;
  pack: Awaited<ReturnType<typeof prepareEditorialStep>>["pack"];
  claims: Awaited<ReturnType<typeof prepareEditorialStep>>["claims"];
  originalityCorpus: string[];
}) {
  "use step";
  const { generatePunditVariant } = await import("@/lib/pundit/pundit-generator.server");
  return generatePunditVariant(input);
}
generatePunditStep.maxRetries = 0;

export async function persistEditorialStep(input: {
  coverageDate: string;
  prepared: Awaited<ReturnType<typeof prepareEditorialStep>>;
  variants: GeneratedPunditVariant[];
}) {
  "use step";
  const { persistEditorialRehearsal } = await import("@/lib/pundit/editorial-repository.server");
  return persistEditorialRehearsal({
    coverageDate: input.coverageDate,
    pack: input.prepared.pack,
    claims: input.prepared.claims,
    variants: input.variants,
  });
}

export async function producePunditStep(input: {
  dropId: string;
  coverageDate: string;
  variantId: string;
  generated: GeneratedPunditVariant;
  entities: string[];
}) {
  "use step";
  const { producePunditVariant } = await import("@/lib/pundit/variant-production.server");
  return producePunditVariant(input);
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
  const promise = input.production.every((item) => item.passed)
    ? await runDropPromiseChecks({ dropId: input.dropId, coverageDate: input.coverageDate })
    : {
        passed: false,
        checks: input.production.flatMap((item) =>
          item.passed
            ? []
            : [
                {
                  name: `${item.punditId}_production`,
                  passed: false,
                  detail: item.failures?.join(" ") ?? "Production failed closed.",
                },
              ],
        ),
      };
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
