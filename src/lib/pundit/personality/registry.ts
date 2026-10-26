import { z } from "zod";
import { sha256Hex } from "../hash.ts";
import { PUNDIT_IDS, type PunditId, type PunditSpec } from "../types.ts";
import sharedData from "./shared/1.0.0.json" with { type: "json" };
import reporter from "./profiles/zen/1.0.0.json" with { type: "json" };
import gaffer from "./profiles/gaffer/1.0.0.json" with { type: "json" };
import numbers from "./profiles/stats/1.0.0.json" with { type: "json" };
import romantic from "./profiles/romantic/1.0.0.json" with { type: "json" };
import doomer from "./profiles/doomer/1.0.0.json" with { type: "json" };
import windup from "./profiles/banter/1.0.0.json" with { type: "json" };
import releaseData from "./release.json" with { type: "json" };

const nonempty = z.string().min(1);
const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const strings = z.array(nonempty).min(1);
const range = z
  .object({ min: z.number().int().positive(), max: z.number().int().positive() })
  .strict();
const tags = z.enum([
  "measured",
  "dry",
  "flat",
  "slower",
  "warmer",
  "wry",
  "matter of fact",
  "quietly",
  "resigned",
  "thoughtful",
  "curious",
  "excited",
  "sarcastic",
  "mischievously",
]);
const thresholds = z
  .object({
    insight: z.number(),
    clarity: z.number(),
    judgment: z.number(),
    outcome_separation: z.number(),
    probability: z.number(),
    independence: z.number(),
    story: z.number(),
    persona: z.number(),
    humour: z.number(),
    memorability: z.number(),
    restraint: z.number(),
    prediction_accountability: z.number(),
  })
  .strict();

export const SharedPersonalitySchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.literal("full-time.shared"),
    version,
    policy: z
      .object({
        analyticalWeights: z
          .object({
            tacticalStructure: z.number(),
            probabilityDecisionQuality: z.number(),
            journalismContext: z.number(),
            storyBroadcasting: z.number(),
            provocation: z.number(),
          })
          .strict(),
        allowedHumourTargets: strings,
        prohibitedHumourTargets: strings,
        requiredThresholds: thresholds,
      })
      .strict(),
    productSpeech: nonempty,
    crossSurfaceSpeech: nonempty,
    humourChecks: strings,
    sourceRefs: strings,
  })
  .strict();

export const PersonalityProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.enum(PUNDIT_IDS),
    version,
    specVersion: z.number().int().positive(),
    spec: z
      .object({
        name: nonempty,
        lens: nonempty,
        preferredClaimTypes: z
          .array(
            z.enum([
              "fact",
              "mechanism",
              "decision_quality",
              "probability",
              "counterfactual",
              "opinion",
              "prediction",
            ]),
          )
          .min(1),
        evidencePreferences: strings,
        pointOfViewRules: strings,
        uncertaintyRules: strings,
        humourMechanisms: strings,
        vocabulary: strings,
        sentenceCadence: nonempty,
        storyStructures: strings,
        predictionStyle: nonempty,
        riskTolerance: z.enum(["low", "measured", "high"]),
        performance: z
          .object({
            defaultPace: z.enum(["slow", "measured", "brisk"]),
            defaultEnergy: z.union([
              z.literal(1),
              z.literal(2),
              z.literal(3),
              z.literal(4),
              z.literal(5),
            ]),
            direction: nonempty,
          })
          .strict(),
        positiveExamples: strings,
        antiExamples: strings,
        prohibitedShortcut: nonempty,
      })
      .strict(),
    spoken: z
      .object({ productBrief: nonempty, rateRange: range, wordRange: range, durationRange: range })
      .strict(),
    voice: z
      .object({
        envKey: z.string().regex(/^ELEVENLABS_VOICE_[A-Z_]+$/),
        tags: z
          .object({ setup: tags, evidence: tags, verdict: tags, punchline: tags, close: tags })
          .strict(),
        castingTarget: nonempty,
        listeningStatus: z.enum(["reference_approved", "audition_required"]),
        automationEquivalentToReference: z.literal(false),
      })
      .strict(),
    sourceRefs: strings,
  })
  .strict();

const pin = z.object({ id: nonempty, version, path: nonempty, sha256: hash }).strict();
export const PersonalityReleaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: nonempty,
    shared: pin,
    profiles: z.array(pin).length(6),
    authority: nonempty,
    humanListening: nonempty,
    changes: z
      .object({
        baselineReleaseId: nonempty.nullable(),
        owners: z.array(z.enum(["shared", ...PUNDIT_IDS])).min(1),
        reason: nonempty,
      })
      .strict(),
  })
  .strict();

export type PersonalityProfile = z.infer<typeof PersonalityProfileSchema>;
export type SharedPersonality = z.infer<typeof SharedPersonalitySchema>;
export type PersonalityRelease = z.infer<typeof PersonalityReleaseSchema>;
export type PersonalityBaselineRef = {
  releaseId: string;
  profileId: PunditId;
  profileVersion: string;
  profileSha256: string;
  sharedVersion: string;
  sharedSha256: string;
};

export function canonicalPersonalityJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalPersonalityJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalPersonalityJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  const text = JSON.stringify(value);
  if (text === undefined) throw new Error("Personality records must be JSON values.");
  return text;
}

export function personalityChangeScope(previousInput: unknown | undefined, nextInput: unknown) {
  const next = PersonalityReleaseSchema.parse(nextInput);
  const previous =
    previousInput === undefined ? undefined : PersonalityReleaseSchema.parse(previousInput);
  const changed = ["shared", ...PUNDIT_IDS].filter((owner) => {
    const before =
      owner === "shared" ? previous?.shared : previous?.profiles.find((p) => p.id === owner);
    const after = owner === "shared" ? next.shared : next.profiles.find((p) => p.id === owner);
    return before?.sha256 !== after?.sha256;
  });
  if (previous && canonicalPersonalityJson(previous) === canonicalPersonalityJson(next))
    return { changedOwners: [], affectedProfiles: [], requiredRegression: "unchanged" };
  const declared = [...new Set(next.changes.owners)].sort();
  if (
    next.changes.owners.length !== declared.length ||
    canonicalPersonalityJson(declared) !== canonicalPersonalityJson([...changed].sort())
  )
    throw new Error("Declare exactly the personality owners changed in this release.");
  if (next.changes.baselineReleaseId !== (previous?.id ?? null))
    throw new Error("Personality change declaration names the wrong baseline release.");
  if (previous && next.id === previous.id)
    throw new Error("A changed personality manifest needs a new release ID.");
  for (const owner of changed) {
    const before =
      owner === "shared" ? previous?.shared : previous?.profiles.find((p) => p.id === owner);
    const after = owner === "shared" ? next.shared : next.profiles.find((p) => p.id === owner);
    if (before && after) {
      const a = before.version.split(".").map(Number),
        b = after.version.split(".").map(Number);
      const first = b.findIndex((part, index) => part !== a[index]);
      if (first < 0 || b[first] < a[first])
        throw new Error(`Changed personality ${owner} needs a higher version.`);
    }
  }
  return {
    changedOwners: changed,
    affectedProfiles: changed.includes("shared") ? [...PUNDIT_IDS] : changed,
    requiredRegression: changed.includes("shared")
      ? "all six profiles and ensemble comparison"
      : "targeted audition plus unchanged-profile and ensemble comparison",
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const shared = freeze(SharedPersonalitySchema.parse(sharedData));
const release = freeze(PersonalityReleaseSchema.parse(releaseData));
const profiles = freeze(
  Object.fromEntries(
    [reporter, gaffer, numbers, romantic, doomer, windup].map((raw) => {
      const profile = PersonalityProfileSchema.parse(raw);
      return [profile.id, profile];
    }),
  ) as Record<PunditId, PersonalityProfile>,
);

if (
  new Set(release.profiles.map((entry) => entry.id)).size !== 6 ||
  PUNDIT_IDS.some((id) => !release.profiles.some((entry) => entry.id === id))
) {
  throw new Error("Personality release must pin each of the six identities exactly once.");
}

export function getPersonalityProfile(id: PunditId): PersonalityProfile {
  return structuredClone(profiles[id]);
}
export function getSharedPersonality(): SharedPersonality {
  return structuredClone(shared);
}
export function getPersonalityRelease(): PersonalityRelease {
  return structuredClone(release);
}

export function productSpecFor(id: PunditId): PunditSpec {
  const profile = profiles[id];
  return structuredClone({
    ...shared.policy,
    ...profile.spec,
    id,
    version: profile.specVersion,
    voiceEnvKey: profile.voice.envKey,
  });
}

export async function verifyPersonalityInputs(
  profileInput: unknown,
  sharedInput: unknown,
  releaseInput: unknown,
): Promise<PersonalityBaselineRef> {
  const profile = PersonalityProfileSchema.parse(profileInput);
  const common = SharedPersonalitySchema.parse(sharedInput);
  const manifest = PersonalityReleaseSchema.parse(releaseInput);
  const profilePin = manifest.profiles.find((entry) => entry.id === profile.id);
  const profileSha256 = await sha256Hex(canonicalPersonalityJson(profile));
  const sharedSha256 = await sha256Hex(canonicalPersonalityJson(common));
  if (
    !profilePin ||
    profilePin.version !== profile.version ||
    profilePin.path !== `profiles/${profile.id}/${profile.version}.json` ||
    profilePin.sha256 !== profileSha256
  ) {
    throw new Error(`Personality ${profile.id} differs from its pinned release.`);
  }
  if (
    manifest.shared.id !== common.id ||
    manifest.shared.version !== common.version ||
    manifest.shared.path !== `shared/${common.version}.json` ||
    manifest.shared.sha256 !== sharedSha256
  ) {
    throw new Error("Shared personality direction differs from its pinned release.");
  }
  return {
    releaseId: manifest.id,
    profileId: profile.id,
    profileVersion: profile.version,
    profileSha256,
    sharedVersion: common.version,
    sharedSha256,
  };
}

export async function compilePersonalityBaseline(id: PunditId): Promise<PersonalityBaselineRef> {
  return verifyPersonalityInputs(profiles[id], shared, release);
}

export async function assertNarrationPersonality(id: PunditId, recorded?: PersonalityBaselineRef) {
  if (!recorded)
    throw new Error("New narration requires the script's recorded personality baseline.");
  const current = await compilePersonalityBaseline(id);
  if (canonicalPersonalityJson(recorded) !== canonicalPersonalityJson(current)) {
    throw new Error(
      "Stored script personality differs from the current narration baseline; explicit re-review is required.",
    );
  }
  return current;
}

export async function exportPersonalityCore(sourceRevision: string) {
  const refs = await Promise.all(PUNDIT_IDS.map(compilePersonalityBaseline));
  return {
    schema_version: 1,
    source: { repository: "krishanraja/full-time", revision: sourceRevision },
    release: getPersonalityRelease(),
    shared: {
      id: shared.id,
      version: shared.version,
      sha256: release.shared.sha256,
      data: getSharedPersonality(),
      delivery: shared.crossSurfaceSpeech,
      humour_checks: shared.humourChecks,
    },
    profiles: PUNDIT_IDS.map((id) => ({
      id,
      version: profiles[id].version,
      sha256: refs.find((ref) => ref.profileId === id)!.profileSha256,
      data: getPersonalityProfile(id),
      identity: {
        name: profiles[id].spec.name,
        lens: profiles[id].spec.lens,
        humourMechanisms: profiles[id].spec.humourMechanisms,
        sentenceCadence: profiles[id].spec.sentenceCadence,
      },
      voice_target: profiles[id].voice.castingTarget,
      product_listening_status: profiles[id].voice.listeningStatus,
      product_automation_equivalent: false,
    })),
    scope:
      "Reusable identity and delivery reference. Product evidence policies, ad scripts, casting approvals and publishing decisions retain their own scope.",
  };
}
