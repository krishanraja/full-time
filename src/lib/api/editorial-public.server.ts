import { currentCoverageDate } from "@/lib/london-date";
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

export type PublicEdition = {
  coverageDate: string;
  variant: PublicVariant;
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
};

type VariantWithDrop = PublicVariant & {
  daily_drops: { coverage_date: string; published_at: string | null } | null;
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

async function editionDetails(variant: PublicVariant) {
  const packs = await serviceRest<EvidencePackRow[]>(
    `evidence_packs?drop_id=eq.${encodeURIComponent(variant.drop_id)}&sealed_at=not.is.null&select=id,match_id,facts,derivations,unavailable_evidence,sealed_at&limit=1`,
  );
  const pack = packs[0] ?? null;
  if (!pack) return { matchId: null, teamIds: [], proofCards: [] as PublicProofCard[] };

  const ids = selectedClaimIds(variant);
  const [matches, claims] = await Promise.all([
    serviceRest<MatchIdentityRow[]>(
      `matches?id=eq.${encodeURIComponent(pack.match_id)}&select=id,league_id,home_team_id,away_team_id&limit=1`,
    ),
    ids.length
      ? serviceRest<LicensedClaimRow[]>(
          `analysis_claims?id=in.(${ids.join(",")})&evidence_pack_id=eq.${encodeURIComponent(pack.id)}&status=eq.licensed&select=id,thesis,type,evidence_refs,alternative_explanation,missing_evidence`,
        )
      : Promise.resolve([]),
  ]);
  const match = matches[0] ?? null;
  const order = new Map(ids.map((id, index) => [id, index]));
  const orderedClaims = [...claims].sort(
    (a, b) =>
      (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
  return {
    matchId: pack.match_id,
    teamIds: match ? [match.home_team_id, match.away_team_id] : [],
    proofCards: projectProofCards(orderedClaims, [...pack.facts, ...pack.derivations]),
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
    return { matchId: null, teamIds: [], proofCards: [] as PublicProofCard[] };
  }
}

async function latestEditions(pundit?: PunditId, limit = 4): Promise<PublicEdition[]> {
  const safeLimit = Math.min(8, Math.max(1, limit));
  const filter = pundit ? `pundit_id=eq.${pundit}&` : "";
  const rows = await publicRest<VariantWithDrop[]>(
    `pundit_variants?${filter}status=eq.published&select=${VARIANT_SELECT},daily_drops!inner(coverage_date,published_at)&order=published_at.desc&limit=${safeLimit}`,
  );
  return rows.flatMap((row) =>
    row.daily_drops ? [{ coverageDate: row.daily_drops.coverage_date, variant: row }] : [],
  );
}

export async function getPublicToday(pundit: PunditId) {
  const coverageDate = currentCoverageDate();
  const [drops, samePunditEditions] = await Promise.all([
    publicRest<PublicDrop[]>(
      `daily_drops?coverage_date=eq.${encodeURIComponent(coverageDate)}&select=id,coverage_date,canonical_pundit,status,published_at&limit=1`,
    ),
    latestEditions(pundit, 4),
  ]);
  const drop = drops[0] ?? null;
  let variant: PublicVariant | null = null;
  if (drop?.status === "published") {
    const variants = await publicRest<PublicVariant[]>(
      `pundit_variants?drop_id=eq.${drop.id}&pundit_id=eq.${pundit}&status=eq.published&select=${VARIANT_SELECT}&limit=1`,
    );
    variant = variants[0] ?? null;
  }
  // A drop now publishes the pundits that passed rather than all six at once,
  // so a listener's chosen pundit may have nothing while the show itself is
  // live. On 2026-09-05 exactly that happened: the Romantic published and the
  // other five did not, and five of six listeners saw an empty home page with
  // a finished show sitting behind it.
  //
  // So the fallback widens. Their own pundit first, and failing that the most
  // recent edition anyone published. The player names whoever actually made it,
  // because serving one persona's audio under another's name is the substitution
  // the promise checks exist to prevent.
  const anyPunditEditions = samePunditEditions.length
    ? samePunditEditions
    : await latestEditions(undefined, 4);
  const latest = anyPunditEditions.find((edition) => edition.variant.drop_id !== drop?.id) ?? null;
  const active = variant ?? latest?.variant ?? null;
  const details = active
    ? await safeEditionDetails(active)
    : { matchId: null, teamIds: [], proofCards: [] as PublicProofCard[] };
  const state = !drop
    ? "prelaunch"
    : drop.status === "off_day"
      ? "off_day"
      : variant
        ? "published"
        : "variant_unavailable";
  return {
    coverageDate,
    state,
    drop,
    variant,
    latest,
    matchId: details.matchId,
    teamIds: details.teamIds,
    proofCards: details.proofCards,
    recent: anyPunditEditions.filter((edition) => edition.variant.id !== active?.id).slice(0, 4),
  } as const;
}

export async function getPublicVariant(dropId: string, pundit: PunditId) {
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
    proofCards: details.proofCards,
    recent: [] as PublicEdition[],
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
