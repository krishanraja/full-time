import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { runHardGates, publicationDecision } from "../src/lib/pundit/harness";
import { judgeCandidate } from "../src/lib/pundit/pundit-generator.server";
import { onOwnMeter } from "../src/lib/pundit/model-cost";
import { withConcurrency } from "../src/lib/pundit/model-json.server";
import { reviewRequestGuard } from "../src/lib/pundit/review-request-guard";
import type { PunditVariantCandidate, EvidencePack, AnalysisClaim } from "../src/lib/pundit/types";

const report: Record<string, unknown> = {
  passed: false,
  publication: false,
  narration: false,
  databaseWrites: false,
  approvedBudgetUsd: 0.5,
};
const guard = reviewRequestGuard(globalThis.fetch);
const originalFetch = globalThis.fetch;
try {
  const data = JSON.parse(
    Buffer.from(process.env.REVIEW_SUBJECT ?? "", "base64").toString("utf8"),
  ) as {
    candidate: PunditVariantCandidate;
    pack: EvidencePack;
    claims: AnalysisClaim[];
    originalitySources: string[];
  };
  const hash = createHash("sha256").update(data.candidate.displayScript).digest("hex");
  if (
    hash !== process.env.REVIEW_SCRIPT_SHA ||
    data.candidate.punditId !== "zen" ||
    data.pack.matchId !== "af_1557436" ||
    process.env.PUNDIT_JUDGE_MODEL !== "gpt-5.6-terra" ||
    !process.env.OPENAI_API_KEY
  )
    throw Error("Review target or authority mismatch.");
  report.scriptSha256 = hash;
  const hard = runHardGates(data);
  report.hardChecks = hard;
  if (hard.some((check) => !check.passed)) throw Error("Free checks refused the exact draft.");
  globalThis.fetch = guard.guardedFetch;
  const judged = await onOwnMeter(0.5, () => withConcurrency(1, () => judgeCandidate(data)));
  report.editorialChecks = judged.result;
  report.costUsd = judged.costUsd;
  report.passed =
    guard.receipt.calls === 14 &&
    !guard.receipt.stopped &&
    judged.costUsd <= 0.5 &&
    publicationDecision([...hard, ...judged.result]).publishable;
  if (!report.passed) throw Error("Single review refused the draft; narration remains blocked.");
} catch (error) {
  report.failure = error instanceof Error ? error.message : "Review failed closed.";
  process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
  report.requestReceipt = guard.receipt;
  report.costUsd ??= guard.receipt.costUsd;
  await writeFile("listening-review-report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      passed: report.passed,
      calls: guard.receipt.calls,
      costUsd: report.costUsd,
      publication: false,
      narration: false,
    }),
  );
}
