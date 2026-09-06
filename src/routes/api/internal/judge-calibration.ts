import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

// Scores scripts of known quality against the live judge set, so the twelve
// publication floors can be checked against writing someone already agrees is
// good. Reads a sealed evidence pack, spends money on judges only, and writes
// nothing back. See src/lib/pundit/calibration.ts for why.
async function handle({ request }: { request: Request }) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  let input: {
    dropId?: string;
    variantId?: string;
    includeStoredVariant?: boolean;
    subjects?: Array<{ label: string; punditId?: string; script: string }>;
  };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  try {
    const { runJudgeCalibration } = await import("@/lib/pundit/judge-calibration.server");
    const report = await runJudgeCalibration({
      dropId: input.dropId,
      variantId: input.variantId,
      includeStoredVariant: input.includeStoredVariant,
      subjects: (input.subjects ?? []).map((subject) => ({
        label: subject.label,
        punditId: subject.punditId as Parameters<
          typeof runJudgeCalibration
        >[0]["subjects"][number]["punditId"],
        script: subject.script,
      })),
    });
    console.log(
      JSON.stringify({
        level: "info",
        message: "judge_calibration_completed",
        matchId: report.matchId,
        costUsd: report.costUsd,
        subjects: report.subjects.map((subject) => ({
          label: subject.label,
          meanScoreCraftOnly: subject.meanScoreCraftOnly,
          passedCount: subject.passedCount,
        })),
      }),
    );
    return Response.json(report);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}

export const Route = createFileRoute("/api/internal/judge-calibration")({
  server: { handlers: { POST: handle } },
});
