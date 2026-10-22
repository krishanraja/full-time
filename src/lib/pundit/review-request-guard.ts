import { createHash } from "node:crypto";
import { callCostUsd } from "./model-cost";
import { readOpenAi } from "./model-json.server";

/** One sequential, non-retrying review. Reserve a conservative upper bound
 * before each call, then replace it with the response's measured usage. */
export function reviewRequestGuard(providerFetch: typeof fetch, ceilingUsd = 0.5) {
  const seen = new Set<string>();
  const receipt = { calls: 0, costUsd: 0, stopped: false };
  const guardedFetch: typeof fetch = async (url, init) => {
    if (receipt.stopped) throw Error("Review stopped; no further requests authorised.");
    const body = String(init?.body ?? "");
    const hash = createHash("sha256").update(body).digest("hex");
    const request = JSON.parse(body);
    if (
      String(url) !== "https://api.openai.com/v1/chat/completions" ||
      init?.method !== "POST" ||
      request.model !== "gpt-5.6-terra" ||
      seen.has(hash) ||
      receipt.calls >= 14
    ) {
      receipt.stopped = true;
      throw Error("Request outside the approved non-retrying review.");
    }
    const output = request.max_completion_tokens;
    if (!Number.isInteger(output) || output < 1 || output > 4000) {
      receipt.stopped = true;
      throw Error("Review output bound invalid.");
    }
    // UTF-8 byte count bounds the token count conservatively; include message
    // framing overhead as well. No cache discount is assumed before a call.
    const reservation = callCostUsd(request.model, {
      input_tokens: Buffer.byteLength(body, "utf8") + 1024,
      output_tokens: output,
    });
    if (receipt.costUsd + reservation > ceilingUsd) {
      receipt.stopped = true;
      throw Error("Remaining review budget cannot cover the next bounded request.");
    }
    seen.add(hash);
    receipt.calls++;
    try {
      const response = await providerFetch(url, init);
      if (!response.ok) throw Error("Review provider declined the request.");
      const raw = await response.clone().json();
      if (
        !raw.usage ||
        !Number.isFinite(raw.usage.prompt_tokens) ||
        !Number.isFinite(raw.usage.completion_tokens)
      ) {
        throw Error("Review usage could not be measured.");
      }
      receipt.costUsd += callCostUsd(request.model, readOpenAi(raw).usage);
      if (receipt.costUsd > ceilingUsd) throw Error("Review spend exceeded its reservation.");
      return response;
    } catch {
      receipt.stopped = true;
      throw Error("Review request failed; no retry or further request authorised.");
    }
  };
  return { guardedFetch, receipt };
}
