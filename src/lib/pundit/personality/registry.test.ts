import { describe, expect, it } from "vitest";
import { PUNDIT_IDS } from "../types";
import { getPunditSpec } from "../specs";
import { spokenStyleBrief, spokenRateRange } from "../spoken-style";
import { applyPerformanceCadence, spokenIdentity } from "@/lib/api/narration.server";
import {
  assertNarrationPersonality,
  compilePersonalityBaseline,
  exportPersonalityCore,
  getPersonalityProfile,
  getPersonalityRelease,
  getSharedPersonality,
  PersonalityProfileSchema,
  verifyPersonalityInputs,
  personalityChangeScope,
} from "./registry";

describe("product-owned personality release", () => {
  it("declares the initial migration and expands shared changes to all six profiles", () => {
    expect(personalityChangeScope(undefined, getPersonalityRelease()).affectedProfiles).toEqual([
      ...PUNDIT_IDS,
    ]);
    const previous = getPersonalityRelease(),
      next = getPersonalityRelease();
    next.id += ".next";
    next.shared.version = "1.1.0";
    next.shared.sha256 = "a".repeat(64);
    next.changes = {
      baselineReleaseId: previous.id,
      owners: ["shared"],
      reason: "Shared delivery revision",
    };
    expect(personalityChangeScope(previous, next).affectedProfiles).toEqual([...PUNDIT_IDS]);
    next.changes.owners = ["doomer"];
    expect(() => personalityChangeScope(previous, next)).toThrow(/exactly/);
  });
  it("requires a new version and correct baseline for a targeted change", () => {
    const previous = getPersonalityRelease(),
      next = getPersonalityRelease();
    next.id += ".next";
    next.profiles.find((p) => p.id === "doomer")!.sha256 = "a".repeat(64);
    next.changes = {
      baselineReleaseId: previous.id,
      owners: ["doomer"],
      reason: "Doomer delivery revision",
    };
    expect(() => personalityChangeScope(previous, next)).toThrow(/higher version/);
    next.profiles.find((p) => p.id === "doomer")!.version = "1.0.1";
    expect(personalityChangeScope(previous, next).affectedProfiles).toEqual(["doomer"]);
    next.changes.baselineReleaseId = "wrong";
    expect(() => personalityChangeScope(previous, next)).toThrow(/wrong baseline/);
  });
  it.each([...PUNDIT_IDS])("verifies %s against exact product hashes", async (id) => {
    const ref = await compilePersonalityBaseline(id);
    expect(ref.profileId).toBe(id);
    expect(ref.profileSha256).toHaveLength(64);
    expect(ref.releaseId).toBe(getPersonalityRelease().id);
    expect(getPunditSpec(id).voiceEnvKey).toBe(getPersonalityProfile(id).voice.envKey);
  });
  it("rejects a profile edit without its release hash", async () => {
    const profile = getPersonalityProfile("romantic");
    profile.spec.lens = "Unreviewed replacement";
    await expect(
      verifyPersonalityInputs(profile, getSharedPersonality(), getPersonalityRelease()),
    ).rejects.toThrow(/pinned release/);
  });
  it("rejects shared changes without updating the shared pin", async () => {
    const shared = getSharedPersonality();
    shared.crossSurfaceSpeech = "A new tone";
    await expect(
      verifyPersonalityInputs(getPersonalityProfile("doomer"), shared, getPersonalityRelease()),
    ).rejects.toThrow(/Shared personality/);
  });
  it("does not let a profile override shared policy or another character", () => {
    const p = getPersonalityProfile("romantic");
    expect(PersonalityProfileSchema.safeParse({ ...p, sharedPolicy: {} }).success).toBe(false);
    expect(
      PersonalityProfileSchema.safeParse({ ...p, spec: { ...p.spec, requiredThresholds: {} } })
        .success,
    ).toBe(false);
  });
  it("isolates caller mutations from every other persona and future read", () => {
    const before = PUNDIT_IDS.map((id) => getPunditSpec(id));
    const p = getPunditSpec("romantic");
    p.lens = "Mutated";
    p.humourMechanisms.push("Mutated");
    expect(PUNDIT_IDS.map((id) => getPunditSpec(id))).toEqual(before);
  });
  it("retains Reporter calibration and avoids copying it to other personas", () => {
    expect(spokenRateRange("zen")).toEqual({ min: 175, max: 210 });
    for (const id of PUNDIT_IDS.filter((id) => id !== "zen"))
      expect(spokenRateRange(id)).toEqual({ min: 110, max: 190 });
  });
  it("keeps product casting distinct from the whinier fictional ad variant", () => {
    expect(spokenStyleBrief("doomer")).toContain("not a new product-wide default");
    expect(getPunditSpec("doomer").performance.defaultPace).toBe("measured");
    expect(getPersonalityProfile("doomer").voice.listeningStatus).toBe("audition_required");
    expect(getPersonalityProfile("zen").voice.automationEquivalentToReference).toBe(false);
  });
  it("keeps narration directions owned by the selected profile without changing words", () => {
    const script = "North had fifteen shots. The score did not settle the argument.";
    for (const id of PUNDIT_IDS) {
      const rendered = applyPerformanceCadence(script, id);
      expect(rendered).toContain(`[${getPersonalityProfile(id).voice.tags.setup}]`);
      expect(spokenIdentity(rendered, script)).toBe(true);
    }
  });
  it("blocks missing, changed or cross-persona baselines before fresh narration", async () => {
    await expect(assertNarrationPersonality("doomer")).rejects.toThrow(/recorded/);
    const ref = await compilePersonalityBaseline("romantic");
    await expect(assertNarrationPersonality("doomer", ref)).rejects.toThrow(/differs/);
    await expect(
      assertNarrationPersonality("romantic", { ...ref, sharedSha256: "0".repeat(64) }),
    ).rejects.toThrow(/differs/);
    await expect(assertNarrationPersonality("romantic", ref)).resolves.toEqual(ref);
  });
  it("exports one complete versioned product source for growth", async () => {
    const packet = await exportPersonalityCore("a".repeat(40));
    expect(packet.profiles.map((p) => p.id)).toEqual([...PUNDIT_IDS]);
    expect(packet.source.repository).toBe("krishanraja/full-time");
    expect(packet.profiles.every((p) => p.product_automation_equivalent === false)).toBe(true);
    expect(JSON.stringify(packet)).not.toMatch(/Best Supporting Club|Lovely month for Spurs/);
  });
});
