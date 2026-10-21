type RecoveryReceipt = {
  status: string;
  promise_checks: {
    costUsd?: number;
    spend?: { totalUsd?: number };
  } | null;
};

/** The approval is a total across recovery passes, never a fresh dollar per
 * dispatch. Missing receipts are unknown spend, so they stop another call. */
export function remainingRecoveryBudget(
  prior: RecoveryReceipt[],
  maxPasses = 1,
  totalBudgetUsd = 1,
) {
  if (!Number.isInteger(maxPasses) || maxPasses < 1 || maxPasses > 4)
    throw Error("Recovery approval must allow between one and four passes.");
  if (!Number.isFinite(totalBudgetUsd) || totalBudgetUsd <= 0 || totalBudgetUsd > 2)
    throw Error("Recovery budget must be explicitly bounded.");
  if (prior.length >= maxPasses) throw Error("Approved recovery passes exhausted.");
  let spent = 0;
  for (const row of prior) {
    if (row.status === "running" || row.status === "queued")
      throw Error("A recovery is already active.");
    const cost = row.promise_checks?.spend?.totalUsd ?? row.promise_checks?.costUsd;
    if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0)
      throw Error("Prior recovery spend is unknown.");
    spent += cost;
  }
  const remaining = totalBudgetUsd - spent;
  if (remaining <= 0) throw Error("Approved recovery budget exhausted.");
  return remaining;
}
