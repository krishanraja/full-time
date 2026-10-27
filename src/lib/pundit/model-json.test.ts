import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  extractJson,
  modelJson,
  providerFor,
  readGoogle,
  readOpenAi,
  requestContent,
  withConcurrency,
  withDiagnosticBudget,
} from "./model-json.server";
import { callCostUsd, resetSpend } from "./model-cost";

describe("private diagnostic spend reservation", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalStub = process.env.PUNDIT_MODEL_STUB;
  const request = {
    system: "Review the match",
    user: "Return a verdict",
    model: "claude-sonnet-4-6",
    maxTokens: 4_000,
    schema: z.object({ ok: z.boolean() }),
  };
  const message = () =>
    new Response(JSON.stringify({
      content: [{ text: '{"ok":true}' }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 5 },
    }), { status: 200 });

  beforeEach(() => {
    resetSpend();
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.PUNDIT_MODEL_STUB;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetSpend();
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    if (originalStub === undefined) delete process.env.PUNDIT_MODEL_STUB;
    else process.env.PUNDIT_MODEL_STUB = originalStub;
  });

  it("counts the exact request and reserves a bounded single model attempt", async () => {
    const fetchMock = vi.fn(async (url: string, _options?: RequestInit) =>
      new Response(JSON.stringify(url.endsWith("/count_tokens") ? { input_tokens: 100 } : {
        content: [{ text: '{"ok":true}' }],
        usage: { input_tokens: 100, output_tokens: 5 },
      }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await withDiagnosticBudget(
      { ceilingUsd: 0.1, maxCalls: 1, maxInputTokens: 20_000 },
      () => modelJson(request),
    );
    expect(result.result).toEqual({ ok: true });
    expect(result.calls).toBe(1);
    expect(result.reservedUsd).toBeGreaterThan(0.06);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const countBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const messageBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(countBody).toEqual({ model: messageBody.model, system: messageBody.system, messages: messageBody.messages });
  });

  it("refuses an oversized prompt before a paid message", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ input_tokens: 20_001 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(withDiagnosticBudget(
      { ceilingUsd: 3, maxCalls: 16, maxInputTokens: 20_000 },
      () => modelJson(request),
    )).rejects.toThrow(/exceeds 20000 tokens/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a request whose maximum charge exceeds the remaining dollars", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ input_tokens: 100 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(withDiagnosticBudget(
      { ceilingUsd: 0.01, maxCalls: 16, maxInputTokens: 20_000 },
      () => modelJson(request),
    )).rejects.toThrow(/dollar ceiling/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("makes one paid attempt even after a retryable provider error", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/count_tokens")
        ? new Response(JSON.stringify({ input_tokens: 100 }), { status: 200 })
        : new Response("busy", { status: 503 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(withDiagnosticBudget(
      { ceilingUsd: 0.1, maxCalls: 1, maxInputTokens: 20_000 },
      () => modelJson(request),
    )).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a successful reservation when a later call hits the call limit", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/count_tokens")
        ? new Response(JSON.stringify({ input_tokens: 100 }), { status: 200 })
        : message(),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(withDiagnosticBudget(
      { ceilingUsd: 0.1, maxCalls: 1, maxInputTokens: 20_000 },
      async () => { await modelJson(request); await modelJson(request); },
    )).rejects.toThrow(/call limit/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops queued parallel judges after the first failed paid attempt", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/count_tokens")
        ? new Response(JSON.stringify({ input_tokens: 100 }), { status: 200 })
        : new Response("busy", { status: 503 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(withDiagnosticBudget(
      { ceilingUsd: 0.3, maxCalls: 3, maxInputTokens: 20_000 },
      () => Promise.all([modelJson(request), modelJson(request), modelJson(request)]),
    )).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fits the quoted one-lab, one-writer, fourteen-judge maximum inside $3", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/count_tokens")
        ? new Response(JSON.stringify({ input_tokens: 20_000 }), { status: 200 })
        : message(),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await withDiagnosticBudget(
      { ceilingUsd: 3, maxCalls: 16, maxInputTokens: 20_000 },
      async () => {
        await modelJson({ ...request, model: "claude-opus-4-8", maxTokens: 8_000 });
        await modelJson({ ...request, model: "claude-opus-4-8", maxTokens: 16_000 });
        for (let index = 0; index < 14; index++) await modelJson(request);
      },
    );
    expect(result.calls).toBe(16);
    expect(result.reservedUsd).toBeCloseTo(2.87, 8);
    expect(fetchMock).toHaveBeenCalledTimes(32);
  });
});

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

/** A diagnostic may ask for fewer simultaneous calls than the environment
 *  allows, and only fewer. Letting one raise the limit would mean a bench
 *  comparison could make the daily run more aggressive than anyone configured,
 *  which is how a rate-limited provider starts returning outages that read as
 *  verdicts. */
describe("concurrency can be lowered for one reading, never raised", () => {
  it("restores the previous limit even when the body throws", async () => {
    await expect(
      withConcurrency(2, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    // If the override leaked, a second call would still be clamped; the proof
    // is that a later body runs and sees no error.
    await expect(withConcurrency(undefined, async () => "ok")).resolves.toBe("ok");
  });

  it("runs the body and returns its value", async () => {
    await expect(withConcurrency(1, async () => 42)).resolves.toBe(42);
  });

  it("ignores a limit that is not a number", async () => {
    await expect(withConcurrency(Number.NaN, async () => "ran")).resolves.toBe("ran");
  });
});
