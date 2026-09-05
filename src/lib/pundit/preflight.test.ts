import { describe, expect, it } from "vitest";
import { assessPreflight, type PreflightReadings } from "./preflight";
import { PUNDIT_IDS } from "./types";

/** An environment that would actually publish. */
const ready = (): PreflightReadings => ({
  configured: {
    SUPABASE_URL: true,
    SUPABASE_SERVICE_ROLE_KEY: true,
    ANTHROPIC_API_KEY: true,
    ELEVENLABS_API_KEY: true,
    CRON_SECRET: true,
  },
  prelaunchMode: false,
  publicationEnabled: true,
  modelStub: false,
  release: {
    publicLaunchEnabled: true,
    gatesVerifiedAt: "2026-09-04T21:39:26Z",
    snapshotBacked: true,
  },
  punditsWithSelectedVoice: [],
  punditsWithConfiguredVoice: [...PUNDIT_IDS],
  existingDrop: null,
  match: { id: "af_1557393", found: true, finished: true, events: 15, hasStats: true },
});

const assess = (changes: Partial<PreflightReadings>) =>
  assessPreflight({ ...ready(), ...changes }, PUNDIT_IDS);

describe("deciding whether a run is worth paying for", () => {
  it("passes an environment that would publish", () => {
    const report = assess({});
    expect(report.blockers).toEqual([]);
    expect(report.ready).toBe(true);
  });

  // The fault this exists to catch: voice_candidates was empty, six voices are
  // required by the publish gate, and a run would have paid for six scripts and
  // six narrations before finding out.
  it("refuses when a pundit has no voice from either source", () => {
    const report = assess({ punditsWithConfiguredVoice: ["zen", "gaffer"] });
    expect(report.ready).toBe(false);
    expect(report.blockers.join(" ")).toContain("stats");
  });

  it("accepts a voice already recorded even when the setting is gone", () => {
    const report = assess({
      punditsWithSelectedVoice: [...PUNDIT_IDS],
      punditsWithConfiguredVoice: [],
    });
    expect(report.blockers).toEqual([]);
  });

  it("refuses a fail-closed release state when publishing", () => {
    expect(
      assess({ release: { publicLaunchEnabled: false, gatesVerifiedAt: null, snapshotBacked: false } })
        .blockers,
    ).toContain("Public launch is fail-closed in release_state.");
  });

  it("refuses a release state with no passing snapshot behind it", () => {
    expect(
      assess({
        release: { publicLaunchEnabled: true, gatesVerifiedAt: "now", snapshotBacked: false },
      }).blockers.join(" "),
    ).toContain("immutable gate snapshot");
  });

  it("ignores the release state when the run only rehearses", () => {
    const report = assess({
      prelaunchMode: true,
      publicationEnabled: false,
      release: { publicLaunchEnabled: false, gatesVerifiedAt: null, snapshotBacked: false },
    });
    expect(report.blockers).toEqual([]);
    expect(report.warnings.join(" ")).toContain("never publishes");
  });

  it("refuses placeholder scripts in a publishing environment", () => {
    expect(assess({ modelStub: true }).blockers.join(" ")).toContain("PUNDIT_MODEL_STUB");
  });

  it("allows placeholder scripts in a rehearsal", () => {
    const report = assess({ modelStub: true, prelaunchMode: true, publicationEnabled: false });
    expect(report.blockers).toEqual([]);
    expect(report.warnings.join(" ")).toContain("placeholders");
  });

  it("refuses a missing setting", () => {
    const configured = { ...ready().configured, ELEVENLABS_API_KEY: false };
    expect(assess({ configured }).blockers).toContain("ELEVENLABS_API_KEY is not configured.");
  });

  it("refuses a date that already published", () => {
    expect(
      assess({ existingDrop: { id: "d1", status: "published" } }).blockers.join(" "),
    ).toContain("already covers this date");
  });

  it("warns rather than refuses on a quarantined date", () => {
    const report = assess({ existingDrop: { id: "d1", status: "quarantined" } });
    expect(report.ready).toBe(true);
    expect(report.warnings.join(" ")).toContain("quarantined");
  });

  it("refuses a match with nothing to write about", () => {
    const report = assess({
      match: { id: "af_1", found: true, finished: true, events: 0, hasStats: false },
    });
    expect(report.blockers.join(" ")).toContain("no events");
  });

  it("warns rather than refuses when only the statistics are missing", () => {
    const report = assess({
      match: { id: "af_1", found: true, finished: true, events: 15, hasStats: false },
    });
    expect(report.ready).toBe(true);
    expect(report.warnings.join(" ")).toContain("no statistics");
  });

  it("refuses a match that has not finished", () => {
    expect(
      assess({
        match: { id: "af_1", found: true, finished: false, events: 3, hasStats: true },
      }).blockers.join(" "),
    ).toContain("not finished");
  });
});
