const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const baseUrl = process.env.FULL_TIME_URL;
const secret = process.env.CRON_SECRET;
const from = args.get("--from");
const to = args.get("--to");
const season = args.get("--season");
const maxDays = Number(args.get("--max-days") ?? 30);

if (!baseUrl || !secret || !from || !to || !season) {
  throw new Error(
    "Usage: FULL_TIME_URL=... CRON_SECRET=... npm run backfill:history -- --from YYYY-MM-DD --to YYYY-MM-DD --season YYYY --max-days 30",
  );
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
  throw new Error("Backfill dates must use YYYY-MM-DD.");
}
if (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > 60) {
  throw new Error("--max-days must be an integer from 1 to 60.");
}

const current = new Date(`${from}T12:00:00Z`);
const finalDate = new Date(`${to}T12:00:00Z`);
let processed = 0;
while (current <= finalDate && processed < maxDays) {
  const date = current.toISOString().slice(0, 10);
  const url = new URL("/api/public/cron/ingest", baseUrl);
  url.searchParams.set("date", date);
  url.searchParams.set("season", season);
  url.searchParams.set("skipCoverage", "1");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(900_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Backfill stopped at ${date}: ${response.status} ${body.slice(0, 300)}`);
  }
  process.stdout.write(`${date} ${body}\n`);
  current.setUTCDate(current.getUTCDate() + 1);
  processed += 1;
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

process.stdout.write(
  JSON.stringify({
    processed,
    nextDate: current <= finalDate ? current.toISOString().slice(0, 10) : null,
    complete: current > finalDate,
  }) + "\n",
);
