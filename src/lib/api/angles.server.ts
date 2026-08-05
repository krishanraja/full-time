// Server-only. THE ANGLE ENGINE.
//
// This is the whole of Full Time's "colour" tier, and it is deliberately boring
// code: pure functions over data that is already in Postgres, each with a fixed
// threshold and a fixed English template.
//
// TWO ABSOLUTE RULES, from the implementation plan. Do not relax either in review.
//
//   RULE 1. Every enriched fact reaches the writer as a PRE-COMPUTED, COMPLETE
//   ENGLISH CLAUSE, never as a number to interpret. Code does the arithmetic,
//   the comparison, the threshold test and the attribution. Handing the model
//   {shots: 15, sot: 2} and letting it conclude "wasteful" is an inference, and
//   inference is where invention lives. The writer's only freedom is whether to
//   use a clause and how to phrase it.
//
//   RULE 2. Enrichment is ALWAYS OPTIONAL AND NEVER FATAL. If stats are
//   missing, if h2h is empty, if the keeper is unknown, the angle is simply
//   absent. Absence is the normal case. A colour feature must never take down
//   the core product.
//
// `numbers` is not hand-written: it is parsed back out of the rendered clause,
// so the numeric licence the gate enforces cannot drift from the text the
// writer actually saw. That is the invariant the whole licence system rests on.

export type AngleEventRow = {
  minute: number | null;
  added_time: number | null;
  type: string;
  team_id: string | null;
  player_id: string | null;
  player_name: string | null;
  assist_player_id: string | null;
  detail: string | null;
};

export type AngleStatRow = {
  home_possession: number | null;
  away_possession: number | null;
  home_shots: number | null;
  away_shots: number | null;
  home_sot: number | null;
  away_sot: number | null;
  home_xg: number | null;
  away_xg: number | null;
  home_corners: number | null;
  away_corners: number | null;
  home_blocked: number | null;
  away_blocked: number | null;
  home_saves: number | null;
  away_saves: number | null;
  home_fouls: number | null;
  away_fouls: number | null;
  home_offsides: number | null;
  away_offsides: number | null;
} | null;

export type MatchContext = {
  matchday: number | null;
  home_gk_name: string | null;
  away_gk_name: string | null;
  home_gk_subbed: boolean;
  away_gk_subbed: boolean;
  feeds_agree: boolean | null;
} | null;

export type H2HMeeting = {
  date: string;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
};

export type AngleMatch = {
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  leagueName: string;
  homeScore: number;
  awayScore: number;
};

export type Angle = {
  id: string; // stable class id, declared back by the writer
  clause: string; // complete English fact, ready to phrase
  numbers: number[]; // every number in clause, feeds the numeric licence
  teams: string[]; // teams this angle attributes facts to, feeds the judge
  score: number; // deterministic priority
};

// ---------------------------------------------------------------- helpers

/** Every number the rendered clause actually contains. Parsed, never declared,
 *  so `numbers` cannot drift from the text. */
function numbersIn(clause: string): number[] {
  return [...clause.matchAll(/\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));
}

function ordinal(n: number): string {
  const r100 = n % 100;
  if (r100 >= 11 && r100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** A goal that counts for the scoring player's own tally. An own goal counts
 *  for the OTHER team and must never be added to a player's total. */
const isGoal = (e: AngleEventRow) => e.type === "goal" || e.type === "penalty_goal";
/** Any event that changed the scoreline, own goals included. */
const isScoring = (e: AngleEventRow) => isGoal(e) || e.type === "own_goal";

/** The (loserGoals + 1)-th goal by the winning team: the one that took them to
 *  a lead they never surrendered. Null on a draw. */
function winningGoal(scoring: AngleEventRow[], m: AngleMatch): AngleEventRow | null {
  if (m.homeScore === m.awayScore) return null;
  const winnerIsHome = m.homeScore > m.awayScore;
  const loserGoals = winnerIsHome ? m.awayScore : m.homeScore;
  const winnerGoals = scoring.filter((g) => (g.team_id === m.homeId) === winnerIsHome);
  return winnerGoals[loserGoals] ?? null;
}

/** Running score after each scoring event, in match order. */
function runningScore(scoring: AngleEventRow[], m: AngleMatch) {
  let h = 0;
  let a = 0;
  return scoring.map((e) => {
    if (e.team_id === m.homeId) h++;
    else a++;
    return { e, h, a };
  });
}

const byMinute = (a: AngleEventRow, b: AngleEventRow) =>
  (a.minute ?? 0) - (b.minute ?? 0) || (a.added_time ?? 0) - (b.added_time ?? 0);

function mk(id: string, clause: string, teams: string[], score: number): Angle {
  const c = clause.replace(/\s+/g, " ").trim();
  return { id, clause: c, numbers: numbersIn(c), teams: teams.filter(Boolean), score };
}

// ------------------------------------------------------- TIER A: zero calls
// Pure functions over match_events, which the pipeline already loads.

export function tierA(m: AngleMatch, events: AngleEventRow[]): Angle[] {
  const out: Angle[] = [];
  const sorted = [...events].sort(byMinute);
  const scoring = sorted.filter(isScoring);
  const draw = m.homeScore === m.awayScore;
  const winnerIsHome = m.homeScore > m.awayScore;
  const winnerName = draw ? null : winnerIsHome ? m.homeName : m.awayName;
  const loserName = draw ? null : winnerIsHome ? m.awayName : m.homeName;
  const teamNameOf = (teamId: string | null) => (teamId === m.homeId ? m.homeName : m.awayName);
  const run = runningScore(scoring, m);

  // COMEBACK: the eventual winner trailed at some point. Report the deepest
  // deficit, which is the version of the story a listener would recognise.
  if (!draw && winnerName) {
    let worst: { opp: number; win: number; min: number } | null = null;
    for (const { e, h, a } of run) {
      const win = winnerIsHome ? h : a;
      const opp = winnerIsHome ? a : h;
      const deficit = opp - win;
      if (deficit > 0 && (!worst || deficit > worst.opp - worst.win)) {
        worst = { opp, win, min: e.minute ?? 0 };
      }
    }
    if (worst && worst.min > 0) {
      out.push(
        mk(
          "COMEBACK",
          `${winnerName} were ${worst.opp}-${worst.win} down after ${worst.min} minutes and won.`,
          [winnerName],
          70 + (worst.opp - worst.win) * 5,
        ),
      );
    }
  }

  // LATE_WINNER
  const wg = winningGoal(scoring, m);
  if (wg && (wg.minute ?? 0) >= 85) {
    out.push(
      mk(
        "LATE_WINNER",
        `The winning goal came in the ${ordinal(wg.minute!)} minute.`,
        [winnerName ?? ""],
        65,
      ),
    );
  }

  // HATTRICK / BRACE. Own goals never count toward a player's tally.
  const tally = new Map<string, { name: string; teamId: string | null; n: number }>();
  for (const e of sorted.filter(isGoal)) {
    if (!e.player_id || !e.player_name) continue;
    const t = tally.get(e.player_id) ?? { name: e.player_name, teamId: e.team_id, n: 0 };
    t.n++;
    tally.set(e.player_id, t);
  }
  const totalGoals = m.homeScore + m.awayScore;
  for (const t of tally.values()) {
    const teamGoals = t.teamId === m.homeId ? m.homeScore : m.awayScore;
    if (t.n >= 3) {
      out.push(mk("HATTRICK", `${t.name} scored ${t.n}.`, [teamNameOf(t.teamId)], 95 + t.n));
    } else if (t.n === 2 && totalGoals <= 4 && teamGoals === 2) {
      // "both of X's goals" is only true when the team scored exactly two.
      // The plan's trigger alone would let this fire on a 3-goal team and
      // state a falsehood, so the team total is checked as well.
      out.push(
        mk(
          "BRACE",
          `${t.name} scored both of ${teamNameOf(t.teamId)}'s goals.`,
          [teamNameOf(t.teamId)],
          60,
        ),
      );
    }
  }

  // RED_CARD. "the last N minutes" is always true because stoppage time only
  // makes it longer. Never fold added_time into that number, and never say
  // "the final N minutes".
  const sendOff = sorted.find((e) => e.type === "red" || e.type === "second_yellow");
  if (sendOff && sendOff.minute != null && sendOff.player_name) {
    const min = sendOff.minute;
    const remaining = Math.max(0, 90 - min);
    const team = teamNameOf(sendOff.team_id);
    const at = run.filter((r) => (r.e.minute ?? 0) <= min).pop();
    const h = at?.h ?? 0;
    const a = at?.a ?? 0;
    if (remaining > 0) {
      out.push(
        mk(
          "RED_CARD",
          `${sendOff.player_name} was sent off for ${team} in the ${ordinal(min)} minute. ` +
            `${team} played the last ${remaining} minutes with 10 men, at ${h}-${a}.`,
          [team],
          75,
        ),
      );
    }
  }

  // SUB_IMPACT. Post-normalisation player_id on a `sub` row is the ENTRANT and
  // assist_player_id is the man WITHDRAWN. RISK 2 in the plan: if a future
  // session inverts the ingest back, this angle starts naming the wrong man in
  // narrated audio, so the guard is an assertion here and not only a comment.
  const subs = sorted.filter((e) => e.type === "sub");
  for (const g of sorted.filter(isGoal)) {
    if (!g.player_id) continue;
    const sub = subs.find(
      (s) =>
        s.team_id === g.team_id &&
        s.player_id === g.player_id &&
        (s.minute ?? 0) <= (g.minute ?? 0),
    );
    if (!sub) continue;
    if (sub.assist_player_id === g.player_id) continue; // inverted ingest: refuse to emit
    if (sub.minute == null || g.minute == null) continue;
    out.push(
      mk(
        "SUB_IMPACT",
        `${g.player_name} came on in the ${ordinal(sub.minute)} minute and scored in the ${ordinal(g.minute)}.`,
        [teamNameOf(g.team_id)],
        85,
      ),
    );
    break; // one is a story, three is a list
  }

  // GOAL_BURST: 3 or more goals inside any 10 minute window.
  const mins = scoring.map((e) => e.minute).filter((x): x is number => x != null);
  let best: { n: number; first: number; last: number } | null = null;
  for (let i = 0; i < mins.length; i++) {
    let j = i;
    while (j + 1 < mins.length && mins[j + 1] - mins[i] <= 10) j++;
    const n = j - i + 1;
    if (n >= 3 && (!best || n > best.n)) best = { n, first: mins[i], last: mins[j] };
  }
  if (best && best.last > best.first) {
    out.push(
      mk(
        "GOAL_BURST",
        `${best.n} goals arrived between the ${ordinal(best.first)} and ${ordinal(best.last)} minutes.`,
        [],
        68,
      ),
    );
  }

  // OWN_GOAL_DECIDER
  if (wg && wg.type === "own_goal" && wg.player_name) {
    out.push(
      mk(
        "OWN_GOAL_DECIDER",
        `The goal that decided it was ${wg.player_name} turning it into his own net.`,
        [loserName ?? ""],
        80,
      ),
    );
  }

  return out;
}

// ------------------------------------- TIER B: statistics + lineups (ingested)

export function tierB(
  m: AngleMatch,
  events: AngleEventRow[],
  st: AngleStatRow,
  ctx: MatchContext,
): Angle[] {
  const out: Angle[] = [];
  if (!st) return out; // RULE 2: absent stats means absent angles, never a failure

  const sides = [
    {
      name: m.homeName,
      shots: st.home_shots,
      sot: st.home_sot,
      blocked: st.home_blocked,
      saves: st.home_saves,
      goals: m.homeScore,
      gk: ctx?.home_gk_name ?? null,
      gkSubbed: ctx?.home_gk_subbed ?? true,
    },
    {
      name: m.awayName,
      shots: st.away_shots,
      sot: st.away_sot,
      blocked: st.away_blocked,
      saves: st.away_saves,
      goals: m.awayScore,
      gk: ctx?.away_gk_name ?? null,
      gkSubbed: ctx?.away_gk_subbed ?? true,
    },
  ];

  for (const s of sides) {
    // PROFLIGATE
    if (s.shots != null && s.sot != null && s.shots >= 12 && s.sot <= 3) {
      let clause = `${s.name} had ${s.shots} shots and ${s.sot} on target. ${s.shots - s.sot} never tested the goalkeeper.`;
      if (s.blocked != null && s.blocked >= 5) clause += ` ${s.blocked} of them were blocked.`;
      out.push(mk("PROFLIGATE", clause, [s.name], 72 + (s.shots - s.sot)));
    }
    // CLINICAL
    if (s.sot != null && s.goals >= 3 && s.sot <= s.goals + 1) {
      out.push(
        mk("CLINICAL", `${s.name} scored ${s.goals} from ${s.sot} shots on target.`, [s.name], 78),
      );
    }
    // KEEPER. The guard is load-bearing: if the starting keeper was withdrawn
    // the save count belongs to two men and naming one of them is a lie.
    if (s.saves != null && s.saves >= 7 && s.gk && !s.gkSubbed) {
      out.push(
        mk("KEEPER", `${s.gk} made ${s.saves} saves for ${s.name}.`, [s.name], 74 + s.saves),
      );
    }
  }

  // SIEGE: the losing side massively out-shot the winner.
  if (m.homeScore !== m.awayScore && st.home_shots != null && st.away_shots != null) {
    const winnerIsHome = m.homeScore > m.awayScore;
    const winnerShots = winnerIsHome ? st.home_shots : st.away_shots;
    const loserShots = winnerIsHome ? st.away_shots : st.home_shots;
    const winnerName = winnerIsHome ? m.homeName : m.awayName;
    const loserName = winnerIsHome ? m.awayName : m.homeName;
    if (loserShots - winnerShots >= 8) {
      out.push(
        mk(
          "SIEGE",
          `${loserName} had ${loserShots} shots to ${winnerName}'s ${winnerShots} and lost.`,
          [loserName, winnerName],
          76 + (loserShots - winnerShots),
        ),
      );
    }
  }

  return out;
}

// ------------------------------------------------- TIER D: head to head cache
// The only history-bearing class that can fire on matchday 1, when there is no
// table, no form and no season data. Below 4 meetings it is coincidence, not a
// story, so nothing is emitted.

export function tierD(m: AngleMatch, meetings: H2HMeeting[]): Angle[] {
  const out: Angle[] = [];
  if (!meetings?.length) return out;

  // Already filtered to FT, same league, excluding this fixture, most recent
  // first, at ingest. Re-sort defensively: this is cheap and a wrong order
  // produces a confidently false streak.
  const sorted = [...meetings]
    .filter((x) => x.home_goals != null && x.away_goals != null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (!sorted.length) return out;

  const resultFor = (teamId: string, x: H2HMeeting): "W" | "D" | "L" => {
    const hg = x.home_goals!;
    const ag = x.away_goals!;
    if (hg === ag) return "D";
    const homeWon = hg > ag;
    const isHome = x.home_id === teamId;
    return homeWon === isHome ? "W" : "L";
  };

  const draw = m.homeScore === m.awayScore;

  if (!draw) {
    const winnerIsHome = m.homeScore > m.awayScore;
    const winnerId = winnerIsHome ? m.homeId : m.awayId;
    const winnerName = winnerIsHome ? m.homeName : m.awayName;
    const loserName = winnerIsHome ? m.awayName : m.homeName;

    // H2H_DROUGHT: consecutive most-recent meetings the winner did not win.
    let noWin = 0;
    for (const x of sorted) {
      if (resultFor(winnerId, x) === "W") break;
      noWin++;
    }
    if (noWin >= 4) {
      out.push(
        mk(
          "H2H_DROUGHT",
          `${winnerName} had not beaten ${loserName} in their last ${noWin} league meetings.`,
          [winnerName, loserName],
          88 + noWin,
        ),
      );
    }

    // H2H_DOMINANCE: consecutive most-recent wins, this one making n+1.
    let wins = 0;
    for (const x of sorted) {
      if (resultFor(winnerId, x) !== "W") break;
      wins++;
    }
    if (wins >= 4) {
      out.push(
        mk(
          "H2H_DOMINANCE",
          `That is ${wins + 1} straight league wins for ${winnerName} over ${loserName}.`,
          [winnerName, loserName],
          84 + wins,
        ),
      );
    }
  } else {
    // H2H_STALEMATE: the last n >= 3 meetings were draws, and so was this one.
    let draws = 0;
    for (const x of sorted) {
      if (x.home_goals !== x.away_goals) break;
      draws++;
    }
    if (draws >= 3) {
      out.push(
        mk(
          "H2H_STALEMATE",
          `${draws + 1} of the last ${draws + 1} league meetings between these two have finished level.`,
          [m.homeName, m.awayName],
          82 + draws,
        ),
      );
    }
  }

  return out;
}

// ------------------------------------------------------- T8: selection
// Writer rule 4 already demands variety across matches. This makes it
// mechanical rather than aspirational.

export type RecentAngle = { angle_id: string; days_ago: number };

export function selectAngles(all: Angle[], recent: RecentAngle[] = [], limit = 4): Angle[] {
  const penalty = (id: string) => {
    const hits = recent.filter((r) => r.angle_id === id);
    if (hits.some((r) => r.days_ago <= 3)) return 25;
    if (hits.some((r) => r.days_ago <= 14)) return 10;
    return 0;
  };
  // Deduplicate by class, keeping the strongest instance of each.
  const bestOf = new Map<string, Angle>();
  for (const a of all) {
    const prev = bestOf.get(a.id);
    if (!prev || a.score > prev.score) bestOf.set(a.id, a);
  }
  return [...bestOf.values()]
    .map((a) => ({ ...a, score: a.score - penalty(a.id) }))
    .sort((x, y) => y.score - x.score || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    .slice(0, limit);
}

/** Everything, ranked. The single entry point the pipeline calls. */
export function buildAngles(
  m: AngleMatch,
  events: AngleEventRow[],
  st: AngleStatRow,
  ctx: MatchContext,
  meetings: H2HMeeting[],
  recent: RecentAngle[] = [],
): Angle[] {
  // RULE 2: a throw anywhere in here must never take down the recap.
  const safe = <T>(fn: () => T[], label: string): T[] => {
    try {
      return fn();
    } catch (e) {
      console.warn(`[angles] ${label} failed, continuing without it:`, e);
      return [];
    }
  };
  const all = [
    ...safe(() => tierA(m, events), "tierA"),
    ...safe(() => tierB(m, events, st, ctx), "tierB"),
    ...safe(() => tierD(m, meetings), "tierD"),
  ];
  return selectAngles(all, recent);
}

/** Scene-setting strings that make no claim beyond the fixture itself. Safe by
 *  construction: nothing here is a proposition that could be false. */
export function buildContextStrings(m: AngleMatch, ctx: MatchContext): string[] {
  const out = [`${m.homeName} are at home.`];
  if (ctx?.matchday != null && ctx.matchday > 0) out.push(`This was matchday ${ctx.matchday}.`);
  return out.slice(0, 3);
}
