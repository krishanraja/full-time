import type { ReporterFeedItem } from "@/lib/api/editorial-public.server";
import { renderReporterFeed } from "./reporter-rss";
import { serviceRest } from "./service-rest.server";
import { PUNDIT_IDS, type PunditId } from "./types";

type VariantRow = {
  id: string;
  drop_id: string;
  pundit_id: PunditId;
  spec_version: number;
  thesis: Record<string, unknown>;
  title: string;
  description: string;
  display_script: string;
  performance_plan: Array<Record<string, unknown>>;
  audio_url: string | null;
  audio_bytes: number | null;
  audio_duration_sec: number | null;
  share_image_url: string | null;
  transcript: string | null;
  published_at: string | null;
  status: "approved" | "published" | "quarantined" | "failed";
  script_identity_verified: boolean;
  audio_quality: { passed?: boolean } | null;
  pronunciation_rate: number | null;
  voice_candidate_id: string | null;
};

type HarnessRow = {
  variant_id: string;
  harness_name: string;
  attempt: number;
  passed: boolean;
  created_at: string;
};

export const REQUIRED_HARNESS_NAMES = [
  "evidence_to_claim_entailment",
  "unsupported_tactics",
  "numeric_licence",
  "entity_licence",
  "consequence_licence",
  "generic_language",
  "research_originality",
  "humour_safety",
  "prediction_timestamp",
  "display_spoken_identity",
  "spoken_length",
  "factual_entailment",
  "humour_safety_semantic",
  "insight",
  "clarity",
  "judgment",
  "outcome_separation",
  "probability",
  "independence",
  "story",
  "persona",
  "humour",
  "memorability",
  "restraint",
  "prediction_accountability",
] as const;

export type PromiseCheck = { name: string; passed: boolean; detail: string };

function check(name: string, passed: boolean, detail: string): PromiseCheck {
  return { name, passed, detail };
}

async function assetCheck(
  url: string,
  expected: "audio" | "image",
  fetcher: typeof fetch,
): Promise<PromiseCheck> {
  try {
    const response = await fetcher(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    const type = response.headers.get("content-type") ?? "";
    return check(
      `${expected}_asset`,
      response.ok && type.startsWith(`${expected}/`),
      `${response.status} ${type || "missing content-type"}`,
    );
  } catch (error) {
    return check(
      `${expected}_asset`,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function latestHarnesses(rows: HarnessRow[]) {
  const latest = new Map<string, HarnessRow>();
  for (const row of rows) {
    const key = `${row.variant_id}:${row.harness_name}`;
    const current = latest.get(key);
    if (
      !current ||
      row.attempt > current.attempt ||
      (row.attempt === current.attempt && row.created_at > current.created_at)
    ) {
      latest.set(key, row);
    }
  }
  return [...latest.values()];
}

export async function runDropPromiseChecks(input: {
  dropId: string;
  coverageDate: string;
  fetcher?: typeof fetch;
}) {
  const [variants, invalidReceipts] = await Promise.all([
    serviceRest<VariantRow[]>(
      `pundit_variants?drop_id=eq.${encodeURIComponent(input.dropId)}&select=id,drop_id,pundit_id,spec_version,thesis,title,description,display_script,performance_plan,audio_url,audio_bytes,audio_duration_sec,share_image_url,transcript,published_at,status,script_identity_verified,audio_quality,pronunciation_rate,voice_candidate_id&order=pundit_id`,
    ),
    serviceRest<Array<{ id: string }>>(
      "prediction_ledger?status=in.(correct,partly_correct,wrong)&receipt=is.null&select=id&limit=1",
    ),
  ]);
  const variantIds = variants.map((variant) => variant.id).join(",");
  const harnesses = variantIds
    ? await serviceRest<HarnessRow[]>(
        `harness_runs?variant_id=in.(${variantIds})&select=variant_id,harness_name,attempt,passed,created_at`,
      )
    : [];
  const latest = latestHarnesses(harnesses);
  const latestByVariant = new Map<string, Map<string, HarnessRow>>();
  for (const row of latest) {
    const forVariant = latestByVariant.get(row.variant_id) ?? new Map<string, HarnessRow>();
    forVariant.set(row.harness_name, row);
    latestByVariant.set(row.variant_id, forVariant);
  }

  // Why one variant is not publishable. Every gate is per variant and none of
  // them is relaxed here; what changed is that a neighbour's failure no longer
  // withholds a pundit who passed. The reasons are reported rather than
  // summarised, because "the drop failed" was never actionable.
  const shortfalls = (variant: VariantRow): string[] => {
    const reasons: string[] = [];
    if (!["approved", "published"].includes(variant.status)) reasons.push(variant.status);
    if (!variant.script_identity_verified) reasons.push("script identity");
    if (variant.audio_quality?.passed !== true) reasons.push("audio quality");
    if ((variant.pronunciation_rate ?? 0) < 0.99) reasons.push("pronunciation");
    const seconds = variant.audio_duration_sec ?? 0;
    if (seconds < 300 || seconds > 480) reasons.push(`duration ${seconds}s`);
    if (!variant.audio_url) reasons.push("no audio");
    if (!variant.share_image_url) reasons.push("no share card");
    if (!variant.transcript?.trim()) reasons.push("no transcript");
    if (!variant.voice_candidate_id) reasons.push("no licensed voice");
    const forVariant = latestByVariant.get(variant.id);
    const harnessFailures = REQUIRED_HARNESS_NAMES.filter((name) => !forVariant?.get(name)?.passed);
    if (harnessFailures.length) reasons.push(harnessFailures.join(", "));
    return reasons;
  };

  const publishable = variants.filter((variant) => shortfalls(variant).length === 0);
  const withheld = variants
    .filter((variant) => shortfalls(variant).length > 0)
    .map((variant) => `${variant.pundit_id}: ${shortfalls(variant).join(", ")}`);
  const missing = PUNDIT_IDS.filter(
    (pundit) => !variants.some((variant) => variant.pundit_id === pundit),
  );

  const checks: PromiseCheck[] = [];
  checks.push(
    check(
      "publishable_variants",
      publishable.length >= 1,
      publishable.length
        ? `publishing ${publishable.map((variant) => variant.pundit_id).join(", ")}`
        : "no pundit passed every gate",
    ),
    check(
      "withheld_variants",
      true,
      withheld.length
        ? `withheld ${withheld.join(" | ")}${missing.length ? ` | never generated: ${missing.join(", ")}` : ""}`
        : "every pundit passed",
    ),
    check(
      "pundit_identity",
      new Set(publishable.map((variant) => variant.pundit_id)).size === publishable.length,
      "no pundit appears twice in the same drop",
    ),
    check(
      "distinct_audio",
      new Set(publishable.map((variant) => variant.audio_url)).size === publishable.length,
      "no persona silently substitutes another persona's audio",
    ),
    check(
      "distinct_voices",
      new Set(publishable.map((variant) => variant.voice_candidate_id)).size === publishable.length,
      "each published pundit has its own selected voice",
    ),
    check(
      "prediction_receipts",
      invalidReceipts.length === 0,
      invalidReceipts.length
        ? "a settled prediction has no receipt"
        : "settled predictions have receipts",
    ),
  );

  const reporter = publishable.find((variant) => variant.pundit_id === "zen");
  if (reporter?.audio_url && reporter.share_image_url) {
    const publishedAt = reporter.published_at ?? new Date().toISOString();
    const item: ReporterFeedItem = {
      ...reporter,
      audio_url: reporter.audio_url,
      audio_bytes: reporter.audio_bytes,
      audio_duration_sec: reporter.audio_duration_sec,
      share_image_url: reporter.share_image_url,
      transcript: reporter.transcript,
      published_at: publishedAt,
      daily_drops: { coverage_date: input.coverageDate, published_at: publishedAt },
    };
    const preview = renderReporterFeed([item]);
    checks.push(
      check(
        "rss",
        preview.includes(`<guid isPermaLink="false">${input.dropId}</guid>`) &&
          preview.includes("<enclosure "),
        "Reporter RSS preview contains the stable daily-drop GUID and enclosure",
      ),
    );
  } else {
    // The feed carries the Reporter alone, so a day it is withheld adds no item.
    checks.push(check("rss", true, "The Reporter is not publishing today, so the feed is unchanged."));
  }

  const fetcher = input.fetcher ?? fetch;
  const assetChecks = await Promise.all(
    publishable.flatMap((variant) => [
      variant.audio_url
        ? assetCheck(variant.audio_url, "audio", fetcher)
        : Promise.resolve(check("audio_asset", false, `${variant.pundit_id} audio URL missing`)),
      variant.share_image_url
        ? assetCheck(variant.share_image_url, "image", fetcher)
        : Promise.resolve(check("image_asset", false, `${variant.pundit_id} image URL missing`)),
    ]),
  );
  checks.push(...assetChecks);
  return {
    passed: checks.every((item) => item.passed),
    checks,
    publishing: publishable.map((variant) => variant.pundit_id),
  };
}
