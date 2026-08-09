import { evidenceById } from "./evidence";
import type { AnalysisClaim, EvidencePack } from "./types";

const UNSUPPORTED_TACTICS = [
  /press(?:ing)? trigger/i,
  /pressing shape/i,
  /rest defen[cs]e/i,
  /overload/i,
  /off[- ]ball rotation/i,
  /spacing/i,
  /body shape/i,
  /scanning/i,
  /left (?:him|her|them) (?:one[- ]on[- ]one|1v1|one[- ]against[- ]two|1v2)/i,
  /told (?:him|her|them) to/i,
  /deliberately (?:left|created|pressed|inverted)/i,
  /dressing room/i,
  /wanted it more/i,
  /lack(?:ed|s)? (?:desire|passion|leadership|confidence|effort)/i,
];

const OUTCOME_AS_JUSTIFICATION = [
  /(?:because|since) it (?:worked|came off|went in),? (?:it was|that was) (?:a )?good/i,
  /the goal proves (?:the )?(?:shot|decision|substitution) was right/i,
];

export type ClaimLicenseResult = {
  licensed: boolean;
  failures: string[];
};

export function unsupportedTacticsSpans(text: string): string[] {
  return UNSUPPORTED_TACTICS.flatMap((pattern) => text.match(pattern)?.[0] ?? []);
}

export function licenseClaim(claim: AnalysisClaim, pack: EvidencePack): ClaimLicenseResult {
  const failures: string[] = [];
  const evidence = evidenceById(pack);

  if (claim.matchId !== pack.matchId)
    failures.push("Claim and evidence pack refer to different matches.");
  if (claim.evidenceRefs.length === 0) failures.push("Claim cites no evidence.");
  const missingRefs = claim.evidenceRefs.filter((ref) => !evidence.has(ref));
  if (missingRefs.length) failures.push(`Unknown evidence references: ${missingRefs.join(", ")}.`);
  if (claim.confidence < 0 || claim.confidence > 1)
    failures.push("Confidence must be between 0 and 1.");

  const unsupported = unsupportedTacticsSpans(claim.thesis);
  if (unsupported.length) {
    failures.push(`Requires unavailable film or tracking evidence: ${unsupported.join(", ")}.`);
  }
  if (OUTCOME_AS_JUSTIFICATION.some((pattern) => pattern.test(claim.thesis))) {
    failures.push("Confuses a successful outcome with decision quality.");
  }
  if ((claim.type === "counterfactual" || claim.type === "prediction") && !claim.falsifier) {
    failures.push(`${claim.type} requires a falsifier.`);
  }
  if ((claim.type === "counterfactual" || claim.type === "prediction") && !claim.evaluationRule) {
    failures.push(`${claim.type} requires a structured evaluation rule.`);
  }
  if (claim.type === "mechanism" && /because|caused|led to|resulted in/i.test(claim.thesis)) {
    const causalSupport = claim.evidenceRefs.some(
      (ref) => ref.startsWith("event.") || ref.startsWith("derived."),
    );
    if (!causalSupport)
      failures.push("Causal-strength mechanism claim lacks event or derived support.");
  }

  return { licensed: failures.length === 0, failures };
}

export function licenseClaims(claims: AnalysisClaim[], pack: EvidencePack) {
  return claims.map((claim) => ({ claim, ...licenseClaim(claim, pack) }));
}
