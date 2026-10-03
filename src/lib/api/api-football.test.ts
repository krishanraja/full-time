import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiFootballClient } from "./api-football.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function stubFetch(responses: Response[]) {
  const paths: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    paths.push(String(input));
    const next = responses.shift();
    if (!next) throw new Error("stub fetch called more times than it was given answers");
    return next;
  }) as typeof fetch;
  return { impl, paths };
}

/** Sleep is a seam so a twenty-five second rate-limit backoff can be proved in
 *  a millisecond. The durations are recorded, because "it retried" and "it
 *  waited before retrying" are different claims. */
function recordingSleep() {
  const waited: number[] = [];
  return { waited, impl: async (ms: number) => void waited.push(ms) };
}

beforeEach(() => {
  process.env.API_FOOTBALL_KEY = "test-key";
});
afterEach(() => {
  delete process.env.API_FOOTBALL_KEY;
});

describe("one client, two failure policies", () => {
  it("returns the response array and counts what the plan was charged", async () => {
    const { impl, paths } = stubFetch([json({ response: [{ fixture: { id: 1 } }] })]);
    const sleep = recordingSleep();
    const client = apiFootballClient({ onError: "empty", fetchImpl: impl, sleepImpl: sleep.impl });

    expect(await client.get("/fixtures?league=39")).toEqual([{ fixture: { id: 1 } }]);
    expect(client.calls()).toBe(1);
    expect(paths[0]).toBe("https://v3.football.api-sports.io/fixtures?league=39");
    // Paced before the request, not after it.
    expect(sleep.waited).toEqual([300]);
  });

  /** The ingest behaviour: one bad endpoint costs one statistic, not the day. */
  it("under empty, reports a provider error as a warning and returns nothing", async () => {
    const { impl } = stubFetch([json({ errors: { token: "invalid" } })]);
    const warnings: string[] = [];
    const client = apiFootballClient({
      onError: "empty",
      fetchImpl: impl,
      sleepImpl: recordingSleep().impl,
      onWarning: (message) => warnings.push(message),
    });

    expect(await client.get("/fixtures/statistics?fixture=1")).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("invalid");
  });

  /** The prediction behaviour: an empty fixture list would be acted on as
   *  "no matches to register", and nobody finds out until a receipt is missing. */
  it("under throw, refuses to turn a provider error into an empty list", async () => {
    const { impl } = stubFetch([json({ errors: { token: "invalid" } })]);
    const client = apiFootballClient({
      onError: "throw",
      fetchImpl: impl,
      sleepImpl: recordingSleep().impl,
    });
    await expect(client.get("/fixtures")).rejects.toThrow(/invalid/);
  });

  it("waits out a rate limit and retries, charging the plan for both", async () => {
    const { impl } = stubFetch([
      json({ errors: { rateLimit: "Too many requests" } }),
      json({ response: [{ fixture: { id: 7 } }] }),
    ]);
    const sleep = recordingSleep();
    const client = apiFootballClient({ onError: "empty", fetchImpl: impl, sleepImpl: sleep.impl });

    expect(await client.get("/fixtures")).toEqual([{ fixture: { id: 7 } }]);
    expect(client.calls()).toBe(2);
    expect(sleep.waited).toEqual([300, 25_000, 300]);
  });

  it("gives up on a rate limit that does not clear, under the caller's policy", async () => {
    const { impl } = stubFetch([
      json({ errors: { rateLimit: "Too many requests" } }),
      json({ errors: { rateLimit: "Too many requests" } }),
    ]);
    const warnings: string[] = [];
    const client = apiFootballClient({
      onError: "empty",
      rateLimitRetries: 1,
      fetchImpl: impl,
      sleepImpl: recordingSleep().impl,
      onWarning: (message) => warnings.push(message),
    });

    expect(await client.get("/fixtures")).toEqual([]);
    expect(warnings[0]).toContain("rateLimit");
  });

  /** The closure this replaced never looked at the status, so a gateway error
   *  returning an HTML page reached JSON.parse and threw - the one failure that
   *  could kill a whole day through a path built to survive one bad endpoint. */
  it("does not let a gateway error page become an exception", async () => {
    const { impl } = stubFetch([new Response("<html>502</html>", { status: 502 })]);
    const warnings: string[] = [];
    const client = apiFootballClient({
      onError: "empty",
      fetchImpl: impl,
      sleepImpl: recordingSleep().impl,
      onWarning: (message) => warnings.push(message),
    });

    expect(await client.get("/fixtures")).toEqual([]);
    expect(warnings[0]).toContain("502");
  });

  /** The provider sends errors as an object when there are some and an empty
   *  array when there are none. An empty array is not an error. */
  it("reads an empty errors array as no error", async () => {
    const { impl } = stubFetch([json({ errors: [], response: [{ fixture: { id: 3 } }] })]);
    const client = apiFootballClient({
      onError: "throw",
      fetchImpl: impl,
      sleepImpl: recordingSleep().impl,
    });
    expect(await client.get("/fixtures")).toEqual([{ fixture: { id: 3 } }]);
  });

  it("refuses to run without a key, whatever the policy", async () => {
    delete process.env.API_FOOTBALL_KEY;
    const client = apiFootballClient({
      onError: "empty",
      fetchImpl: stubFetch([]).impl,
      sleepImpl: recordingSleep().impl,
    });
    await expect(client.get("/fixtures")).rejects.toThrow(/API_FOOTBALL_KEY/);
  });
});
