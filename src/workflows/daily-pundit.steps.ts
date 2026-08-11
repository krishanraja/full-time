import { getStepMetadata } from "workflow";
import {
  claimRun,
  finishRun,
  recordRehearsal,
  selectFeatureMatch,
} from "@/lib/pundit/daily-orchestrator.server";
import { buildEvidencePack } from "@/lib/pundit/evidence";
import { persistEditorialRehearsal } from "@/lib/pundit/editorial-repository.server";
import {
  generateClaimLaboratory,
  generatePunditVariant,
  type GeneratedPunditVariant,
} from "@/lib/pundit/pundit-generator.server";
import { runDropPromiseChecks } from "@/lib/pundit/promise-checks.server";
import { loadRightsClearedOriginalityCorpus } from "@/lib/pundit/research-originality.server";
import { serviceRest, serviceRpc } from "@/lib/pundit/service-rest.server";
import { loadStructuredMatch } from "@/lib/pundit/structured-match.server";
import type { PunditId } from "@/lib/pundit/types";
import { producePunditVariant } from "@/lib/pundit/variant-production.server";

export type DailyRunMode = "full_rehearsal" | "publication";

function assertCoverageDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Coverage date must be YYYY-MM-DD.");
  return value;
}

export async function claimEditorialRunStep(input: { coverageDate: string; mode: DailyRunMode }) {
  "use step";
  const { stepId } = getStepMetadata();
  return claimRun({
    coverageDate: assertCoverageDate(input.coverageDate),
    mode: input.mode,
    requestId: stepId,
  });
}

export async function selectFeatureMatchStep(coverageDate: string) {
  "use step";
  return selectFeatureMatch(assertCoverageDate(coverageDate));
}

export async function prepareEditorialStep(matchId: string, requestedCoverageDate: string) {
  "use step";
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
  return generatePunditVariant(input);
}
generatePunditStep.maxRetries = 0;

export async function persistEditorialStep(input: {
  coverageDate: string;
  prepared: Awaited<ReturnType<typeof prepareEditorialStep>>;
  variants: GeneratedPunditVariant[];
}) {
  "use step";
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
  return producePunditVariant(input);
}
producePunditStep.maxRetries = 0;

export async function quarantineEditorialDropStep(dropId: string, reason: string) {
  "use step";
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
