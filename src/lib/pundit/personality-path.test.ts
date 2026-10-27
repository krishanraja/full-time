import { afterEach, describe, expect, it, vi } from "vitest";
import { PUNDIT_IDS, type EvidencePack, type PunditVariantCandidate } from "./types";
import { getSharedPersonality, compilePersonalityBaseline } from "./personality/registry";
import { DIMENSION_STANDARDS } from "./dimensions";
import { spokenStyleBrief } from "./spoken-style";
import { spokenWordRange } from "./spoken-length";
const captured = vi.hoisted(() => ({ requests: [] as Array<Record<string, unknown>> }));
vi.mock("./model-json.server", () => ({
  modelJson: vi.fn(async (request: Record<string, unknown>) => {
    captured.requests.push(request);
    throw new Error("captured before provider call");
  }),
}));
import { generatePunditVariant, judgeCandidate } from "./pundit-generator.server";

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
      const words = spokenWordRange(punditId);
      expect(output.words).toEqual([words.min, words.max]);
      expect(output.durationSeconds).toEqual({ min: 120, max: 180 });
      expect(output.requiredHumourBeats).toBe(DIMENSION_STANDARDS.humour);
      expect(request.system).not.toMatch(/two to four|eight hundred words/i);
      expect(request.system).toContain("ten named beats because the product stores and reviews them separately");
      expect(request.system).toContain("no joke if a joke would break the flow");
      expect(request.system).toContain("not an invented forecast about the next fixture");
      expect(JSON.parse(request.user as string).predictionRegistration).toContain(
        "match-specific receipt or unresolved question",
      );
      expect(DIMENSION_STANDARDS.prediction_accountability).toContain(
        "do not penalise the absence of a forced next-match call",
      );
      expect(output.spokenDelivery).toContain("distinct people");
      const guidance = getSharedPersonality().spokenWriting!;
      expect(output.spokenDelivery).toContain(guidance.referenceUse);
      for (const example of guidance.examples) {
        expect(output.spokenDelivery).toContain(JSON.stringify(example.written));
        expect(output.spokenDelivery).toContain(JSON.stringify(example.spoken));
      }
      expect((identity.judgedDimensions as { clarity: string }).clarity).toContain(
        guidance.reviewStandard,
      );
      expect(JSON.stringify(identity)).not.toMatch(/Tottenham|Coventry|Marmoush|Yirenkyi/);
      expect(JSON.stringify(request)).not.toContain("Go on. Find someone who reckons");
    },
  );
});

describe("reviewers receive the same versioned spoken standard on another match", () => {
  it.each([...PUNDIT_IDS])(
    "carries the shared review into the %s clarity judge without changing evidence",
    async (punditId) => {
      const pack: EvidencePack = {
        id: "different-match",
        matchId: "different-match",
        version: 1,
        createdAt: "2026-01-01",
        facts: [],
        derivations: [],
        unavailableEvidence: [],
      };
      const script = "Eastford won. Westhaven conceded late.";
      const candidate: PunditVariantCandidate = {
        punditId,
        specVersion: 1,
        personalityBaseline: await compilePersonalityBaseline(punditId),
        thesis: {
          punditId,
          headline: "A late goal",
          judgment: script,
          selectedClaimIds: [],
          rejectedClaimIds: [],
          counterpoint: "",
          changeMyMind: "",
        },
        outline: {
          hook: script,
          match_story: "",
          evidence: "",
          explanation: "",
          judgment: "",
          counterpoint: "",
          humour: "",
          portable_line: "",
          prediction_or_receipt: "",
          close: "",
        },
        displayScript: script,
        spokenScript: script,
        performancePlan: [],
        claimIds: [],
      };
      const before = structuredClone({ pack, candidate });
      const results = await judgeCandidate({ candidate, pack, claims: [], proseOnly: true });
      const request = captured.requests.find((item) => item.label === "judge:clarity")!;
      const context = request.cachedContext as Array<Record<string, unknown>>;
      const subject = context.find((block) => block.spokenDelivery)!;
      expect(subject.spokenDelivery).toBe(spokenStyleBrief(punditId));
      expect(subject.personalityBaseline).toEqual(candidate.personalityBaseline);
      expect(subject.script).toBe(script);
      const user = JSON.parse(request.user as string);
      expect(user.standard).toBe(DIMENSION_STANDARDS.clarity);
      expect(user.standard).toContain(getSharedPersonality().spokenWriting!.reviewStandard);
      expect(JSON.stringify(context[0])).not.toContain("second yellow");
      expect(JSON.stringify(request)).not.toMatch(/Tottenham|Coventry|Marmoush|Yirenkyi/);
      expect({ pack, candidate }).toEqual(before);
      // Capturing transport is not a successful editorial verdict.
      expect(results.find((result) => result.harness === "clarity")?.passed).toBe(false);
    },
  );
});
