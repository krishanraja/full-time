// Server-only. The proven Full Time recap engine, ported faithfully from
// _ops/generate.mjs: a DETERMINISTIC fact-pack (score/scorers credited by
// construction) -> Opus writer conditioned on the voice corpus -> a
// deterministic code gate -> a Sonnet contradiction judge -> up to 5 surgical
// regens. Accuracy is guaranteed by construction, not by a prompt instruction.
// This replaces the Lovable gemini "scoreline-only + banned-words regex" path.

export type MatchInfo = {
  homeId: string;
  homeName: string;
  homeShort: string;
  awayName: string;
  awayShort: string;
  leagueName: string;
  homeScore: number;
  awayScore: number;
};
export type EventRow = {
  minute: number | null;
  added_time: number | null;
  type: string;
  team_id: string | null;
  player_name: string | null;
};
export type StatRow = {
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
} | null;
export type CorpusRow = { kind: string; content: string };

export type RecapResult = {
  ok: boolean;
  title: string;
  script: string;
  magic_sentence: string;
  referenced_scorers: string[];
  attempts: number;
  judge: unknown;
};

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractJson(s: string): Record<string, unknown> {
  const t = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{");
  if (a < 0) throw new Error("no json");
  let depth = 0,
    inStr = false,
    esc = false;
  for (let i = a; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(t.slice(a, i + 1));
    }
  }
  throw new Error("unbalanced json");
}

async function llm(
  system: string,
  user: string,
  model: string,
  max: number,
  key: string,
): Promise<Record<string, unknown>> {
  let lastErr: unknown;
  for (let i = 0; i < 5; i++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: max,
        system,
        messages: [
          { role: "user", content: user + (i ? "\n\nRespond with ONLY the JSON object." : "") },
        ],
      }),
    });
    if (!r.ok) {
      const b = await r.text();
      if ([429, 500, 502, 503, 529].includes(r.status) && i < 4) {
        await sleep(2500 * (i + 1));
        continue;
      }
      throw new Error("llm " + r.status + " " + b.slice(0, 140));
    }
    const d = (await r.json()) as { content: Array<{ text: string }> };
    try {
      return extractJson(d.content[0].text);
    } catch (e) {
      lastErr = e;
      await sleep(400);
    }
  }
  throw lastErr || new Error("llm exhausted");
}

export async function generateRecap(
  m: MatchInfo,
  events: EventRow[],
  st: StatRow,
  corpus: CorpusRow[],
): Promise<RecapResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const WRITER_MODEL = process.env.WRITER_MODEL || "claude-opus-4-8";
  const JUDGE_MODEL = process.env.JUDGE_MODEL || "claude-sonnet-4-6";

  const persona = corpus
    .filter((c) => c.kind === "style_rule")
    .map((c) => c.content)
    .join("\n")
    .slice(0, 1300);
  const examples = corpus
    .filter((c) => c.kind === "example")
    .slice(0, 8)
    .map((c) => "- " + c.content)
    .join("\n");

  const WRITER = `You are FULL TIME, a daily football recap read aloud by a calm broadcaster. Calm delivery, sharp writing.

VOICE (persona):
${persona}

EXAMPLE LINES (register only, never copy):
${examples}

THE FACTS: scorer_summary lists exactly how many goals each team scored and who scored them. goal_log gives them in order with the running score. These are the truth.

YOUR JOB: write ONE flowing recap in the Full Time voice. Get the WINNER and the FINAL SCORE exactly right. You do NOT need to mention every goal; name only the decisive or notable ones. Never say a team "scored every goal" or "all the goals" unless scorer_summary shows the other team scored zero. Never credit a goal to the wrong team.

RULES:
1. 105 to 135 words, one continuous piece. Brevity is the product.
2. Open with the result in one clean line. Tell the story that decided it. Land ONE sharp observation. Close with one short forward line.
3. State each fact once. No repetition of a scoreline, scorer, minute, or stat.
4. ONE angle, the most interesting TRUE one. Do not list multiple stats. Vary across matches. Do not default to "xG vs scoreline".
5. NEVER use "draw your own conclusions", "we are not drawing them for you", or "the table does not ask how you felt".
6. An own goal: the named player turned it into his own net; it counts for the OTHER team (scorer_summary already shows the correct team). A penalty: say so.
7. Stats are full-match unless a minute is given. No invented sweeping claims.
8. Calm, dry, identity-safe (mock the game or the situation, never a club, player, or manager). No exclamation marks. No em dashes (periods and commas). No emoji. Numbers as digits.`;

  const goals = events.filter((e) => /goal/.test(e.type) && e.type !== "penalty_miss");
  const tag = (g: EventRow) =>
    g.type === "own_goal" ? " (own goal)" : g.type === "penalty_goal" ? " (penalty)" : "";
  const byTeam: Record<string, string[]> = { [m.homeName]: [], [m.awayName]: [] };
  let h = 0,
    a = 0;
  const goalLog = goals.map((g) => {
    const creditedHome = g.team_id === m.homeId;
    const team = creditedHome ? m.homeName : m.awayName;
    if (creditedHome) h++;
    else a++;
    byTeam[team].push(`${g.player_name} ${g.minute}'${tag(g)}`);
    const ownNote =
      g.type === "own_goal"
        ? ` (${g.player_name} of ${creditedHome ? m.awayName : m.homeName} put it into his own net)`
        : "";
    return `${g.minute}' GOAL for ${team}: ${g.player_name}${tag(g)}${ownNote}. Score now ${m.homeName} ${h}, ${m.awayName} ${a}.`;
  });
  const cards = events.filter((e) => /yellow|red/.test(e.type));
  const reds = cards
    .filter((c) => /red|second/.test(c.type))
    .map((c) => `${c.minute}' ${c.player_name} sent off`);
  const allowed = goals.map((g) => g.player_name).filter(Boolean) as string[];
  const realScore = `${m.homeScore}-${m.awayScore}`;
  const totalGoals = (m.homeScore || 0) + (m.awayScore || 0);
  const winner = m.homeScore > m.awayScore ? m.homeName : m.awayScore > m.homeScore ? m.awayName : null;
  const scorer_summary = {
    [`${m.homeName} (home) scored ${m.homeScore}`]: byTeam[m.homeName].length ? byTeam[m.homeName] : ["none"],
    [`${m.awayName} (away) scored ${m.awayScore}`]: byTeam[m.awayName].length ? byTeam[m.awayName] : ["none"],
  };
  const factPack = {
    competition: m.leagueName,
    winner: winner ? `${winner} won` : "a draw",
    final_score: `${m.homeName} ${m.homeScore}, ${m.awayName} ${m.awayScore}`,
    scorer_summary,
    goal_log: goalLog,
    total_cards: cards.length,
    red_cards: reds,
    "stats (full match)": st
      ? {
          possession: `${m.homeName} ${st.home_possession}%, ${m.awayName} ${st.away_possession}%`,
          shots: `${m.homeName} ${st.home_shots}, ${m.awayName} ${st.away_shots}`,
          on_target: `${m.homeName} ${st.home_sot}, ${m.awayName} ${st.away_sot}`,
          xg: `${m.homeName} ${st.home_xg}, ${m.awayName} ${st.away_xg}`,
          corners: `${m.homeName} ${st.home_corners}, ${m.awayName} ${st.away_corners}`,
        }
      : "no detailed stats",
  };
  const fixedFacts = `${winner ? winner + " won" : "It was a draw"}. ${m.homeName} scored ${m.homeScore} (${byTeam[m.homeName].join(", ") || "none"}). ${m.awayName} scored ${m.awayScore} (${byTeam[m.awayName].join(", ") || "none"}).`;
  const userBase = `FACT PACK:\n${JSON.stringify(factPack, null, 2)}\n\nReturn ONLY this JSON: {"title":"<=6 words, in voice","script":"the 105-135 word recap","magic_sentence":"the single sharpest sentence, verbatim from the script","referenced_scorers":["each scorer you named"],"stated_score":"${realScore}"}`;

  let out: Record<string, unknown> = {};
  let judge: Record<string, unknown> = {};
  let attempt = 0,
    feedback = "",
    pass = false;
  while (!pass && attempt < 5) {
    attempt++;
    out = await llm(WRITER, userBase + feedback, WRITER_MODEL, 900, key);
    const script = String(out.script ?? "");
    const words = script.trim().split(/\s+/).length;
    const minutesUsed: string[] = script.match(/\b(\d{1,2})(st|nd|rd|th)\b/g) || [];
    const scoreCount = (script.match(new RegExp(realScore.replace("-", "\\s*-\\s*"), "g")) || []).length;
    const bothScored = m.homeScore > 0 && m.awayScore > 0;
    const refScorers = (out.referenced_scorers as string[]) || [];
    const cc = {
      score: out.stated_score === realScore,
      goalsConsistent: goals.length === totalGoals,
      scorers: refScorers.every((n) =>
        allowed.some((x) => {
          const A = norm(x),
            Nn = norm(n);
          return A && Nn && (A.includes(Nn) || Nn.includes(A) || A.split(" ").pop() === Nn.split(" ").pop());
        }),
      ),
      length_ok: words >= 90 && words <= 150,
      no_score_repeat: scoreCount <= 1,
      no_minute_repeat: !minutesUsed.some((x, i) => minutesUsed.indexOf(x) !== i),
      no_every_goal: !(
        bothScored &&
        /(scored|netted) (every|all|all six|all five|all four|all three|both) (the )?goals?/i.test(script)
      ),
      noDash: !/[—–]/.test(script),
      noCliche: !/(draw your own conclusions|not drawing them for you|table does not ask)/i.test(script),
    };
    const codePass = Object.values(cc).every(Boolean);
    judge = await llm(
      `You compare a football recap to the CORRECT RESULT. Flag a contradiction ONLY if the recap states the wrong winner, the wrong final score, or attributes a named goal to the wrong team versus the CORRECT RESULT line. Ignore phrasing, observations, vague adjectives, and any goal the recap chooses not to mention. Output ONLY JSON.`,
      `CORRECT RESULT: ${fixedFacts}\nFinal score (home then away): ${realScore}\n\nRECAP:\n"${script}"\n\nJSON only: {"contradictions":[],"coherent":true}`,
      JUDGE_MODEL,
      400,
      key,
    );
    const contradictions = (judge.contradictions as string[]) || [];
    const judgePass = contradictions.length === 0 && judge.coherent !== false;
    pass = codePass && judgePass;
    if (!pass) {
      const cf = Object.entries(cc)
        .filter(([, v]) => !v)
        .map(([k]) => k);
      feedback =
        `\n\nREJECTED, attempt ${attempt}. THE FACTS YOU MUST MATCH: ${fixedFacts}\n` +
        (cf.length
          ? `- Mechanical issues: ${cf.join(", ")}. Final score is ${realScore}. Only these scorers exist: ${allowed.join(", ")}.\n`
          : "") +
        (contradictions.length ? `- FACTUAL ERRORS: ${contradictions.join(" | ")}\n` : "") +
        `Do not enumerate every goal. Get the winner and score right. Return JSON only.`;
    }
  }

  return {
    ok: pass,
    title: String(out.title ?? ""),
    script: String(out.script ?? ""),
    magic_sentence: String(out.magic_sentence ?? ""),
    referenced_scorers: (out.referenced_scorers as string[]) || [],
    attempts: attempt,
    judge,
  };
}
