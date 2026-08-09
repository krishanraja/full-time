import { describe, expect, it } from "vitest";
import { reporterItemXml } from "./reporter-rss";
import type { ReporterFeedItem } from "@/lib/api/editorial-public.server";

const item: ReporterFeedItem = {
  id: "variant-1",
  drop_id: "drop-stable-guid",
  pundit_id: "zen",
  spec_version: 1,
  thesis: {},
  title: "Forest & City",
  description: "Evidence before certainty.",
  display_script: "Approved script.",
  performance_plan: [],
  audio_url: "https://cdn.example/audio.mp3",
  audio_bytes: 12345,
  audio_duration_sec: 366,
  share_image_url: null,
  transcript: "Approved script.",
  published_at: "2026-08-08T05:00:00.000Z",
  daily_drops: { coverage_date: "2026-08-08", published_at: "2026-08-08T05:00:00.000Z" },
};

describe("Reporter RSS", () => {
  it("uses the canonical daily drop as a stable GUID", () => {
    const xml = reporterItemXml(item);
    expect(xml).toContain('<guid isPermaLink="false">drop-stable-guid</guid>');
    expect(xml).toContain("Forest &amp; City");
    expect(xml).toContain("<itunes:duration>6:06</itunes:duration>");
    expect(xml).toContain("?drop=drop-stable-guid&amp;pundit=zen");
  });
});
