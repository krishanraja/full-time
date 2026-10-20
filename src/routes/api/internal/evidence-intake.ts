import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

export async function handleEvidenceIntake({ request }: { request: Request }) {
  const headers = { "Cache-Control": "no-store" };
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401, headers });
  const matchId = new URL(request.url).searchParams.get("matchId");
  const evidenceEnd = new URL(request.url).searchParams.get("end") ?? undefined;
  if (evidenceEnd && !/^\d{4}-\d{2}-\d{2}$/.test(evidenceEnd))
    return Response.json({ error: "Invalid snapshot end date" }, { status: 400, headers });
  if (!matchId || !/^af_\d+$/.test(matchId))
    return Response.json({ error: "Exact matchId required" }, { status: 400, headers });
  if (process.env.FT_EVIDENCE_INTAKE_ENABLED !== "true")
    return Response.json({ status: "disabled" }, { status: 409, headers });
  try {
    const [{ loadStructuredMatch }, { buildEvidencePack, intakeConflicts }] = await Promise.all([
      import("@/lib/pundit/structured-match.server"),
      import("@/lib/pundit/evidence"),
    ]);
    // The production match loader and pack builder, with no model, persistence,
    // narration or publication. Optional measurement conflicts are withheld
    // with their dependent derivations; identity/score conflicts still fail.
    const { input, coverageDate } = await loadStructuredMatch(matchId, { evidenceEnd });
    const pack = buildEvidencePack(input);
    const intake = input.intakeEvidence;
    if (!intake || intake.unavailable.length)
      return Response.json(
        { status: "unavailable", matchId, coverageDate, warnings: intake?.unavailable ?? [] },
        { status: 409, headers },
      );
    const conflicts = intakeConflicts(input);
    const facts = intake.facts.map((item) => ({
      id: item.id,
      value: item.value,
      provenance: item.provenance,
      consumed: pack.facts.some((fact) => fact.id === item.id && fact.value === item.value),
      withheld:
        conflicts.some((conflict) => conflict.id === item.id) &&
        !pack.facts.some((fact) => fact.id === item.id) &&
        !pack.derivations.some((fact) => fact.provenance.split(",").includes(item.id)),
    }));
    if (!facts.length || facts.some((fact) => !fact.consumed && !fact.withheld))
      throw new Error("No intake measurements consumed");
    return Response.json(
      {
        status: "verified",
        matchId,
        coverageDate,
        score: `${input.match.homeScore}-${input.match.awayScore}`,
        facts,
        counts: {
          intake: facts.length,
          consumed: facts.filter((fact) => fact.consumed).length,
          withheld: facts.filter((fact) => fact.withheld).length,
        },
        conflicts,
        sideEffects: { databaseWrites: false, modelCalls: 0, published: false },
      },
      { headers },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const reason = /conflict|disagrees/i.test(message)
      ? "product_fact_conflict"
      : /hash|snapshot/i.test(message)
        ? "snapshot_invalid"
        : "product_read_failed";
    const field = message.match(/stats\.(?:home|away)_[a-z_]+/)?.[0] ?? null;
    console.warn("evidence_intake_readback_failed", { reason, field, matchId });
    return Response.json(
      {
        status: "failed",
        reason,
        field,
        error: "Evidence intake validation or product data conflict; inspect server diagnostics",
      },
      { status: 503, headers },
    );
  }
}

export const Route = createFileRoute("/api/internal/evidence-intake")({
  server: { handlers: { GET: handleEvidenceIntake } },
});
