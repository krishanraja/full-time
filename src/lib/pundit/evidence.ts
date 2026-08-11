import type { EvidenceItem, EvidencePack } from "./types";

export type StructuredMatchInput = {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    kickoffAt: string;
    competition: string;
    source: string;
  };
  events: Array<{
    id: string;
    type:
      | "goal"
      | "own_goal"
      | "penalty_goal"
      | "penalty_miss"
      | "yellow"
      | "red"
      | "second_yellow"
      | "sub"
      | "var";
    minute: number | null;
    addedTime?: number | null;
    team: string | null;
    player: string | null;
    source: string;
  }>;
  stats?: {
    homeXg?: number | null;
    awayXg?: number | null;
    homeShots?: number | null;
    awayShots?: number | null;
    homeShotsOnTarget?: number | null;
    awayShotsOnTarget?: number | null;
    homePossession?: number | null;
    awayPossession?: number | null;
    homeCorners?: number | null;
    awayCorners?: number | null;
    homeSaves?: number | null;
    awaySaves?: number | null;
    source: string;
  };
  feedsAgree?: boolean | null;
};

const unavailableEvidence = [
  "pressing triggers or pressing shapes",
  "rest defence, overloads, spacing or off-ball rotations",
  "body shape, scanning, positioning or unrecorded player decisions",
  "coaching intent",
  "dressing-room dynamics, confidence, leadership or effort",
  "film-specific tactical mechanisms",
  "recruitment, PSR, ownership, injury or transfer context without a licensed source",
];

function fact(
  id: string,
  label: string,
  value: EvidenceItem["value"],
  source: string,
  provenance: string,
): EvidenceItem {
  return { id, kind: "fact", label, value, source, provenance };
}

function derived(
  id: string,
  label: string,
  value: EvidenceItem["value"],
  source: string,
  provenance: string,
  formula: string,
): EvidenceItem {
  return { id, kind: "derived", label, value, source, provenance, formula };
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildEvidencePack(input: StructuredMatchInput, version = 1): EvidencePack {
  const { match, stats } = input;
  const facts: EvidenceItem[] = [
    fact("match.home_team", "Home team", match.homeTeam, match.source, "matches.home_team_id"),
    fact("match.away_team", "Away team", match.awayTeam, match.source, "matches.away_team_id"),
    fact("match.home_score", "Home score", match.homeScore, match.source, "matches.home_score"),
    fact("match.away_score", "Away score", match.awayScore, match.source, "matches.away_score"),
    fact("match.kickoff", "Kickoff", match.kickoffAt, match.source, "matches.kickoff_at"),
    fact("match.competition", "Competition", match.competition, match.source, "matches.league_id"),
  ];

  if (input.feedsAgree != null) {
    facts.push(
      fact(
        "match.feeds_agree",
        "Independent score feeds agree",
        input.feedsAgree,
        "cross-feed verification",
        "match_context.feeds_agree",
      ),
    );
  }

  for (const event of input.events) {
    facts.push(
      fact(
        `event.${event.id}`,
        `${event.type} event`,
        [event.minute, event.addedTime ?? null, event.team, event.player],
        event.source,
        `match_events.id=${event.id}`,
      ),
    );
  }

  const statEntries: Array<[string, string, number | null | undefined]> = [
    ["stats.home_xg", "Home xG", stats?.homeXg],
    ["stats.away_xg", "Away xG", stats?.awayXg],
    ["stats.home_shots", "Home shots", stats?.homeShots],
    ["stats.away_shots", "Away shots", stats?.awayShots],
    ["stats.home_sot", "Home shots on target", stats?.homeShotsOnTarget],
    ["stats.away_sot", "Away shots on target", stats?.awayShotsOnTarget],
    ["stats.home_possession", "Home possession", stats?.homePossession],
    ["stats.away_possession", "Away possession", stats?.awayPossession],
    ["stats.home_corners", "Home corners", stats?.homeCorners],
    ["stats.away_corners", "Away corners", stats?.awayCorners],
    ["stats.home_saves", "Home saves", stats?.homeSaves],
    ["stats.away_saves", "Away saves", stats?.awaySaves],
  ];
  for (const [id, label, value] of statEntries) {
    if (finite(value)) facts.push(fact(id, label, value, stats?.source ?? "unknown", id));
  }

  const derivations: EvidenceItem[] = [];
  if (finite(stats?.homeXg) && finite(stats?.awayXg)) {
    derivations.push(
      derived(
        "derived.xg_difference",
        "Home xG minus away xG",
        Number((stats.homeXg - stats.awayXg).toFixed(2)),
        stats.source,
        "stats.home_xg,stats.away_xg",
        "round(home_xg - away_xg, 2)",
      ),
    );
  }
  if (finite(stats?.homeShots) && stats.homeShots > 0) {
    derivations.push(
      derived(
        "derived.home_conversion",
        "Home goals per shot",
        Number((match.homeScore / stats.homeShots).toFixed(3)),
        stats.source,
        "match.home_score,stats.home_shots",
        "round(home_score / home_shots, 3)",
      ),
    );
  }
  if (finite(stats?.awayShots) && stats.awayShots > 0) {
    derivations.push(
      derived(
        "derived.away_conversion",
        "Away goals per shot",
        Number((match.awayScore / stats.awayShots).toFixed(3)),
        stats.source,
        "match.away_score,stats.away_shots",
        "round(away_score / away_shots, 3)",
      ),
    );
  }

  return {
    id: `${match.id}:evidence:v${version}`,
    matchId: match.id,
    version,
    createdAt: new Date().toISOString(),
    facts,
    derivations,
    unavailableEvidence,
  };
}

export function evidenceById(pack: EvidencePack): ReadonlyMap<string, EvidenceItem> {
  return new Map([...pack.facts, ...pack.derivations].map((item) => [item.id, item]));
}
