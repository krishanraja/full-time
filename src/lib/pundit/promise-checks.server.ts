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
  const checks: PromiseCheck[] = [];
  const expected = new Set(PUNDIT_IDS);
  const actual = new Set(variants.map((variant) => variant.pundit_id));
  checks.push(
    check(
      "six_variants",
      variants.length === 6 && actual.size === 6,
      `${variants.length} variants`,
    ),
    check(
      "pundit_identity",
      [...expected].every((pundit) => actual.has(pundit)),
      [...actual].join(", "),
    ),
    check(
      "variant_status",
      variants.every((variant) => ["approved", "published"].includes(variant.status)),
      variants.map((variant) => `${variant.pundit_id}:${variant.status}`).join(", "),
    ),
    check(
      "script_identity",
      variants.every((variant) => variant.script_identity_verified),
      "display and spoken scripts retain semantic identity",
    ),
    check(
      "audio_quality",
      variants.every((variant) => variant.audio_quality?.passed === true),
      "all produced audio passed its independent gates",
    ),
    check(
      "pronunciation",
      variants.every((variant) => (variant.pronunciation_rate ?? 0) >= 0.99),
      "all variants meet the 99 percent proper-name floor",
    ),
    check(
      "show_duration",
      variants.every(
        (variant) =>
          (variant.audio_duration_sec ?? 0) >= 300 && (variant.audio_duration_sec ?? 0) <= 480,
      ),
      variants
        .map((variant) => `${variant.pundit_id}:${variant.audio_duration_sec ?? 0}s`)
        .join(", "),
    ),
    check(
      "distinct_audio",
      new Set(variants.map((variant) => variant.audio_url).filter(Boolean)).size === 6,
      "no persona silently substitutes another persona's audio",
    ),
    check(
      "distinct_voices",
      new Set(variants.map((variant) => variant.voice_candidate_id).filter(Boolean)).size === 6,
      "six selected voice candidates",
    ),
    check(
      "transcripts",
      variants.every((variant) => Boolean(variant.transcript?.trim())),
      "six non-empty verified transcripts",
    ),
    check(
      "artwork",
      variants.every((variant) => Boolean(variant.share_image_url)),
      "six PNG share cards",
    ),
  );

  const latest = latestHarnesses(harnesses);
  const latestByVariant = new Map<string, Map<string, HarnessRow>>();
  for (const row of latest) {
    const forVariant = latestByVariant.get(row.variant_id) ?? new Map<string, HarnessRow>();
    forVariant.set(row.harness_name, row);
    latestByVariant.set(row.variant_id, forVariant);
  }
  const missingOrFailed = variants.flatMap((variant) => {
    const forVariant = latestByVariant.get(variant.id);
    return REQUIRED_HARNESS_NAMES.filter((name) => !forVariant?.get(name)?.passed).map(
      (name) => `${variant.pundit_id}:${name}`,
    );
  });
  checks.push(
    check(
      "latest_harnesses",
      missingOrFailed.length === 0,
      missingOrFailed.length
        ? `${missingOrFailed.length} required harness results missing or failed: ${missingOrFailed.slice(0, 6).join(", ")}`
        : `${REQUIRED_HARNESS_NAMES.length} required harnesses passed for each pundit`,
    ),
    check(
      "prediction_receipts",
      invalidReceipts.length === 0,
      invalidReceipts.length
        ? "a settled prediction has no receipt"
        : "settled predictions have receipts",
    ),
  );

  const reporter = variants.find((variant) => variant.pundit_id === "zen");
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
    checks.push(check("rss", false, "Reporter assets are incomplete."));
  }

  const fetcher = input.fetcher ?? fetch;
  const assetChecks = await Promise.all(
    variants.flatMap((variant) => [
      variant.audio_url
        ? assetCheck(variant.audio_url, "audio", fetcher)
        : Promise.resolve(check("audio_asset", false, `${variant.pundit_id} audio URL missing`)),
      variant.share_image_url
        ? assetCheck(variant.share_image_url, "image", fetcher)
        : Promise.resolve(check("image_asset", false, `${variant.pundit_id} image URL missing`)),
    ]),
  );
  checks.push(...assetChecks);
  return { passed: checks.every((item) => item.passed), checks };
}
