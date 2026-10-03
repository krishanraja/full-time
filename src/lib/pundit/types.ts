export const PUNDIT_IDS = ["zen", "gaffer", "stats", "romantic", "doomer", "banter"] as const;
export type PunditId = (typeof PUNDIT_IDS)[number];

/** What kind of thing an evidence item is.
 *
 *  "fact" is something that was counted or recorded: a goal, a corner, a
 *  scoreline. "derived" is arithmetic this repository did on facts, and its
 *  formula says exactly what. "estimate" is a number a model produced, and it
 *  is a separate kind because docs/05-content-safety.md requires the product
 *  to distinguish a model estimate from an observed fact, and until now the
 *  pack had no way to express the difference.
 *
 *  Expected goals is the reason. It was carried as a plain fact for months,
 *  indistinguishable from a shot count, which is how a pundit ends up saying a
 *  side "should have scored two" as though someone had counted them. */
export type EvidenceKind = "fact" | "derived" | "estimate";
export type EvidenceValue = string | number | boolean | null;

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  label: string;
  value: EvidenceValue | EvidenceValue[];
  source: string;
  provenance: string;
  formula?: string;
  /** For an estimate: the model that produced it, named so a listener could be
   *  told whose number it is. An estimate without one is not publishable. */
  model?: string;
};

export type EvidencePack = {
  id: string;
  matchId: string;
  version: number;
  createdAt: string;
  facts: readonly EvidenceItem[];
  derivations: readonly EvidenceItem[];
  unavailableEvidence: readonly string[];
};

export type StructuredRule = {
  metric: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "between";
  value: number | string | readonly [number, number];
  window?: string;
};

export type AnalysisClaim = {
  id: string;
  matchId: string;
  type:
    | "fact"
    | "mechanism"
    | "decision_quality"
    | "probability"
    | "counterfactual"
    | "opinion"
    | "prediction";
  thesis: string;
  evidenceRefs: string[];
  confidence: number;
  alternativeExplanation?: string;
  missingEvidence?: string[];
  falsifier?: string;
  evaluationRule?: StructuredRule;
};

export type PunditThesis = {
  punditId: PunditId;
  headline: string;
  judgment: string;
  selectedClaimIds: string[];
  rejectedClaimIds: string[];
  counterpoint: string;
  changeMyMind: string;
  predictionClaimId?: string;
};

export type BeatName =
  | "hook"
  | "match_story"
  | "evidence"
  | "explanation"
  | "judgment"
  | "counterpoint"
  | "humour"
  | "portable_line"
  | "prediction_or_receipt"
  | "close";

export type BeatOutline = Record<BeatName, string>;

export type PerformanceIntent =
  | "setup"
  | "explanation"
  | "evidence"
  | "pivot"
  | "verdict"
  | "punchline"
  | "prediction"
  | "receipt";

export type PerformanceBeat = {
  text: string;
  intent: PerformanceIntent;
  pace: "slow" | "measured" | "brisk";
  energy: 1 | 2 | 3 | 4 | 5;
  pauseBeforeMs?: number;
  emphasis?: string[];
  direction?: string;
};

export type QualitativeHarness =
  | "insight"
  | "clarity"
  | "judgment"
  | "outcome_separation"
  | "probability"
  | "independence"
  | "story"
  | "persona"
  | "humour"
  | "memorability"
  | "restraint"
  | "prediction_accountability";

export type HarnessResult = {
  harness: string;
  hardGate: boolean;
  passed: boolean;
  score?: 1 | 2 | 3 | 4 | 5;
  evidenceSpan?: string;
  failure?: string;
  requestedRepair?: string;
  failedBeats?: BeatName[];
};

export type PunditSpec = {
  id: PunditId;
  version: number;
  name: string;
  lens: string;
  analyticalWeights: {
    tacticalStructure: number;
    probabilityDecisionQuality: number;
    journalismContext: number;
    storyBroadcasting: number;
    provocation: number;
  };
  preferredClaimTypes: AnalysisClaim["type"][];
  evidencePreferences: string[];
  pointOfViewRules: string[];
  uncertaintyRules: string[];
  humourMechanisms: string[];
  allowedHumourTargets: string[];
  prohibitedHumourTargets: string[];
  vocabulary: string[];
  sentenceCadence: string;
  storyStructures: string[];
  predictionStyle: string;
  riskTolerance: "low" | "measured" | "high";
  voiceEnvKey: string;
  performance: {
    defaultPace: PerformanceBeat["pace"];
    defaultEnergy: PerformanceBeat["energy"];
    direction: string;
  };
  requiredThresholds: Record<QualitativeHarness, number>;
  positiveExamples: string[];
  antiExamples: string[];
  prohibitedShortcut: string;
};

export type PunditVariantCandidate = {
  punditId: PunditId;
  specVersion: number;
  thesis: PunditThesis;
  outline: BeatOutline;
  displayScript: string;
  spokenScript: string;
  performancePlan: PerformanceBeat[];
  claimIds: string[];
  predictionLockedAt?: string;
  kickoffAt?: string;
};
