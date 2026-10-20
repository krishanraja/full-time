import { afterEach, describe, expect, it, vi } from "vitest";
import { loadIntakeEvidence } from "./evidence-intake.server";
import { readSnapshot, productFacts } from "../../../scripts/pl-evidence/snapshot.mjs";

vi.mock("../../../scripts/pl-evidence/snapshot.mjs", () => ({
  readSnapshot: vi.fn(),
  productFacts: vi.fn(),
}));
const match = {
  id: "af_42",
  kickoffAt: "2026-10-18T15:00:00Z",
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  homeScore: 2,
  awayScore: 1,
  source: "test",
  competition: "Premier League",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
function enable() {
  vi.stubEnv("FT_EVIDENCE_INTAKE_ENABLED", "true");
  vi.stubEnv("GOOGLE_DRIVE_OAUTH_JSON", JSON.stringify({ client_id: "TEST" }));
  vi.stubEnv("FT_DRIVE_FOLDER_ID", "TEST_FOLDER");
}
describe("configured product intake boundary", () => {
  it("does no network work while disabled", async () => {
    vi.stubEnv("FT_EVIDENCE_INTAKE_ENABLED", "false");
    expect(await loadIntakeEvidence(match)).toEqual({ facts: [], unavailable: [] });
    expect(readSnapshot).not.toHaveBeenCalled();
  });
  it("reads an exact sealed window and invokes the shared contract", async () => {
    enable();
    vi.mocked(readSnapshot).mockResolvedValue({
      raw: {},
      normal: {},
      commit: {},
      commit_sha256: "TEST",
    });
    vi.mocked(productFacts).mockReturnValue([]);
    expect(await loadIntakeEvidence(match)).toEqual({ facts: [], unavailable: [] });
    expect(readSnapshot).toHaveBeenCalledWith(
      "2026-10-20",
      expect.objectContaining({ folderId: "TEST_FOLDER" }),
    );
    expect(productFacts).toHaveBeenCalledWith({}, {}, match);
  });
  it("records missing scheduled evidence without treating it as an empty successful intake", async () => {
    enable();
    vi.mocked(readSnapshot).mockResolvedValue(null);
    const result = await loadIntakeEvidence(match);
    expect(result.unavailable).toHaveLength(1);
    expect(vi.mocked(readSnapshot).mock.calls.map((c) => c[0])).toEqual([
      "2026-10-20",
      "2026-10-19",
      "2026-10-18",
    ]);
  });
  it("can pin the exact historical window without changing ordinary latest-window selection", async () => {
    enable();
    vi.mocked(readSnapshot).mockResolvedValue(null);
    await loadIntakeEvidence(match, { end: "2026-10-18" });
    expect(vi.mocked(readSnapshot).mock.calls.map((c) => c[0])).toEqual(["2026-10-18"]);
  });
  it("fails before generation on corrupted archive or missing configuration", async () => {
    enable();
    vi.mocked(readSnapshot).mockRejectedValue(new Error("Snapshot hash/readback mismatch"));
    await expect(loadIntakeEvidence(match)).rejects.toThrow("hash/readback");
    vi.stubEnv("FT_DRIVE_FOLDER_ID", "");
    await expect(loadIntakeEvidence(match)).rejects.toThrow("without configured Drive access");
  });
});
