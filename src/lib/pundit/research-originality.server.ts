import { serviceRest } from "./service-rest.server";

export function extractSourceLanguageSpans(value: unknown, parentKey = ""): string[] {
  const allowed = new Set(["sourceLanguageSpans", "source_language_spans", "approvedExcerpts"]);
  if (typeof value === "string") return allowed.has(parentKey) ? [value] : [];
  if (Array.isArray(value))
    return value.flatMap((item) => extractSourceLanguageSpans(item, parentKey));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    extractSourceLanguageSpans(item, key),
  );
}

export async function loadRightsClearedOriginalityCorpus() {
  const rows = await serviceRest<Array<{ citations: unknown }>>(
    "concept_cards?status=eq.accepted&select=citations",
  );
  return [
    ...new Set(
      rows.flatMap((row) => extractSourceLanguageSpans(row.citations)).map((span) => span.trim()),
    ),
  ].filter((span) => span.split(/\s+/).length >= 5);
}
