import { expect, it, vi } from "vitest";
import { reviewRequestGuard } from "./review-request-guard";

const request = (label = "a") => ({
  method: "POST",
  body: JSON.stringify({
    model: "gpt-5.6-terra",
    max_completion_tokens: 4000,
    messages: [{ role: "user", content: label }],
  }),
});
const url = "https://api.openai.com/v1/chat/completions";
const response = () =>
  new Response(JSON.stringify({ usage: { prompt_tokens: 100, completion_tokens: 100 } }));

it("measures actual usage and refuses a duplicate before any retry reaches the provider", async () => {
  const provider = vi.fn(async () => response());
  const guard = reviewRequestGuard(provider);
  await guard.guardedFetch(url, request());
  expect(guard.receipt.costUsd).toBeCloseTo(0.0014);
  await expect(guard.guardedFetch(url, request())).rejects.toThrow();
  expect(provider).toHaveBeenCalledTimes(1);
});
it("reserves the next maximum request before starting it", async () => {
  const provider = vi.fn(async () => response());
  const guard = reviewRequestGuard(provider, 0.01);
  await expect(guard.guardedFetch(url, request())).rejects.toThrow(/budget/);
  expect(provider).not.toHaveBeenCalled();
});
it("stops the whole review after a provider failure or unknown usage", async () => {
  for (const bad of [new Response("unavailable", { status: 503 }), new Response("{}")]) {
    const provider = vi.fn(async () => bad);
    const guard = reviewRequestGuard(provider);
    await expect(guard.guardedFetch(url, request())).rejects.toThrow();
    await expect(guard.guardedFetch(url, request("b"))).rejects.toThrow();
    expect(provider).toHaveBeenCalledTimes(1);
  }
});
it("never starts a fifteenth request or a different endpoint", async () => {
  const provider = vi.fn(async () => response());
  const guard = reviewRequestGuard(provider);
  for (let index = 0; index < 14; index++) await guard.guardedFetch(url, request(String(index)));
  await expect(guard.guardedFetch(url, request("extra"))).rejects.toThrow();
  expect(provider).toHaveBeenCalledTimes(14);
  const other = reviewRequestGuard(provider);
  await expect(other.guardedFetch("https://example.com", request())).rejects.toThrow();
  expect(provider).toHaveBeenCalledTimes(14);
});
