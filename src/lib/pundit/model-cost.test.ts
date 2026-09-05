import { afterEach, describe, expect, it } from "vitest";
import {
  assertWithinBudget,
  BudgetExceededError,
  callCostUsd,
  recordSpend,
  resetSpend,
  spentThisStepUsd,
} from "./model-cost";
import { failureSignature } from "./pundit-generator.server";

afterEach(() => {
  resetSpend();
  delete process.env.PUNDIT_MAX_STEP_COST_USD;
});

describe("what a call costs", () => {
  it("prices input and output at the model's published rates", () => {
    // Opus: $5 per million in, $25 per million out.
    const cost = callCostUsd("claude-opus-4-8", {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(30, 5);
  });

  it("charges a cache read at a tenth of the input rate", () => {
    const read = callCostUsd("claude-opus-4-8", { cache_read_input_tokens: 1_000_000 });
    const fresh = callCostUsd("claude-opus-4-8", { input_tokens: 1_000_000 });
    expect(read).toBeCloseTo(fresh * 0.1, 5);
  });

  it("charges a cache write at a premium over plain input", () => {
    const write = callCostUsd("claude-opus-4-8", { cache_creation_input_tokens: 1_000_000 });
    const fresh = callCostUsd("claude-opus-4-8", { input_tokens: 1_000_000 });
    expect(write).toBeGreaterThan(fresh);
  });

  it("prices an unknown model at the dearest known rate, so a guard trips early", () => {
    const unknown = callCostUsd("some-future-model", { input_tokens: 1_000_000 });
    const dearest = callCostUsd("claude-fable-5-1", { input_tokens: 1_000_000 });
    expect(unknown).toBe(dearest);
  });

  it("treats missing usage as free rather than throwing", () => {
    expect(callCostUsd("claude-opus-4-8", undefined)).toBe(0);
  });
});

describe("the spend ceiling", () => {
  it("allows calls until the ceiling is reached", () => {
    process.env.PUNDIT_MAX_STEP_COST_USD = "1";
    recordSpend("claude-opus-4-8", { output_tokens: 10_000 }); // $0.25
    expect(spentThisStepUsd()).toBeCloseTo(0.25, 5);
    expect(() => assertWithinBudget()).not.toThrow();
  });

  it("refuses the next call once spend crosses the ceiling", () => {
    process.env.PUNDIT_MAX_STEP_COST_USD = "1";
    recordSpend("claude-opus-4-8", { output_tokens: 50_000 }); // $1.25
    expect(() => assertWithinBudget()).toThrow(BudgetExceededError);
  });

  it("names the ceiling in the error, so the fix is obvious", () => {
    process.env.PUNDIT_MAX_STEP_COST_USD = "0.5";
    recordSpend("claude-opus-4-8", { output_tokens: 50_000 });
    expect(() => assertWithinBudget()).toThrow(/PUNDIT_MAX_STEP_COST_USD/);
  });

  it("accumulates across calls rather than judging each one alone", () => {
    process.env.PUNDIT_MAX_STEP_COST_USD = "0.3";
    for (let call = 0; call < 5; call++) {
      recordSpend("claude-opus-4-8", { output_tokens: 4_000 }); // $0.10 each
    }
    expect(() => assertWithinBudget()).toThrow(BudgetExceededError);
  });
});

describe("stopping a repair loop that is not converging", () => {
  const result = (harness: string, passed: boolean) => ({ harness, hardGate: true, passed });

  it("summarises which gates failed, order-independently", () => {
    const a = failureSignature([result("humour", false), result("insight", false)]);
    const b = failureSignature([result("insight", false), result("humour", false)]);
    expect(a).toBe(b);
    expect(a).toBe("humour,insight");
  });

  it("ignores gates that passed", () => {
    expect(failureSignature([result("humour", false), result("clarity", true)])).toBe("humour");
  });

  it("is empty when everything passed", () => {
    expect(failureSignature([result("humour", true)])).toBe("");
  });

  it("distinguishes a different set of failures", () => {
    expect(failureSignature([result("humour", false)])).not.toBe(
      failureSignature([result("humour", false), result("insight", false)]),
    );
  });
});
