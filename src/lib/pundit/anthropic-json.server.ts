import { z } from "zod";

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

export async function anthropicJson<T>(input: {
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const cachedContext = input.cachedContext ?? [];
  if (cachedContext.length > MAX_CACHED_CONTEXT_BLOCKS) {
    throw new Error(
      `A request may cache at most ${MAX_CACHED_CONTEXT_BLOCKS} context blocks; got ${cachedContext.length}.`,
    );
  }

  const release = await acquirePermit();
  try {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
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
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) {
        const body = await response.text();
        lastError = new Error(`Anthropic ${response.status}: ${body.slice(0, 180)}`);
        if ([429, 500, 502, 503, 529].includes(response.status) && attempt < 3) {
          await sleep(attempt * 2_000);
          continue;
        }
        throw lastError;
      }

      try {
        const body = (await response.json()) as {
          content?: Array<{ text?: string }>;
          stop_reason?: string;
          usage?: {
            input_tokens?: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
          };
        };
        // Caching fails silently: requests still succeed, the bill is just
        // higher. These counters are the only evidence it is working, so they
        // are logged on every call rather than checked once at setup.
        console.log(
          JSON.stringify({
            level: "info",
            message: "anthropic_cache_usage",
            label: input.label ?? "unlabelled",
            model: input.model,
            uncachedInputTokens: body.usage?.input_tokens ?? 0,
            cacheWriteTokens: body.usage?.cache_creation_input_tokens ?? 0,
            cacheReadTokens: body.usage?.cache_read_input_tokens ?? 0,
          }),
        );
        // Truncation is deterministic: the same prompt will truncate again, so
        // say so plainly rather than burning two more identical attempts.
        if (body.stop_reason === "max_tokens") {
          throw new Error(
            `Model response was cut off at the ${input.maxTokens} token limit before the JSON closed.`,
          );
        }
        const parsed = extractJson(body.content?.[0]?.text ?? "");
        return input.schema.parse(parsed);
      } catch (error: unknown) {
        lastError = error;
        if (error instanceof Error && error.message.includes("cut off at the")) throw error;
        if (attempt < 3) await sleep(300 * attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Anthropic JSON generation failed.");
  } finally {
    release();
  }
}
