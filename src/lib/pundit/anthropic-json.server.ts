import { z } from "zod";

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("Model response contained no JSON object.");
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index++) {
    const char = cleaned[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
  }
  throw new Error("Model response contained unbalanced JSON.");
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

export async function anthropicJson<T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  model: string;
  maxTokens: number;
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

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
          system: input.system,
          messages: [
            {
              role: "user",
              content: `${input.user}\n\nReturn only one JSON object.`,
            },
          ],
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
        const body = (await response.json()) as { content?: Array<{ text?: string }> };
        const parsed = extractJson(body.content?.[0]?.text ?? "");
        return input.schema.parse(parsed);
      } catch (error: unknown) {
        lastError = error;
        if (attempt < 3) await sleep(300 * attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Anthropic JSON generation failed.");
  } finally {
    release();
  }
}
