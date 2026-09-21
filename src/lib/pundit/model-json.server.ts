import { z } from "zod";
import {
  assertWithinBudget,
  recordSpend,
  spentThisStepUsd,
  type CallUsage,
} from "./model-cost";
import { stubEnabled, stubResponse } from "./model-stub.server";

/** Reads the balanced object that begins at `start`, or undefined when the text
 *  runs out first. */
function balancedObjectAt(text: string, start: number): string | undefined {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return text.slice(start, index + 1);
  }
  return undefined;
}

export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (!cleaned.includes("{")) throw new Error("Model response contained no JSON object.");
  // A model can open its answer with prose that happens to contain a brace, so
  // the first candidate is not always the object. Try each in turn and keep the
  // first that is both balanced and valid JSON.
  let sawBalanced = false;
  for (let start = cleaned.indexOf("{"); start >= 0; start = cleaned.indexOf("{", start + 1)) {
    const candidate = balancedObjectAt(cleaned, start);
    if (!candidate) continue;
    sawBalanced = true;
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }
  throw new Error(
    sawBalanced
      ? "Model response contained no parsable JSON object."
      : "Model response contained unbalanced JSON, which usually means it was cut off by the token limit.",
  );
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

type ReleasePermit = () => void;

let activeRequests = 0;
const permitQueue: Array<(release: ReleasePermit) => void> = [];

function modelConcurrency(): number {
  const configured = Number.parseInt(process.env.PUNDIT_MODEL_CONCURRENCY ?? "6", 10);
  return Number.isFinite(configured) ? Math.min(12, Math.max(1, configured)) : 6;
}

function releasePermit(): void {
  activeRequests = Math.max(0, activeRequests - 1);
  const next = permitQueue.shift();
  if (!next) return;
  activeRequests += 1;
  next(releasePermit);
}

async function acquirePermit(): Promise<ReleasePermit> {
  if (activeRequests < modelConcurrency()) {
    activeRequests += 1;
    return releasePermit;
  }
  return new Promise((resolve) => permitQueue.push(resolve));
}

type ContentBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

/** Caching is a prefix match over the rendered bytes, in the order system then
 *  messages, so anything that varies has to come last. `cachedContext` holds the
 *  stable head of the request, most stable first, and each entry gets its own
 *  breakpoint; `user` is the varying tail and is never marked.
 *
 *  The cap is four breakpoints per request and the system block takes one, so at
 *  most three context entries. Caches are scoped to one model, so the writer and
 *  the judges keep separate entries even when they send the same pack. */
const MAX_CACHED_CONTEXT_BLOCKS = 3;

export function requestContent(cachedContext: readonly unknown[], user: string): ContentBlock[] {
  const cached: ContentBlock[] = cachedContext.map((segment) => ({
    type: "text",
    text: typeof segment === "string" ? segment : JSON.stringify(segment),
    cache_control: { type: "ephemeral" },
  }));
  return [...cached, { type: "text", text: `${user}\n\nReturn only one JSON object.` }];
}

/** What one provider call returned, in the one shape the caller cares about.
 *
 *  `usage` is normalised to the Anthropic field names because `model-cost.ts`
 *  and every log line already speak them. The translation lives in the OpenAI
 *  transport, where the difference is visible, rather than being spread
 *  through the accounting. */
type ProviderResult = {
  text: string;
  truncated: boolean;
  usage: CallUsage;
};

/** Which provider serves a model id.
 *
 *  Dispatching on the id rather than on a separate setting is what makes the
 *  fallback a one-variable change: PUNDIT_WRITER_MODEL and PUNDIT_JUDGE_MODEL
 *  already exist, already reach every call site, and setting one to a gpt- id
 *  moves that role to OpenAI and back again with nothing else touched. A
 *  second switch could disagree with the model name; this cannot. */
export type Provider = "openai" | "anthropic" | "google";

export function providerFor(model: string): Provider {
  if (/^(?:gpt|o\d)/i.test(model)) return "openai";
  if (/^(?:gemini|gemma)/i.test(model)) return "google";
  return "anthropic";
}

/** How long one request may take before it is abandoned.
 *
 *  120 seconds was set for Anthropic and held for a year. The first OpenAI run
 *  died on it: generatePunditStep aborted the writer call, which on a
 *  reasoning model spends wall-clock thinking before it emits a token, and at
 *  16,000 tokens that is minutes rather than seconds.
 *
 *  The platform has the room - the workflow step functions are maxDuration
 *  "max" and the server is 800 seconds - so the choice is between paying in
 *  time and paying in quality, because the lever that buys speed is reasoning
 *  effort. Dropping gpt-5.6-sol from its default to medium effort takes it
 *  from 47.0 to 39.2 on the intelligence index, below the claude-opus-4-8 it
 *  replaced. Time is the cheaper currency here.
 *
 *  Anthropic keeps the value it is known to work with; there is no evidence
 *  for changing it and a longer one only delays a genuine hang. */
const PROVIDER_LABEL: Record<Provider, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
};

const REQUEST_TIMEOUT_MS: Record<Provider, number> = {
  openai: 300_000,
  google: 300_000,
  anthropic: 120_000,
};

async function callAnthropic(
  input: { system: string; user: string; model: string; maxTokens: number },
  cachedContext: readonly unknown[],
): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      // The system prompt is the same bytes on every call of a given kind,
      // so it is the outermost thing worth caching.
      system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: requestContent(cachedContext, input.user) }],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS.anthropic),
  });
}

async function callOpenAi(
  input: { system: string; user: string; model: string; maxTokens: number },
  cachedContext: readonly unknown[],
): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  // OpenAI caches automatically on the request prefix, with no per-block
  // markers, so the cached context is flattened in the same order it would
  // have carried breakpoints. Stable head first, varying tail last: that
  // ordering is what earns the discount on either provider, and it is the
  // reason requestContent's shape is worth preserving here.
  const content = requestContent(cachedContext, input.user)
    .map((block) => block.text)
    .join("\n\n");
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      // Not `max_tokens`, which these models reject.
      max_completion_tokens: input.maxTokens,
      // Belt as well as braces: every caller already asks for one JSON object
      // in the prompt, and this refuses to emit anything else.
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS.openai),
  });
}

async function callGoogle(
  input: { system: string; user: string; model: string; maxTokens: number },
  cachedContext: readonly unknown[],
): Promise<Response> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY missing");
  // Flattened in the same stable-head-first order as the OpenAI path, for the
  // same reason: Gemini caches on the request prefix too.
  const text = requestContent(cachedContext, input.user)
    .map((block) => block.text)
    .join("\n\n");
  // The key goes in a header, not the ?key= query parameter the quickstart
  // uses. A credential in a URL ends up in proxy logs and error messages, and
  // this pipeline already logs every call.
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          maxOutputTokens: input.maxTokens,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS.google),
    },
  );
}

export function readGoogle(body: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
    thoughtsTokenCount?: number;
  };
}): ProviderResult {
  const usage = body.usageMetadata ?? {};
  const cached = usage.cachedContentTokenCount ?? 0;
  return {
    // Several parts are possible; joining them is the same call citedSpan
    // makes about a judge's list, and losing all but the first would silently
    // truncate a long verdict.
    text: (body.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join(""),
    truncated: body.candidates?.[0]?.finishReason === "MAX_TOKENS",
    usage: {
      // promptTokenCount includes the cached portion, exactly as OpenAI's
      // prompt_tokens does and unlike Anthropic's input_tokens.
      input_tokens: Math.max(0, (usage.promptTokenCount ?? 0) - cached),
      // thoughtsTokenCount is reasoning, billed as output and reported
      // SEPARATELY from candidatesTokenCount rather than inside it. Counting
      // only the candidates would under-bill every call and let a run walk
      // past the step ceiling it is supposed to stop at.
      output_tokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: cached,
    },
  };
}

function readAnthropic(body: {
  content?: Array<{ text?: string }>;
  stop_reason?: string;
  usage?: CallUsage;
}): ProviderResult {
  return {
    text: body.content?.[0]?.text ?? "",
    truncated: body.stop_reason === "max_tokens",
    usage: body.usage ?? {},
  };
}

export function readOpenAi(body: {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}): ProviderResult {
  const cached = body.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    text: body.choices?.[0]?.message?.content ?? "",
    truncated: body.choices?.[0]?.finish_reason === "length",
    usage: {
      // OpenAI's prompt_tokens INCLUDES the cached ones and Anthropic's
      // input_tokens excludes them. Passing the raw number through would bill
      // every cached token at the full rate inside the spend ceiling, which
      // would stop runs that are well within budget.
      input_tokens: Math.max(0, (body.usage?.prompt_tokens ?? 0) - cached),
      output_tokens: body.usage?.completion_tokens ?? 0,
      // There is no write premium to account for: OpenAI populates its cache
      // as a side effect of an ordinary request and charges nothing extra.
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: cached,
    },
  };
}

export async function modelJson<T>(input: {
  system: string;
  /** Stable request prefix, most stable first. Each entry is cached. */
  cachedContext?: readonly unknown[];
  /** The part that varies between requests. Never cached. */
  user: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  model: string;
  maxTokens: number;
  /** Names this call in the cache log, so a lost hit rate is traceable. */
  label?: string;
}): Promise<T> {
  const cachedContext = input.cachedContext ?? [];

  // Answered locally, before the key is even looked for, so a stub run needs no
  // credentials and cannot reach the network by accident.
  if (stubEnabled()) {
    return input.schema.parse(stubResponse(input.label ?? "unlabelled", cachedContext, input.user));
  }

  const provider = providerFor(input.model);

  if (cachedContext.length > MAX_CACHED_CONTEXT_BLOCKS) {
    throw new Error(
      `A request may cache at most ${MAX_CACHED_CONTEXT_BLOCKS} context blocks; got ${cachedContext.length}.`,
    );
  }

  const release = await acquirePermit();
  try {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Checked before every request, including retries, so a loop that keeps
      // failing cannot keep spending.
      assertWithinBudget();
      const startedAt = Date.now();
      const response =
        provider === "openai"
          ? await callOpenAi(input, cachedContext)
          : provider === "google"
            ? await callGoogle(input, cachedContext)
            : await callAnthropic(input, cachedContext);

      if (!response.ok) {
        const body = await response.text();
        lastError = new Error(
          `${PROVIDER_LABEL[provider]} ${response.status}: ${body.slice(0, 180)}`,
        );
        if ([429, 500, 502, 503, 529].includes(response.status) && attempt < 3) {
          await sleep(attempt * 2_000);
          continue;
        }
        throw lastError;
      }

      try {
        const raw = (await response.json()) as Record<string, unknown>;
        const result =
          provider === "openai"
            ? readOpenAi(raw)
            : provider === "google"
              ? readGoogle(raw)
              : readAnthropic(raw);
        const callCost = recordSpend(input.model, result.usage);
        // Caching fails silently: requests still succeed, the bill is just
        // higher. These counters are the only evidence it is working, so they
        // are logged on every call rather than checked once at setup.
        console.log(
          JSON.stringify({
            level: "info",
            message: "model_cache_usage",
            provider,
            // Latency was never logged, so the first timeout was a surprise
            // rather than a trend anyone could have seen coming.
            elapsedMs: Date.now() - startedAt,
            label: input.label ?? "unlabelled",
            model: input.model,
            uncachedInputTokens: result.usage.input_tokens ?? 0,
            cacheWriteTokens: result.usage.cache_creation_input_tokens ?? 0,
            cacheReadTokens: result.usage.cache_read_input_tokens ?? 0,
            callCostUsd: Number(callCost.toFixed(4)),
            stepSpendUsd: Number(spentThisStepUsd().toFixed(4)),
          }),
        );
        // Truncation is deterministic: the same prompt will truncate again, so
        // say so plainly rather than burning two more identical attempts.
        if (result.truncated) {
          throw new Error(
            `Model response was cut off at the ${input.maxTokens} token limit before the JSON closed.`,
          );
        }
        const parsed = extractJson(result.text);
        return input.schema.parse(parsed);
      } catch (error: unknown) {
        lastError = error;
        if (error instanceof Error && error.message.includes("cut off at the")) throw error;
        if (attempt < 3) await sleep(300 * attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Model JSON generation failed.");
  } finally {
    release();
  }
}
