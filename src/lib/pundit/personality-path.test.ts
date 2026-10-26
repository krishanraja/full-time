import { afterEach, describe, expect, it, vi } from "vitest";
import { PUNDIT_IDS } from "./types";
const captured = vi.hoisted(() => ({ requests: [] as Array<Record<string, unknown>> }));
vi.mock("./model-json.server", () => ({
  modelJson: vi.fn(async (request: Record<string, unknown>) => {
    captured.requests.push(request);
    throw new Error("captured before provider call");
  }),
}));
import { generatePunditVariant } from "./pundit-generator.server";

afterEach(() => {
  captured.requests.length = 0;
});
describe("real writer consumes the selected product baseline", () => {
  it.each([...PUNDIT_IDS])(
    "passes %s and shared direction without sibling specs",
    async (punditId) => {
      await expect(
        generatePunditVariant({
          punditId,
          pack: {
            id: "fixture",
            matchId: "fixture",
            version: 1,
            createdAt: "2026-01-01",
            facts: [],
            derivations: [],
            unavailableEvidence: [],
          },
          claims: [],
          maxAttempts: 1,
        }),
      ).rejects.toThrow("captured before provider call");
      expect(captured.requests).toHaveLength(1);
      const request = captured.requests[0];
      const cached = request.cachedContext as Array<Record<string, unknown>>;
      const identity = cached.find((block) => block.punditSpec)!;
      expect((identity.punditSpec as { id: string }).id).toBe(punditId);
      expect((identity.personalityBaseline as { profileId: string }).profileId).toBe(punditId);
      expect(identity.sharedHumourChecks).toBeTruthy();
      const output = JSON.parse(request.user as string).outputContract;
      expect(output.spokenDelivery).toContain("distinct people");
      expect(JSON.stringify(request)).not.toContain("Go on. Find someone who reckons");
    },
  );
});
