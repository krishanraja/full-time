/** One client for the match data provider.
 *
 *  There were two. The ingest cron had a closure that paced at 300ms, retried
 *  a rate limit after twenty-five seconds and returned an empty list on a
 *  provider error, so that one bad endpoint could not take down a whole day of
 *  fixtures. The prediction orchestrator had a function that paced at 300ms,
 *  never retried and threw on anything, because a silently empty fixture list
 *  there means predictions are not registered and nobody finds out until a
 *  receipt is missing.
 *
 *  Both of those are correct for their caller, and that is the point: the
 *  difference is a real decision about what a failure means, not drift. So the
 *  client takes it as an argument rather than picking a side. What was drift
 *  is everything around it - two timeouts, two error shapes, two key lookups,
 *  one of which checked the HTTP status and one of which did not.
 *
 *  Server only. The key never reaches a browser. */

const BASE = "https://v3.football.api-sports.io";

/** Pro tier: 300 requests a minute. The 7000 this replaced was tuned for the
 *  free tier and is a twenty-three minute ingest. */
export const PACE_MS = 300;

/** A rate limit is the one provider answer worth waiting out: it says the data
 *  is there and we asked too quickly. */
const RATE_LIMIT_BACKOFF_MS = 25_000;

export type ProviderErrorPolicy =
  /** Warn and return nothing. For a caller where a missing endpoint should
   *  cost one statistic rather than the whole run. */
  | "empty"
  /** Throw. For a caller where an empty list is indistinguishable from a
   *  correct answer and would be acted on as one. */
  | "throw";

export type ApiFootballOptions = {
  onError: ProviderErrorPolicy;
  timeoutMs?: number;
  rateLimitRetries?: number;
  /** Where a soft failure is reported. Under "empty" a failure that is not
   *  reported anywhere is how a provider withdrawal goes unnoticed. */
  onWarning?: (message: string) => void;
  /** Seams, for tests. A rate-limit retry otherwise takes twenty-five seconds
   *  of real time to prove. */
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
};

export type ApiFootballClient = {
  /** The `response` array of one endpoint, or [] where the policy allows it. */
  get<T = unknown>(path: string): Promise<T[]>;
  /** Requests spent against the plan's quota, retries included. */
  calls(): number;
};

type ProviderPayload = {
  errors?: Record<string, unknown> | unknown[];
  response?: unknown[];
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The provider reports errors in a field that is sometimes an object and
 *  sometimes an empty array, and an empty array of errors is not an error. */
function errorEntries(errors: ProviderPayload["errors"]): string | null {
  if (!errors) return null;
  const keys = Array.isArray(errors) ? errors : Object.keys(errors);
  return keys.length ? JSON.stringify(errors) : null;
}

function isRateLimited(errors: ProviderPayload["errors"]): boolean {
  return Boolean(errors && !Array.isArray(errors) && "rateLimit" in errors);
}

export function apiFootballClient(options: ApiFootballOptions): ApiFootballClient {
  const {
    onError,
    timeoutMs = 30_000,
    rateLimitRetries = 2,
    onWarning,
    fetchImpl = fetch,
    sleepImpl = defaultSleep,
  } = options;

  let spent = 0;

  const fail = (message: string): never | [] => {
    if (onError === "throw") throw new Error(message);
    onWarning?.(message);
    return [];
  };

  async function get<T>(path: string, retries = rateLimitRetries): Promise<T[]> {
    const key = process.env.API_FOOTBALL_KEY;
    if (!key) throw new Error("API_FOOTBALL_KEY is missing.");

    await sleepImpl(PACE_MS);
    spent += 1;

    const response = await fetchImpl(`${BASE}${path}`, {
      headers: { "x-apisports-key": key },
      signal: AbortSignal.timeout(timeoutMs),
    });

    // The ingest closure never checked this, so a gateway error returning an
    // HTML page reached JSON.parse and threw - the one failure that could kill
    // a whole day through a path built to survive one bad endpoint.
    if (!response.ok) {
      return fail(`Match data provider returned ${response.status} for ${path}.`) as T[];
    }

    let payload: ProviderPayload;
    try {
      payload = (await response.json()) as ProviderPayload;
    } catch {
      return fail(`Match data provider sent an unreadable body for ${path}.`) as T[];
    }

    if (isRateLimited(payload.errors) && retries > 0) {
      await sleepImpl(RATE_LIMIT_BACKOFF_MS);
      return get<T>(path, retries - 1);
    }

    const reported = errorEntries(payload.errors);
    if (reported) {
      return fail(`Match data provider error on ${path}: ${reported}`) as T[];
    }

    return (payload.response ?? []) as T[];
  }

  return { get, calls: () => spent };
}
