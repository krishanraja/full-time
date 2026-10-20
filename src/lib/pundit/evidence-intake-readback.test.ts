import { afterEach, expect, it, vi } from "vitest";
import { handleEvidenceIntake } from "../../routes/api/internal/evidence-intake";
import { loadStructuredMatch } from "./structured-match.server";
vi.mock("./structured-match.server", () => ({ loadStructuredMatch: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
const request = (auth = true) =>
  new Request("https://test/api/internal/evidence-intake?matchId=af_42", {
    headers: auth ? { Authorization: "Bearer TEST" } : {},
  });
function setup() {
  vi.stubEnv("CRON_SECRET", "TEST");
  vi.stubEnv("FT_EVIDENCE_INTAKE_ENABLED", "true");
}
it("refuses unauthenticated access before reading the product database", async () => {
  setup();
  expect((await handleEvidenceIntake({ request: request(false) })).status).toBe(401);
  expect(loadStructuredMatch).not.toHaveBeenCalled();
});
it("reports actual production loader facts consumed by the real pack builder", async () => {
  setup();
  vi.mocked(loadStructuredMatch).mockResolvedValue({
    input: {
      match: {
        id: "af_42",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        homeScore: 2,
        awayScore: 1,
        kickoffAt: "2026-10-18T15:00:00Z",
        competition: "Premier League",
        source: "test",
      },
      events: [],
      intakeEvidence: {
        facts: [
          {
            id: "stats.home_shots",
            kind: "fact",
            label: "Home shots",
            value: 13,
            source: "test",
            provenance: "snapshot:TEST;raw:TEST",
          },
        ],
        unavailable: [],
      },
    },
    entities: [],
    coverageDate: "2026-10-18",
  });
  const response = await handleEvidenceIntake({ request: request() });
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const body = await response.json();
  expect(body.counts).toEqual({ intake: 1, consumed: 1, withheld: 0 });
  expect(body.sideEffects.modelCalls).toBe(0);
});
it("keeps conflicts fail-closed and returns only a safe error category", async () => {
  setup();
  vi.mocked(loadStructuredMatch).mockRejectedValue(
    new Error("Product score disagrees with snapshot"),
  );
  const response = await handleEvidenceIntake({ request: request() });
  expect(response.status).toBe(503);
  expect((await response.json()).reason).toBe("product_fact_conflict");
});
