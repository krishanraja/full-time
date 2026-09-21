import { describe, expect, it } from "vitest";
import {
  extractJson,
  providerFor,
  readGoogle,
  readOpenAi,
  requestContent,
} from "./model-json.server";
import { callCostUsd } from "./model-cost";

describe("reading one JSON object out of a model response", () => {
  it("reads a bare object", () => {
    expect(extractJson('{"score":4}')).toEqual({ score: 4 });
  });

  it("reads an object inside a fenced block", () => {
    expect(extractJson('```json\n{"score":4}\n```')).toEqual({ score: 4 });
  });

  it("skips a brace that appears in prose before the object", () => {
    const text = 'Here is the shape { as described } and now the answer:\n{"score":5}';
    expect(extractJson(text)).toEqual({ score: 5 });
  });

  it("keeps braces that sit inside strings", () => {
    expect(extractJson('{"failure":"the { character"}')).toEqual({
      failure: "the { character",
    });
  });

  it("explains that a cut-off response is the likely cause", () => {
    expect(() => extractJson('{"score":4,"failure":"never clo')).toThrow(/cut off/i);
  });

  it("rejects a response with no object at all", () => {
    expect(() => extractJson("no JSON here")).toThrow(/no JSON object/i);
  });
});

describe("cache breakpoint placement", () => {
  it("marks every stable block and never the varying tail", () => {
    const blocks = requestContent([{ pack: 1 }, { spec: 2 }], '{"rubric":"humour"}');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[1].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[2].cache_control).toBeUndefined();
  });

  it("keeps the varying content last, where it cannot invalidate a prefix", () => {
    const blocks = requestContent([{ pack: 1 }], "VARYING");
    expect(blocks.at(-1)?.text).toContain("VARYING");
    expect(blocks.at(-1)?.cache_control).toBeUndefined();
  });

  it("still works with nothing cached", () => {
    const blocks = requestContent([], "just this");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].cache_control).toBeUndefined();
  });

  it("serialises stable blocks deterministically", () => {
    const segment = { evidencePack: { facts: [1, 2] }, licensedClaims: ["a"] };
    expect(requestContent([segment], "x")[0].text).toBe(requestContent([segment], "y")[0].text);
  });
});

describe("which provider serves a model", () => {
  it("routes gpt ids to OpenAI and everything else to Anthropic", () => {
    for (const model of ["gpt-5.6-sol", "gpt-5.6-terra", "GPT-6-astra", "o3-mini"]) {
      expect(providerFor(model)).toBe("openai");
    }
    for (const model of ["claude-opus-4-8", "claude-sonnet-4-6", "claude-opus-5"]) {
      expect(providerFor(model)).toBe("anthropic");
    }
  });
});

/** The two providers count input tokens differently and the spend ceiling
 *  believes whatever it is handed. OpenAI's prompt_tokens INCLUDES the cached
 *  ones; Anthropic's input_tokens excludes them. Passing the raw number
 *  through bills every cached token at the full rate, which halts runs that
 *  are well inside budget - the opposite of the failure the ceiling exists to
 *  prevent, and invisible because the run just stops. */
describe("OpenAI usage is translated, not copied", () => {
  const body = (cached: number, prompt: number, completion: number) => ({
    choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }],
    usage: {
      prompt_tokens: prompt,
      completion_tokens: completion,
      prompt_tokens_details: { cached_tokens: cached },
    },
  });

  it("subtracts the cached tokens from the billable input", () => {
    expect(readOpenAi(body(3_000, 5_000, 800)).usage).toEqual({
      input_tokens: 2_000,
      output_tokens: 800,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 3_000,
    });
  });

  it("prices a cached-heavy call far below a raw copy of prompt_tokens", () => {
    const translated = callCostUsd("gpt-5.6-terra", readOpenAi(body(9_000, 10_000, 500)).usage);
    const naive = callCostUsd("gpt-5.6-terra", { input_tokens: 10_000, output_tokens: 500 });
    expect(translated).toBeLessThan(naive);
  });

  it("never reports negative input when the provider rounds oddly", () => {
    expect(readOpenAi(body(600, 500, 10)).usage.input_tokens).toBe(0);
  });

  it("reads truncation from finish_reason", () => {
    expect(readOpenAi(body(0, 10, 10)).truncated).toBe(false);
    expect(
      readOpenAi({ choices: [{ message: { content: "{" }, finish_reason: "length" }] }).truncated,
    ).toBe(true);
  });

  it("copes with a response carrying no usage at all", () => {
    expect(readOpenAi({}).usage.input_tokens).toBe(0);
    expect(readOpenAi({}).text).toBe("");
  });
});

/** An unpriced model bills at the dearest rate known, which would make the
 *  fallback look like the most expensive thing in the system and stop runs
 *  early for no reason. */
describe("the fallback models are priced", () => {
  it("prices the writer and the judges below the Claude models they replace", () => {
    const usage = { input_tokens: 100_000, output_tokens: 20_000 };
    expect(callCostUsd("gpt-5.6-sol", usage)).toBeLessThan(callCostUsd("claude-opus-4-8", usage));
    expect(callCostUsd("gpt-5.6-terra", usage)).toBeLessThan(
      callCostUsd("claude-sonnet-4-6", usage),
    );
  });

  it("does not fall through to the unknown-model rate", () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 0 };
    for (const model of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]) {
      expect(callCostUsd(model, usage)).toBeLessThan(callCostUsd("definitely-not-a-model", usage));
    }
  });
});

describe("Google is routed and read correctly", () => {
  it("routes gemini and gemma ids to Google", () => {
    for (const model of ["gemini-3.8-flash", "gemini-3-8-flash", "gemma-4-31b"]) {
      expect(providerFor(model)).toBe("google");
    }
    expect(providerFor("gpt-5.6-sol")).toBe("openai");
    expect(providerFor("claude-opus-4-8")).toBe("anthropic");
  });

  const body = (over: Record<string, unknown> = {}) => ({
    candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: "STOP" }],
    usageMetadata: {
      promptTokenCount: 5_000,
      candidatesTokenCount: 800,
      cachedContentTokenCount: 3_000,
      thoughtsTokenCount: 400,
      ...over,
    },
  });

  /** thoughtsTokenCount is reasoning, billed as output and reported SEPARATELY
   *  from candidatesTokenCount rather than inside it. Counting only the
   *  candidates under-bills every call and lets a run walk past the step
   *  ceiling it exists to stop at. */
  it("bills reasoning tokens as output alongside the candidates", () => {
    expect(readGoogle(body()).usage).toEqual({
      input_tokens: 2_000,
      output_tokens: 1_200,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 3_000,
    });
  });

  it("subtracts the cached portion from promptTokenCount", () => {
    expect(readGoogle(body({ cachedContentTokenCount: 0 })).usage.input_tokens).toBe(5_000);
  });

  it("joins several parts rather than keeping only the first", () => {
    expect(
      readGoogle({
        candidates: [{ content: { parts: [{ text: '{"a":1,' }, { text: '"b":2}' }] } }],
      }).text,
    ).toBe('{"a":1,"b":2}');
  });

  it("reads truncation from MAX_TOKENS", () => {
    expect(readGoogle(body()).truncated).toBe(false);
    expect(
      readGoogle({ candidates: [{ content: { parts: [] }, finishReason: "MAX_TOKENS" }] }).truncated,
    ).toBe(true);
  });

  it("copes with a response carrying nothing", () => {
    expect(readGoogle({}).text).toBe("");
    expect(readGoogle({}).usage.output_tokens).toBe(0);
  });

  it("prices the flash judges well below the OpenAI bench", () => {
    const usage = { input_tokens: 100_000, output_tokens: 20_000 };
    expect(callCostUsd("gemini-3.8-flash", usage)).toBeLessThan(
      callCostUsd("gpt-5.6-terra", usage),
    );
    for (const spelling of ["gemini-3.8-flash", "gemini-3-8-flash"]) {
      expect(callCostUsd(spelling, usage)).toBeLessThan(
        callCostUsd("definitely-not-a-model", usage),
      );
    }
  });
});
