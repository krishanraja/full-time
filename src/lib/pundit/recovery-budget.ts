type RecoveryReceipt = {
  status: string;
  promise_checks: {
    costUsd?: number;
    spend?: { totalUsd?: number };
  } | null;
};

/** The approval is a total across recovery passes, never a fresh dollar per
 * dispatch. Missing receipts are unknown spend, so they stop another call. */
export function remainingRecoveryBudget(prior: RecoveryReceipt[], maxPasses = 1) {
  if (!Number.isInteger(maxPasses) || maxPasses < 1 || maxPasses > 3)
    throw Error("Recovery approval must allow between one and three passes.");
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
  const remaining = 1 - spent;
  if (remaining <= 0) throw Error("Approved USD 1 recovery budget exhausted.");
  return remaining;
}
