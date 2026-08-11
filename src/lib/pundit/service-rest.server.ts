function serviceConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service configuration is missing.");
  return { url, key };
}

export async function serviceRest<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    prefer?: string;
    range?: { from: number; to: number };
  } = {},
): Promise<T> {
  const { url, key } = serviceConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...(init.range ? { Range: `${init.range.from}-${init.range.to}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Supabase service ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function serviceRestAll<T>(path: string, pageSize = 1_000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await serviceRest<T[]>(path, {
      range: { from, to: from + pageSize - 1 },
    });
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function serviceRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { url, key } = serviceConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Supabase RPC ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
