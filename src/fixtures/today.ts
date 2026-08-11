import type { TodayEditorialResponse } from "@/components/TodayShowPlayer";
import type { PublicPrediction } from "@/lib/api/editorial-public.server";
import type { PunditId } from "@/lib/pundit/types";
import { PERSONALITIES } from "@/components/PersonalitySelector";

const UUIDS: Record<PunditId, string> = {
  zen: "11111111-1111-4111-8111-111111111111",
  gaffer: "22222222-2222-4222-8222-222222222222",
  stats: "33333333-3333-4333-8333-333333333333",
  romantic: "44444444-4444-4444-8444-444444444444",
  doomer: "55555555-5555-4555-8555-555555555555",
  banter: "66666666-6666-4666-8666-666666666666",
};

function variant(pundit: PunditId, dropId: string, title: string) {
  const meta = PERSONALITIES.find((item) => item.id === pundit)!;
  return {
    id: UUIDS[pundit],
    drop_id: dropId,
    pundit_id: pundit,
    spec_version: 1,
    thesis: { selectedClaimIds: ["77777777-7777-4777-8777-777777777777"] },
    title,
    description: "Six AI Pundits each made a full show from the same checked facts.",
    display_script: `${meta.name} reads the same match through a different lens.`,
    performance_plan: [],
    audio_url: "__fixture_audio__",
    audio_bytes: null,
    audio_duration_sec: 12,
    share_image_url: null,
    transcript: null,
    published_at: "2026-08-11T08:00:00.000Z",
  };
}

export function todayFixture(pundit: PunditId): TodayEditorialResponse {
  const current = variant(
    pundit,
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    pundit === "stats" ? "The game after the goals" : "What the score forgot to say",
  );
  return {
    coverageDate: "2026-08-11",
    state: "published",
    drop: { id: current.drop_id },
    variant: current,
    latest: null,
    matchId: "fixture-match",
    teamIds: ["fixture-home", "fixture-away"],
    proofCards: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        claim: "The late pressure changed the match.",
        evidence: ["Shots after 60 minutes: 7"],
        boundary: "More shots do not always mean better chances.",
      },
      {
        id: "88888888-8888-4888-8888-888888888888",
        claim: "One switch gave the game a new shape.",
        evidence: ["Recorded change: just before the equaliser"],
        boundary: "Timing alone cannot tell us what the manager meant.",
      },
    ],
    recent: [
      {
        coverageDate: "2026-08-10",
        variant: variant(
          "romantic",
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          "The comeback that nearly was",
        ),
      },
      {
        coverageDate: "2026-08-09",
        variant: variant("banter", "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "A very noisy nil-nil"),
      },
    ],
  };
}

export function settledFixture(pundit: PunditId): PublicPrediction[] {
  return [
    {
      id: "99999999-9999-4999-8999-999999999999",
      pundit_id: pundit,
      match_id: "fixture-match",
      kickoff_at: "2026-08-10T18:00:00.000Z",
      locked_at: "2026-08-10T17:00:00.000Z",
      shared_probabilities: {},
      pundit_probabilities: {},
      thesis: "The midfield would decide it.",
      measurable_advantage: "More recoveries in the middle third.",
      indicator: "Second-ball wins.",
      expected_turning_point: "After half time.",
      falsifier: "The wide areas decide the match.",
      evaluation_rule: {},
      settlement: null,
      status: "partly_correct",
      brier_score: null,
      log_loss: null,
      receipt: "The middle mattered, but the winner came from a wide break.",
      settled_at: "2026-08-10T21:00:00.000Z",
    },
  ];
}
