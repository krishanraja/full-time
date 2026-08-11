import { buildEvidencePack } from "./evidence";
import { generateAllPundits, generateClaimLaboratory } from "./pundit-generator.server";
import { persistEditorialRehearsal } from "./editorial-repository.server";
import { producePunditVariant } from "./variant-production.server";
import { runDropPromiseChecks } from "./promise-checks.server";
import { serviceRest } from "./service-rest.server";
import { loadStructuredMatch } from "./structured-match.server";

async function mapLimit<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await run(items[index]);
      }
    }),
  );
  return results;
}

export async function runPrivatePunditRehearsal(
  matchId: string,
  options: { includeAudio?: boolean } = {},
) {
  const { input, entities, coverageDate } = await loadStructuredMatch(matchId);
  const pack = buildEvidencePack(input);
  const claims = await generateClaimLaboratory(pack);
  const variants = await generateAllPundits({ pack, claims });
  const persisted = await persistEditorialRehearsal({
    coverageDate,
    pack,
    claims,
    variants,
  });
  if (!options.includeAudio || persisted.status !== "narration_review") {
    return {
      ...persisted,
      matchId,
      promise: undefined,
      variants: variants.map((variant) => ({
        pundit: variant.candidate.punditId,
        status: variant.status,
        attempts: variant.attempts,
        failures: variant.results.filter((item) => !item.passed).map((item) => item.harness),
        production: undefined,
      })),
    };
  }

  const variantIdByPundit = new Map(
    persisted.variantIds.map((item) => [item.punditId, item.variantId]),
  );
  const production = await mapLimit(variants, 3, (generated) =>
    producePunditVariant({
      dropId: persisted.dropId,
      coverageDate,
      variantId: variantIdByPundit.get(generated.candidate.punditId)!,
      generated,
      entities,
    }),
  );
  const promise = production.every((item) => item.passed)
    ? await runDropPromiseChecks({ dropId: persisted.dropId, coverageDate })
    : {
        passed: false,
        checks: production.flatMap((item) =>
          item.passed
            ? []
            : [
                {
                  name: `${item.punditId}_production`,
                  passed: false,
                  detail: item.failures.join(" "),
                },
              ],
        ),
      };
  await serviceRest<null>(`daily_drops?id=eq.${encodeURIComponent(persisted.dropId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      status: promise.passed ? "approved" : "quarantined",
      approved_at: promise.passed ? new Date().toISOString() : null,
      promise_checks: promise,
      promise_checked_at: new Date().toISOString(),
    },
  });
  return {
    ...persisted,
    matchId,
    status: promise.passed ? "approved" : "quarantined",
    promise,
    variants: variants.map((variant) => ({
      pundit: variant.candidate.punditId,
      status: variant.status,
      attempts: variant.attempts,
      failures: variant.results.filter((item) => !item.passed).map((item) => item.harness),
      production: production.find((item) => item.punditId === variant.candidate.punditId),
    })),
  };
}
