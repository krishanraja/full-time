import { createHash } from "node:crypto";
import { buildEvidencePack } from "./evidence";
import { validateEvaluationManifest, type EvaluationMatch } from "./evaluation";
import { generateAllPundits, generateClaimLaboratory } from "./pundit-generator.server";
import { serviceRest } from "./service-rest.server";
import { loadStructuredMatch } from "./structured-match.server";

type EvaluationMatchRow = {
  match_id: string;
  scenarios: EvaluationMatch["scenarios"];
  partition: EvaluationMatch["partition"];
  prompt_visible: boolean;
};

function blindLabel(matchId: string, punditId: string) {
  return `candidate-${createHash("sha256")
    .update(`${matchId}:${punditId}:blind-v1`)
    .digest("hex")
    .slice(0, 10)}`;
}

async function loadManifest() {
  const rows = await serviceRest<EvaluationMatchRow[]>(
    "evaluation_matches?select=match_id,scenarios,partition,prompt_visible&order=created_at.asc",
  );
  const manifest = rows.map((row) => ({
    matchId: row.match_id,
    scenarios: row.scenarios,
    partition: row.partition,
    promptVisible: row.prompt_visible,
  }));
  const validation = validateEvaluationManifest(manifest);
  if (!validation.passed) throw new Error(validation.failures.join(" "));
  return manifest;
}

export async function runEvaluationBatch(options: { matchId?: string; limit?: number } = {}) {
  const manifest = await loadManifest();
  const completed = await serviceRest<Array<{ match_id: string; pundit_id: string }>>(
    "evaluation_runs?harness_version=eq.pundit-v1&select=match_id,pundit_id",
  );
  const completeCounts = new Map<string, number>();
  for (const row of completed) {
    completeCounts.set(row.match_id, (completeCounts.get(row.match_id) ?? 0) + 1);
  }
  const targets = manifest
    .filter((match) => !options.matchId || match.matchId === options.matchId)
    .filter((match) => (completeCounts.get(match.matchId) ?? 0) < 6)
    .slice(0, Math.min(3, Math.max(1, options.limit ?? 1)));
  const summaries: Array<Record<string, unknown>> = [];
  for (const target of targets) {
    const { input } = await loadStructuredMatch(target.matchId);
    const pack = buildEvidencePack(input);
    const claims = await generateClaimLaboratory(pack);
    const variants = await generateAllPundits({ pack, claims });
    await serviceRest<null>(
      "evaluation_runs?on_conflict=match_id,pundit_id,harness_version,spec_version",
      {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: variants.map((variant) => {
          const hard = variant.results.filter((result) => result.hardGate);
          const qualitative = variant.results.filter((result) => !result.hardGate);
          return {
            match_id: target.matchId,
            pundit_id: variant.candidate.punditId,
            harness_version: "pundit-v1",
            spec_version: variant.candidate.specVersion,
            blind_label: blindLabel(target.matchId, variant.candidate.punditId),
            candidate: variant.candidate,
            hard_gate_pass: hard.length > 0 && hard.every((result) => result.passed),
            qualitative_scores: Object.fromEntries(
              qualitative.map((result) => [result.harness, result.score ?? null]),
            ),
            status: variant.status,
            attempts: variant.attempts,
          };
        }),
      },
    );
    summaries.push({
      matchId: target.matchId,
      variants: variants.length,
      approved: variants.filter((variant) => variant.status === "approved").length,
    });
  }
  return {
    processed: summaries.length,
    remainingMatches: manifest.length - completeCounts.size,
    summaries,
  };
}
