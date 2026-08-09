import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, Share2 } from "lucide-react";
import { HapticButton } from "../components/HapticButton";
import { PERSONALITIES, type PersonalityId } from "../components/PersonalitySelector";
import { VOICE_STYLE_STORAGE_KEY } from "@/lib/entitlement";
import { pageSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Prediction = {
  id: string;
  match_id: string;
  kickoff_at: string;
  thesis: string;
  measurable_advantage: string;
  indicator: string;
  expected_turning_point: string;
  status: "open" | "correct" | "partly_correct" | "wrong" | "unjudgeable";
  pundit_probabilities: { home?: number; draw?: number; away?: number };
  brier_score: number | null;
  settlement: { outcome?: "home" | "draw" | "away" } | null;
  receipt: string | null;
};

export const Route = createFileRoute("/receipts")({
  head: () =>
    pageSeo({
      path: "/receipts",
      title: "Prediction Receipts - Full Time",
      description:
        "Every Full Time pundit prediction, settlement, calibration score and change of mind.",
    }),
  component: Receipts,
});

function Receipts() {
  const [pundit, setPundit] = useState<PersonalityId>("zen");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "settled" | "wrong">("all");
  useEffect(() => {
    const saved = localStorage.getItem(VOICE_STYLE_STORAGE_KEY);
    if (PERSONALITIES.some((item) => item.id === saved)) setPundit(saved as PersonalityId);
  }, []);

  const query = useQuery<Prediction[]>({
    queryKey: ["prediction-receipts", pundit],
    queryFn: async () => {
      const response = await fetch(`/api/public/pundits/${pundit}/predictions`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error("Receipts are not available yet.");
      return (await response.json()) as Prediction[];
    },
    retry: 1,
    staleTime: 60_000,
  });

  const settled = useMemo(
    () =>
      (query.data ?? []).filter((item) => item.status !== "open" && item.status !== "unjudgeable"),
    [query.data],
  );
  const correctRate = settled.length
    ? settled.reduce(
        (sum, item) =>
          sum + (item.status === "correct" ? 1 : item.status === "partly_correct" ? 0.5 : 0),
        0,
      ) / settled.length
    : null;
  const scored = settled.filter((item) => item.brier_score != null);
  const meanBrier = scored.length
    ? scored.reduce((sum, item) => sum + (item.brier_score ?? 0), 0) / scored.length
    : null;
  const calibrationPairs = scored.flatMap((item) => {
    const outcome = item.settlement?.outcome;
    if (!outcome) return [];
    return (["home", "draw", "away"] as const).flatMap((key) => {
      const probability = item.pundit_probabilities[key];
      return typeof probability === "number"
        ? [{ probability, observed: Number(key === outcome) }]
        : [];
    });
  });
  const calibrationBuckets = Array.from({ length: 10 }, (_, index) => {
    const rows = calibrationPairs.filter(
      (pair) => Math.min(9, Math.floor(pair.probability * 10)) === index,
    );
    if (!rows.length) return null;
    const predicted = rows.reduce((sum, row) => sum + row.probability, 0) / rows.length;
    const observed = rows.reduce((sum, row) => sum + row.observed, 0) / rows.length;
    return { count: rows.length, predicted, observed };
  }).filter((bucket): bucket is NonNullable<typeof bucket> => bucket !== null);
  const calibrationGap = calibrationPairs.length
    ? calibrationBuckets.reduce(
        (sum, bucket) =>
          sum +
          (bucket.count / calibrationPairs.length) * Math.abs(bucket.predicted - bucket.observed),
        0,
      )
    : null;
  const visiblePredictions = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (query.data ?? []).filter((prediction) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && prediction.status === "open") ||
        (statusFilter === "settled" &&
          prediction.status !== "open" &&
          prediction.status !== "unjudgeable") ||
        (statusFilter === "wrong" && prediction.status === "wrong");
      if (!matchesStatus) return false;
      if (!needle) return true;
      return [
        prediction.thesis,
        prediction.measurable_advantage,
        prediction.indicator,
        prediction.expected_turning_point,
        prediction.receipt ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(needle));
    });
  }, [query.data, search, statusFilter]);

  const share = async (prediction: Prediction) => {
    const text = prediction.receipt ?? `${prediction.thesis} Settlement: ${prediction.status}.`;
    if (navigator.share)
      await navigator.share({ title: "Full Time receipt", text, url: window.location.href });
    else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
  };

  return (
    <div className="pb-6 pt-4">
      <div className="grid gap-8 md:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] md:gap-10">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="eyebrow">Prediction accountability</div>
          <h1 className="mb-3 mt-3 text-[42px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[52px]">
            The receipts.
          </h1>
          <p className="max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
            Claims lock before kickoff. Wrong calls stay visible. Calibration matters more than
            victory laps.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {PERSONALITIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPundit(item.id)}
                aria-pressed={pundit === item.id}
                className={cn(
                  "min-h-11 rounded-[var(--radius-lg)] border px-3 py-2 text-left text-xs font-semibold",
                  pundit === item.id
                    ? "border-[var(--lime)] bg-[color:color-mix(in_oklab,var(--lime)_9%,transparent)] text-[var(--lime)]"
                    : "border-[var(--pitch-line)] text-muted-foreground",
                )}
              >
                {item.name.replace("The ", "")}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="surface rounded-[var(--radius-lg)] p-4">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Settled
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {settled.length || "-"}
              </div>
            </div>
            <div className="surface rounded-[var(--radius-lg)] p-4">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Calibration gap
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {calibrationGap == null ? "-" : calibrationGap.toFixed(3)}
              </div>
            </div>
            <div className="surface rounded-[var(--radius-lg)] p-4">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Brier score
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {meanBrier == null ? "-" : meanBrier.toFixed(3)}
              </div>
            </div>
          </div>
          {correctRate != null && (
            <p className="mt-3 text-xs text-muted-foreground">
              Directional settlement rate: {Math.round(correctRate * 100)}%. This is not a
              substitute for calibration.
            </p>
          )}
        </div>

        <div className="min-w-0 md:pt-5">
          <div className="border-b border-[var(--pitch-line)] pb-4">
            <div className="eyebrow">Public prediction ledger</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_max-content]">
              <label className="relative block">
                <span className="sr-only">Search prediction receipts</span>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search claims and receipts"
                  className="min-h-11 w-full rounded-[var(--radius-lg)] border border-[var(--pitch-line)] bg-card py-2 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)]"
                />
              </label>
              <label>
                <span className="sr-only">Filter receipts by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | "open" | "settled" | "wrong")
                  }
                  className="min-h-11 w-full rounded-[var(--radius-lg)] border border-[var(--pitch-line)] bg-card px-3 text-sm font-semibold outline-none focus:border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] sm:w-auto"
                >
                  <option value="all">All predictions</option>
                  <option value="open">Open</option>
                  <option value="settled">Settled</option>
                  <option value="wrong">Wrong calls</option>
                </select>
              </label>
            </div>
          </div>

          {query.isLoading ? (
            <div className="mt-6 h-40 animate-pulse rounded-[var(--radius-lg)] bg-card" />
          ) : query.isError || !query.data?.length ? (
            <div className="surface mt-6 rounded-[var(--radius-lg)] p-5">
              <div className="eyebrow">Ledger not public yet</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Public scores stay hidden until the shared forecast beats the league base-rate
                baseline in held-out testing.
              </p>
            </div>
          ) : visiblePredictions.length === 0 ? (
            <div className="surface mt-6 rounded-[var(--radius-lg)] p-5">
              <div className="eyebrow">No matching receipts</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Try another phrase or prediction status.
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {visiblePredictions.map((prediction) => (
                <article key={prediction.id} className="surface rounded-[var(--radius-lg)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {new Date(prediction.kickoff_at).toLocaleDateString()}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-1 text-mono text-[9px] uppercase tracking-[0.14em]",
                        prediction.status === "correct"
                          ? "border-[color:color-mix(in_oklab,var(--lime)_45%,transparent)] text-[var(--lime)]"
                          : prediction.status === "wrong"
                            ? "border-red-400/30 text-red-300"
                            : "border-[var(--pitch-line)] text-muted-foreground",
                      )}
                    >
                      {prediction.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-relaxed">{prediction.thesis}</p>
                  <dl className="mt-3 grid gap-2 border-t border-[var(--pitch-line)] pt-3 text-xs leading-relaxed text-muted-foreground">
                    <div>
                      <dt className="text-mono text-[9px] uppercase tracking-[0.14em] text-foreground/60">
                        Measurable edge
                      </dt>
                      <dd className="mt-1">{prediction.measurable_advantage}</dd>
                    </div>
                    <div>
                      <dt className="text-mono text-[9px] uppercase tracking-[0.14em] text-foreground/60">
                        Watch
                      </dt>
                      <dd className="mt-1">{prediction.indicator}</dd>
                    </div>
                    <div>
                      <dt className="text-mono text-[9px] uppercase tracking-[0.14em] text-foreground/60">
                        Expected turn
                      </dt>
                      <dd className="mt-1">{prediction.expected_turning_point}</dd>
                    </div>
                  </dl>
                  {prediction.receipt && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {prediction.receipt}
                    </p>
                  )}
                  {prediction.status !== "open" && (
                    <HapticButton
                      hapticPattern="soft"
                      onClick={() => void share(prediction)}
                      className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--lime)]"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share receipt
                    </HapticButton>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
