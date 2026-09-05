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
    /** Provider detail. For a substitution this carries the outgoing player as
     *  "off:Name", which is the only record of who left the pitch. */
    detail?: string | null;
    source: string;
  }>;
  stats?: {
    homeXg?: number | null;
    awayXg?: number | null;
    homeShots?: number | null;
    awayShots?: number | null;
    homeShotsOnTarget?: number | null;
    awayShotsOnTarget?: number | null;
    homeShotsInsideBox?: number | null;
    awayShotsInsideBox?: number | null;
    homeShotsOutsideBox?: number | null;
    awayShotsOutsideBox?: number | null;
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

/** The outgoing player in a substitution, which the provider records as
 *  "off:Name" in the detail field. */
export function outgoingPlayer(detail: string | null | undefined): string | null {
  const match = /^\s*off\s*:\s*(.+)$/i.exec(detail ?? "");
  return match ? match[1].trim() : null;
}

/** Writers and judges read the same evidence, so a line either of them can read
 *  two ways puts them in direct contradiction and no repair round can settle
 *  it. Both event kinds below were ambiguous exactly that way.
 *
 *  An own goal is recorded against the team it counts FOR, while the player
 *  named is the one who put it into his own net, so he plays for the other
 *  side. A substitution names only the player arriving, and the provider keeps
 *  the departing one in a detail field the pack used to discard. */
function eventLabel(
  event: { type: string; team: string | null; player: string | null; detail?: string | null },
  homeTeam: string,
  awayTeam: string,
): string {
  if (/own[_\s-]?goal/i.test(event.type) && event.team) {
    const conceding = event.team === homeTeam ? awayTeam : homeTeam;
    const player = event.player ? `${event.player} of ${conceding}` : conceding;
    return `own goal event: counts as a goal for ${event.team}, put through his own net by ${player}`;
  }
  // A substitution names only the player arriving, so "sub event: Caicedo"
  // reads identically whether he came on or went off. He did both in this
  // fixture, at different times.
  if (/^sub/i.test(event.type)) {
    const off = outgoingPlayer(event.detail);
    const team = event.team ?? "the side";
    if (event.player && off)
      return `substitution event: ${team} bring on ${event.player} for ${off}`;
    if (event.player) return `substitution event: ${team} bring on ${event.player}`;
    if (off) return `substitution event: ${team} take off ${off}`;
  }
  return `${event.type} event`;
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
        eventLabel(event, match.homeTeam, match.awayTeam),
        // The outgoing player belongs in the value, not only the label: the
        // entity licence is built from values, so a name that appears only in
        // prose would be read as invented.
        [
          event.minute,
          event.addedTime ?? null,
          event.team,
          event.player,
          ...(outgoingPlayer(event.detail) ? [outgoingPlayer(event.detail)] : []),
        ],
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
    ["stats.home_shots_inside_box", "Home shots from inside the box", stats?.homeShotsInsideBox],
    ["stats.away_shots_inside_box", "Away shots from inside the box", stats?.awayShotsInsideBox],
    ["stats.home_shots_outside_box", "Home shots from outside the box", stats?.homeShotsOutsideBox],
    ["stats.away_shots_outside_box", "Away shots from outside the box", stats?.awayShotsOutsideBox],
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
  // Where a side shot from, as a share of its shots.
  //
  // Not expected goals, and it must never be called that. It is the closest
  // honest measure of chance quality the feed still carries, and chance quality
  // is exactly what the judges keep rejecting scripts for failing to establish:
  // fourteen efforts from outside the box and fourteen from inside it are the
  // same number and a different match.
  const shotLocation = [
    {
      side: "home" as const,
      label: "Home",
      inside: stats?.homeShotsInsideBox,
      outside: stats?.homeShotsOutsideBox,
    },
    {
      side: "away" as const,
      label: "Away",
      inside: stats?.awayShotsInsideBox,
      outside: stats?.awayShotsOutsideBox,
    },
  ];
  for (const { side, label, inside, outside } of shotLocation) {
    if (!stats || !finite(inside) || !finite(outside)) continue;
    const total = inside + outside;
    if (total <= 0) continue;
    derivations.push(
      derived(
        // Stated as whole percent, because that is how a pundit says it out
        // loud. Given 0.286 the writer reaches for "under thirty percent", and
        // thirty is a number the evidence does not carry, so the numeric
        // licence refuses the script. Give it a figure it can speak exactly.
        `derived.${side}_inside_box_percent`,
        `${label} percentage of shots taken from inside the box`,
        Math.round((inside / total) * 100),
        stats.source,
        `stats.${side}_shots_inside_box,stats.${side}_shots_outside_box`,
        "round(100 * shots_inside_box / (shots_inside_box + shots_outside_box))",
      ),
    );
  }

  // How long a side had to respond to a goal.
  //
  // "Ipswich had eighty-one minutes to solve it" is subtraction from two
  // numbers the evidence carries, the goal's minute and the ninety a match
  // lasts, but the numeric licence sees only an eighty-one that appears
  // nowhere and refuses the script. Writers reach for this constantly, because
  // it is how anyone describes an early goal, so the pack states it.
  const goalMinutes = input.events
    .filter((event) => event.type === "goal" || event.type === "own_goal")
    .map((event) => event.minute)
    .filter((minute): minute is number => finite(minute) && minute > 0 && minute <= 90)
    .sort((left, right) => left - right);
  if (goalMinutes.length) {
    const first = goalMinutes[0];
    const last = goalMinutes[goalMinutes.length - 1];
    derivations.push(
      derived(
        "derived.minutes_after_opening_goal",
        "Minutes of normal time played after the opening goal",
        90 - first,
        "derived",
        "match_events.minute",
        "90 - opening_goal_minute",
      ),
    );
    if (last !== first) {
      derivations.push(
        derived(
          "derived.minutes_after_last_goal",
          "Minutes of normal time played after the last goal",
          90 - last,
          "derived",
          "match_events.minute",
          "90 - last_goal_minute",
        ),
      );
    }
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
