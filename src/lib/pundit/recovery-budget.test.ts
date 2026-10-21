import { describe, expect, it } from "vitest";
import { remainingRecoveryBudget } from "./recovery-budget";
describe("cumulative recovery approval", () => {
  it("bounds the separately approved fourth review to its additional allowance", () => {
    const prior = [0.277912, 0.281648, 0.282804].map((costUsd) => ({
      status: "quarantined",
      promise_checks: { costUsd },
    }));
    expect(remainingRecoveryBudget(prior, 4, 1.192364)).toBeCloseTo(0.35);
    expect(() => remainingRecoveryBudget(prior, 3, 1.192364)).toThrow(/passes exhausted/);
  });
  it("counts the first failed review against the same dollar", () => {
    expect(
      remainingRecoveryBudget(
        [{ status: "quarantined", promise_checks: { costUsd: 0.277912 } }],
        3,
      ),
    ).toBeCloseTo(0.722088);
  });
  it("does not turn an unused balance into permission for another pass", () => {
    expect(() =>
      remainingRecoveryBudget([{ status: "quarantined", promise_checks: { costUsd: 0.277912 } }]),
    ).toThrow(/passes exhausted/);
  });
  it("reads completed spend and stops at the total budget", () => {
    expect(() =>
      remainingRecoveryBudget(
        [{ status: "passed", promise_checks: { spend: { totalUsd: 1 } } }],
        3,
      ),
    ).toThrow(/budget exhausted/);
  });
  it("refuses an active or unaccounted-for review", () => {
    expect(() => remainingRecoveryBudget([{ status: "running", promise_checks: null }], 3)).toThrow(
      /already active/,
    );
    expect(() => remainingRecoveryBudget([{ status: "failed", promise_checks: null }], 3)).toThrow(
      /unknown/,
    );
  });
});
