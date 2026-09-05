/** What a model call costs, and the ceiling that stops a runaway one.
 *
 *  A pipeline that spends money per call needs the spend to be visible in the
 *  code, not only on the invoice at the end of the month. The guard here is
 *  deliberately dumb: it counts what has actually been billed and refuses to
 *  start another call once a ceiling is crossed. */

/** US dollars per million tokens, as published for the first-party API. */
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** An unrecognised model is priced at the dearest rate we know. Guessing high
 *  stops a run early; guessing low lets it run past the ceiling unnoticed. */
const UNKNOWN_MODEL_PRICE = { input: 10, output: 50 };

/** Cache reads bill at a tenth of the input rate; writes carry a premium. */
const CACHE_READ_RATE = 0.1;
const CACHE_WRITE_RATE = 1.25;

export type CallUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export function callCostUsd(model: string, usage: CallUsage | undefined): number {
  const price = MODEL_PRICES[model] ?? UNKNOWN_MODEL_PRICE;
  const input = usage?.input_tokens ?? 0;
  const output = usage?.output_tokens ?? 0;
  const write = usage?.cache_creation_input_tokens ?? 0;
  const read = usage?.cache_read_input_tokens ?? 0;
  const dollars =
    input * price.input +
    write * price.input * CACHE_WRITE_RATE +
    read * price.input * CACHE_READ_RATE +
    output * price.output;
  return dollars / 1_000_000;
}

/** The ceiling applies to one process, which for this pipeline is one workflow
 *  step: a single pundit's repair loop. Six pundits run as six steps, so the
 *  whole run is bounded by roughly six times this. It is stated per step rather
 *  than per run because a step is the largest unit that shares memory, and a
 *  guard that quietly failed to cover the run would be worse than none. */
function stepCeilingUsd(): number {
  const configured = Number.parseFloat(process.env.PUNDIT_MAX_STEP_COST_USD ?? "1.5");
  return Number.isFinite(configured) && configured > 0 ? configured : 1.5;
}

let spentUsd = 0;

export function recordSpend(model: string, usage: CallUsage | undefined): number {
  const cost = callCostUsd(model, usage);
  spentUsd += cost;
  return cost;
}

export function spentThisStepUsd(): number {
  return spentUsd;
}

/** Test seam, and a reset point for a long-lived process. */
export function resetSpend(): void {
  spentUsd = 0;
}

export class BudgetExceededError extends Error {
  constructor(spent: number, ceiling: number) {
    super(
      `Model spend for this step reached $${spent.toFixed(2)}, over the $${ceiling.toFixed(2)} ceiling. ` +
        `Raise PUNDIT_MAX_STEP_COST_USD deliberately if this run is meant to cost more.`,
    );
    this.name = "BudgetExceededError";
  }
}

/** Called before every request. Throws rather than returning a flag, so a new
 *  call site cannot forget to check it. */
export function assertWithinBudget(): void {
  const ceiling = stepCeilingUsd();
  if (spentUsd >= ceiling) throw new BudgetExceededError(spentUsd, ceiling);
}
