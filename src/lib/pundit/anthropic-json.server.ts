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

export async function anthropicJson<T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
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
        const body = (await response.json()) as {
          content?: Array<{ text?: string }>;
          stop_reason?: string;
        };
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
