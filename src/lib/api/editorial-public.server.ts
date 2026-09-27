import { currentCoverageDate } from "@/lib/london-date";
import { editionPunditFor } from "@/lib/edition-pundit";
import { crestUrl, isPremierLeague } from "@/lib/premier-league";
import { serviceRest } from "@/lib/pundit/service-rest.server";
import { PUNDIT_IDS, type EvidenceItem, type PunditId } from "@/lib/pundit/types";

function publicConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Public Supabase configuration is missing.");
  return { url, key };
}

async function publicRest<T>(path: string): Promise<T> {
  const { url, key } = publicConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Editorial API ${response.status}: ${(await response.text()).slice(0, 180)}`);
  }
  return (await response.json()) as T;
}

export function parsePunditId(value: string | null | undefined): PunditId | null {
  return PUNDIT_IDS.includes(value as PunditId) ? (value as PunditId) : null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDropId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export type PublicDrop = {
  id: string;
  coverage_date: string;
  canonical_pundit: PunditId;
  status: "published" | "off_day";
  published_at: string | null;
};

export type PublicVariant = {
  id: string;
  drop_id: string;
  pundit_id: PunditId;
  spec_version: number;
  thesis: Record<string, unknown>;
  title: string;
  description: string;
  display_script: string;
  performance_plan: Array<Record<string, unknown>>;
  audio_url: string;
  audio_bytes: number | null;
  audio_duration_sec: number | null;
  share_image_url: string | null;
  transcript: string | null;
  published_at: string;
};

export type PublicProofCard = {
  id: string;
  claim: string;
  evidence: string[];
  boundary?: string;
};

/** Who was playing, and what it finished.
 *
 *  The surface carried neither. editionDetails returned teamIds - af_50,
 *  af_746 - which name nothing to a listener, and the score was nowhere at
 *  all, so a show about Manchester City beating Sunderland five-three opened
 *  with a headline and no fixture.
 *
 *  It costs no query. The sealed evidence pack is already loaded to build the
 *  proof cards and it holds both sides and both scores as first-class facts,
 *  because the writer is refused for naming a team the pack does not carry.
 *  The same guarantee that keeps the script honest makes this safe to show. */
export type PublicFixture = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  competition: string | null;
  /** Club crests, from the provider's public imagery via `teams.crest_url`.
   *  Not in the pack: the pack is what the writer may say, and a crest is
   *  not a claim. Absent when the team row has none. */
  homeCrest?: string | null;
  awayCrest?: string | null;
};

export type PublicEdition = {
  coverageDate: string;
  variant: PublicVariant;
};

/** One match Today can show: the drop, its date, who played, and which AI
 *  Pundits published a show about it.
 *
 *  Today used to fall back to "the most recent edition anyone published",
 *  ordered by publication time. On 2026-09-27 that meant four of six pundits
 *  opened on Tottenham v Aston Villa from the 19th while the newer Man City v
 *  Sunderland show sat in a list below it, and switching pundit could quietly
 *  switch match. A listener could not tell which game they were looking at.
 *  So the unit is now the match: newest first by the day it was played, and
 *  the pundit choice happens inside it. */
export type PublicMatch = {
  dropId: string;
  coverageDate: string;
  fixture: PublicFixture | null;
  /** In the fixed six-pundit order, so the rail never reshuffles. */
  pundits: PunditId[];
  canonicalPundit: PunditId | null;
};

/** What the Today endpoint returns.
 *
 *  `variant` is today's edition for the requested pundit, and `latest` is the
 *  edition shown when there is none: the most recent Premier League match,
 *  by the requested pundit when they made it and by whoever did when they did
 *  not. The player names who made it. */
export type PublicToday = {
  coverageDate: string;
  state: "prelaunch" | "off_day" | "variant_unavailable" | "published";
  drop: PublicDrop | { id: string } | null;
  variant: PublicVariant | null;
  latest: PublicEdition | null;
  matchId: string | null;
  teamIds: string[];
  fixture: PublicFixture | null;
  proofCards: PublicProofCard[];
  /** Premier League matches with at least one published show, newest first. */
  matches: PublicMatch[];
};

type EvidencePackRow = {
  id: string;
  match_id: string;
  facts: EvidenceItem[];
  derivations: EvidenceItem[];
  unavailable_evidence: string[];
  sealed_at: string;
};

type LicensedClaimRow = {
  id: string;
  thesis: string;
  type: string;
  evidence_refs: string[];
  alternative_explanation: string | null;
  missing_evidence: string[];
};

type MatchIdentityRow = {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  home: { crest_url: string | null } | null;
  away: { crest_url: string | null } | null;
};

type DropSummaryRow = {
  id: string;
  coverage_date: string;
  canonical_pundit: string | null;
};

type VariantPresenceRow = { drop_id: string; pundit_id: string };

type PackMatchRow = { drop_id: string; match_id: string; sealed_at: string };

type MatchSummaryRow = {
  id: string;
  league_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home: { name: string; crest_url: string | null } | null;
  away: { name: string; crest_url: string | null } | null;
  league: { name: string } | null;
};

const VARIANT_SELECT =
  "id,drop_id,pundit_id,spec_version,thesis,title,description,display_script,performance_plan,audio_url,audio_bytes,audio_duration_sec,share_image_url,transcript,published_at";

function selectedClaimIds(variant: PublicVariant): string[] {
  const value = variant.thesis.selectedClaimIds;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && isValidDropId(item));
}

function evidenceLine(item: EvidenceItem): string {
  const value = Array.isArray(item.value) ? item.value.join(", ") : item.value;
  return `${item.label}: ${value == null || value === "" ? "not recorded" : String(value)}`;
}

export function projectProofCards(
  claims: LicensedClaimRow[],
  evidence: EvidenceItem[],
): PublicProofCard[] {
  const byId = new Map(evidence.map((item) => [item.id, item]));
  return claims
    .flatMap((claim): PublicProofCard[] => {
      const supporting = claim.evidence_refs.flatMap((id) => {
        const item = byId.get(id);
        return item ? [evidenceLine(item)] : [];
      });
      if (!supporting.length) return [];
      const boundary = claim.missing_evidence.length
        ? "This leaves out some facts we could not check."
        : claim.alternative_explanation
          ? `This cannot rule out: ${claim.alternative_explanation}`
          : claim.type === "fact"
            ? "This shows what happened, not why it happened."
            : "The match facts support this idea, but they cannot prove it on their own.";
      return [
        {
          id: claim.id,
          claim: claim.thesis,
          evidence: supporting.slice(0, 3),
          boundary,
        },
      ];
    })
    .slice(0, 3);
}

const NO_DETAILS = {
  matchId: null,
  teamIds: [] as string[],
  fixture: null as PublicFixture | null,
  proofCards: [] as PublicProofCard[],
};

/** The pack a published edition was written from.
 *
 *  A drop can hold several sealed packs for the same match, one per repair
 *  run: 2026-09-04 has four. This used to take `limit=1` with no order, so the
 *  scoreboard and the proof cards could come from different packs on
 *  different requests, and a proof card vanished whenever the pack returned
 *  was not the one its claims were licensed against. Now it is the pack the
 *  edition's own claims name, and failing that the latest sealed one. */
export function editionPack<T extends { id: string }>(
  packsNewestFirst: readonly T[],
  claims: ReadonlyArray<{ evidence_pack_id?: string | null }>,
): T | null {
  const votes = new Map<string, number>();
  for (const claim of claims) {
    if (!claim.evidence_pack_id) continue;
    votes.set(claim.evidence_pack_id, (votes.get(claim.evidence_pack_id) ?? 0) + 1);
  }
  const named = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return packsNewestFirst.find((pack) => pack.id === named) ?? packsNewestFirst[0] ?? null;
}

async function editionDetails(variant: PublicVariant) {
  const ids = selectedClaimIds(variant);
  const [packs, claims] = await Promise.all([
    serviceRest<EvidencePackRow[]>(
      `evidence_packs?drop_id=eq.${encodeURIComponent(variant.drop_id)}&sealed_at=not.is.null&select=id,match_id,facts,derivations,unavailable_evidence,sealed_at&order=sealed_at.desc&limit=8`,
    ),
    ids.length
      ? serviceRest<Array<LicensedClaimRow & { evidence_pack_id: string }>>(
          `analysis_claims?id=in.(${ids.join(",")})&status=eq.licensed&select=id,evidence_pack_id,thesis,type,evidence_refs,alternative_explanation,missing_evidence`,
        )
      : Promise.resolve([]),
  ]);
  const pack = editionPack(packs, claims);
  if (!pack) return NO_DETAILS;

  const matches = await serviceRest<MatchIdentityRow[]>(
    `matches?id=eq.${encodeURIComponent(pack.match_id)}&select=id,league_id,home_team_id,away_team_id,home:home_team_id(crest_url),away:away_team_id(crest_url)&limit=1`,
  );
  const match = matches[0] ?? null;
  const order = new Map(ids.map((id, index) => [id, index]));
  const orderedClaims = claims
    .filter((claim) => claim.evidence_pack_id === pack.id)
    .sort(
      (a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  return {
    matchId: pack.match_id,
    teamIds: match ? [match.home_team_id, match.away_team_id] : [],
    fixture: withCrests(fixtureFromPack(pack.facts), match),
    proofCards: projectProofCards(orderedClaims, [...pack.facts, ...pack.derivations]),
  };
}

/** The fixture, read from the facts the pack already states.
 *
 *  Returns null rather than a half-filled card when either side is missing: a
 *  scoreboard that names one team is worse than no scoreboard, because the
 *  reader cannot tell whether the other side is absent or the layout broke. */
export function fixtureFromPack(facts: readonly EvidenceItem[]): PublicFixture | null {
  const value = (id: string) => facts.find((item) => item.id === id)?.value;
  const text = (id: string) => {
    const found = value(id);
    return typeof found === "string" && found.trim() ? found.trim() : null;
  };
  const number = (id: string) => {
    const found = value(id);
    return typeof found === "number" && Number.isFinite(found) ? found : null;
  };
  const homeTeam = text("match.home_team");
  const awayTeam = text("match.away_team");
  if (!homeTeam || !awayTeam) return null;
  // structured-match.server.ts writes these placeholders when a team or
  // league join misses. "Home 0, Away 0" on a scoreboard is a broken layout
  // that looks like a result.
  if (homeTeam === "Home" && awayTeam === "Away") return null;
  const competition = text("match.competition");
  return {
    homeTeam,
    awayTeam,
    homeScore: number("match.home_score"),
    awayScore: number("match.away_score"),
    competition: competition === "Competition" ? null : competition,
  };
}

function withCrests(
  fixture: PublicFixture | null,
  match: Pick<MatchIdentityRow, "home" | "away"> | null,
): PublicFixture | null {
  if (!fixture) return null;
  return {
    ...fixture,
    homeCrest: crestUrl(match?.home?.crest_url),
    awayCrest: crestUrl(match?.away?.crest_url),
  };
}

async function safeEditionDetails(variant: PublicVariant) {
  try {
    return await editionDetails(variant);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "public_edition_details_failed",
        variantId: variant.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return NO_DETAILS;
  }
}

/** The Premier League matches Today can show, newest first.
 *
 *  Pure, so the rules are tested without a database: a match needs a sealed
 *  pack naming it, a stored match in the Premier League, and at least one
 *  published show. Anything else is left out rather than shown half-built. */
export function assemblePremierLeagueMatches(input: {
  drops: readonly DropSummaryRow[];
  variants: readonly VariantPresenceRow[];
  packs: readonly PackMatchRow[];
  matches: readonly MatchSummaryRow[];
}): PublicMatch[] {
  const matchById = new Map(input.matches.map((match) => [match.id, match]));
  const latestPack = new Map<string, PackMatchRow>();
  for (const pack of input.packs) {
    const seen = latestPack.get(pack.drop_id);
    if (!seen || pack.sealed_at > seen.sealed_at) latestPack.set(pack.drop_id, pack);
  }
  return input.drops
    .flatMap((drop): PublicMatch[] => {
      const pack = latestPack.get(drop.id);
      const match = pack ? matchById.get(pack.match_id) : undefined;
      if (!match || !isPremierLeague(match.league_id)) return [];
      const published = new Set(
        input.variants.filter((row) => row.drop_id === drop.id).map((row) => row.pundit_id),
      );
      const pundits = PUNDIT_IDS.filter((id) => published.has(id));
      if (!pundits.length) return [];
      return [
        {
          dropId: drop.id,
          coverageDate: drop.coverage_date,
          fixture:
            match.home?.name && match.away?.name
              ? {
                  homeTeam: match.home.name,
                  awayTeam: match.away.name,
                  homeScore: match.home_score,
                  awayScore: match.away_score,
                  competition: match.league?.name ?? null,
                  homeCrest: crestUrl(match.home.crest_url),
                  awayCrest: crestUrl(match.away.crest_url),
                }
              : null,
          pundits,
          canonicalPundit: parsePunditId(drop.canonical_pundit),
        },
      ];
    })
    .sort((a, b) => b.coverageDate.localeCompare(a.coverageDate));
}

export { editionPunditFor };

const MATCH_LIMIT = 8;

async function premierLeagueMatches(include?: string): Promise<PublicMatch[]> {
  const drops = await publicRest<DropSummaryRow[]>(
    `daily_drops?status=eq.published&select=id,coverage_date,canonical_pundit&order=coverage_date.desc&limit=${MATCH_LIMIT + 4}`,
  );
  if (include && isValidDropId(include) && !drops.some((drop) => drop.id === include)) {
    drops.push(
      ...(await publicRest<DropSummaryRow[]>(
        `daily_drops?id=eq.${encodeURIComponent(include)}&status=eq.published&select=id,coverage_date,canonical_pundit&limit=1`,
      )),
    );
  }
  if (!drops.length) return [];
  const dropIds = drops.map((drop) => drop.id).join(",");
  const [variants, packs] = await Promise.all([
    publicRest<VariantPresenceRow[]>(
      `pundit_variants?drop_id=in.(${dropIds})&status=eq.published&select=drop_id,pundit_id`,
    ),
    serviceRest<PackMatchRow[]>(
      `evidence_packs?drop_id=in.(${dropIds})&sealed_at=not.is.null&select=drop_id,match_id,sealed_at`,
    ),
  ]);
  const matchIds = [...new Set(packs.map((pack) => pack.match_id))];
  const matches = matchIds.length
    ? await publicRest<MatchSummaryRow[]>(
        `matches?id=in.(${matchIds.map(encodeURIComponent).join(",")})&select=id,league_id,home_score,away_score,home:home_team_id(name,crest_url),away:away_team_id(name,crest_url),league:league_id(name)`,
      )
    : [];
  const assembled = assemblePremierLeagueMatches({ drops, variants, packs, matches });
  const shown = assembled.slice(0, MATCH_LIMIT);
  const extra = include ? assembled.find((match) => match.dropId === include) : undefined;
  return extra && !shown.includes(extra) ? [...shown, extra] : shown;
}

export async function getPublicToday(pundit: PunditId, dropId?: string): Promise<PublicToday> {
  const coverageDate = currentCoverageDate();
  const [drops, matches] = await Promise.all([
    publicRest<PublicDrop[]>(
      `daily_drops?coverage_date=eq.${encodeURIComponent(coverageDate)}&select=id,coverage_date,canonical_pundit,status,published_at&limit=1`,
    ),
    premierLeagueMatches(dropId),
  ]);
  const drop = drops[0] ?? null;
  const featured = (dropId && matches.find((match) => match.dropId === dropId)) || matches[0];
  const editionPundit = featured ? editionPunditFor(featured, pundit) : null;
  let edition: PublicEdition | null = null;
  if (featured && editionPundit) {
    const rows = await publicRest<PublicVariant[]>(
      `pundit_variants?drop_id=eq.${featured.dropId}&pundit_id=eq.${editionPundit}&status=eq.published&select=${VARIANT_SELECT}&limit=1`,
    );
    if (rows[0]) edition = { coverageDate: featured.coverageDate, variant: rows[0] };
  }
  const details = edition ? await safeEditionDetails(edition.variant) : NO_DETAILS;
  const isToday =
    edition != null &&
    drop?.status === "published" &&
    edition.variant.drop_id === drop.id &&
    edition.variant.pundit_id === pundit;
  const state = !drop
    ? "prelaunch"
    : drop.status === "off_day"
      ? "off_day"
      : isToday
        ? "published"
        : "variant_unavailable";
  return {
    coverageDate,
    state,
    drop,
    variant: isToday ? edition!.variant : null,
    latest: isToday ? null : edition,
    matchId: details.matchId,
    teamIds: details.teamIds,
    fixture: details.fixture ?? featured?.fixture ?? null,
    proofCards: details.proofCards,
    matches,
  };
}

export async function getPublicVariant(dropId: string, pundit: PunditId): Promise<PublicToday | null> {
  const rows = await publicRest<PublicVariant[]>(
    `pundit_variants?drop_id=eq.${encodeURIComponent(dropId)}&pundit_id=eq.${pundit}&status=eq.published&select=${VARIANT_SELECT}&limit=1`,
  );
  const variant = rows[0] ?? null;
  if (!variant) return null;
  const drops = await publicRest<PublicDrop[]>(
    `daily_drops?id=eq.${encodeURIComponent(dropId)}&select=id,coverage_date,canonical_pundit,status,published_at&limit=1`,
  );
  const drop = drops[0] ?? null;
  const details = await safeEditionDetails(variant);
  return {
    coverageDate: drop?.coverage_date ?? variant.published_at.slice(0, 10),
    state: "published" as const,
    drop,
    variant,
    latest: null,
    matchId: details.matchId,
    teamIds: details.teamIds,
    fixture: details.fixture,
    proofCards: details.proofCards,
    matches: [],
  };
}

export type ReporterFeedItem = PublicVariant & {
  daily_drops: { coverage_date: string; published_at: string | null } | null;
};

export async function getReporterFeed(limit = 100) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  return publicRest<ReporterFeedItem[]>(
    `pundit_variants?pundit_id=eq.zen&status=eq.published&select=${VARIANT_SELECT},daily_drops!inner(coverage_date,published_at)&order=published_at.desc&limit=${safeLimit}`,
  );
}

export type PublicPrediction = {
  id: string;
  pundit_id: PunditId;
  match_id: string;
  kickoff_at: string;
  locked_at: string;
  shared_probabilities: Record<string, number>;
  pundit_probabilities: Record<string, number>;
  thesis: string;
  measurable_advantage: string;
  indicator: string;
  expected_turning_point: string;
  falsifier: string;
  evaluation_rule: Record<string, unknown>;
  settlement: { outcome?: "home" | "draw" | "away" } | null;
  status: "open" | "correct" | "partly_correct" | "wrong" | "unjudgeable";
  brier_score: number | null;
  log_loss: number | null;
  receipt: string | null;
  settled_at: string | null;
};

export async function getPublicPredictions(pundit: PunditId, receiptsOnly = false) {
  const settlementFilter = receiptsOnly ? "&status=neq.open&status=neq.unjudgeable" : "";
  const predictions = await publicRest<PublicPrediction[]>(
    `prediction_ledger?pundit_id=eq.${pundit}${settlementFilter}&select=id,pundit_id,match_id,kickoff_at,locked_at,shared_probabilities,pundit_probabilities,thesis,measurable_advantage,indicator,expected_turning_point,falsifier,evaluation_rule,settlement,status,brier_score,log_loss,receipt,settled_at&order=kickoff_at.desc&limit=100`,
  );
  if (process.env.PUBLIC_FORECAST_SCORES_ENABLED === "true") return predictions;
  return predictions.map((prediction) => ({
    ...prediction,
    brier_score: null,
    log_loss: null,
    settlement: null,
  }));
}
