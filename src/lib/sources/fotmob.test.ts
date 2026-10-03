import { describe, expect, it } from "vitest";
import {
  findFixtureId,
  fotmobAdapter,
  pairValue,
  parseMatchDetails,
  sameClub,
} from "./fotmob.server";

/** The shape below was read off the live endpoints on 2026-09-21 and then
 *  written out by hand rather than captured, so the repository carries a
 *  structural fixture and not a copy of somebody's payload. */
const statGroups = [
  {
    stats: [
      { title: "Ball possession", key: "BallPossesion", stats: [46, 54], type: "graph" },
      { title: "Expected goals (xG)", key: "expected_goals", stats: ["0.79", "1.65"] },
      { title: "Total shots", key: "total_shots", stats: [9, 12] },
    ],
  },
  {
    // The same key appears twice: once as the group heading with a null pair,
    // and again as the value beneath it.
    stats: [
      { title: "Expected goals (xG)", key: "expected_goals", stats: [null, null], type: "title" },
      { title: "Expected goals (xG)", key: "expected_goals", stats: ["0.79", "1.65"] },
      { title: "xG open play", key: "expected_goals_open_play", stats: ["0.72", "1.52"] },
    ],
  },
  {
    stats: [
      { title: "Accurate passes", key: "accurate_passes", stats: ["298 (78%)", "386 (82%)"] },
      { title: "Tackles", key: "matchstats.headers.tackles", stats: [17, 16] },
    ],
  },
];

const details = {
  general: {
    homeTeam: { name: "AFC Bournemouth", id: 8678 },
    awayTeam: { name: "Liverpool", id: 8650 },
    matchTimeUTCDate: "2026-09-20T13:00:00.000Z",
  },
  content: { stats: { Periods: { All: { stats: statGroups } } } },
};

describe("reading a value out of a stats group", () => {
  it("reads a decimal that arrives as a string", () => {
    expect(pairValue(statGroups, "expected_goals")).toEqual([0.79, 1.65]);
  });

  it("reads a count that arrives as a number", () => {
    expect(pairValue(statGroups, "total_shots")).toEqual([9, 12]);
  });

  /** A title row carries [null, null] and must not end the search, or every
   *  statistic that has its own group reads as absent. */
  it("walks past a heading row that shares the key", () => {
    expect(pairValue(statGroups, "expected_goals_open_play")).toEqual([0.72, 1.52]);
  });

  /** "298 (78%)" is a count and a percentage in one string. Guessing which one
   *  was meant is how a pundit ends up saying a number nobody reported. */
  it("refuses a compound value rather than guessing at it", () => {
    expect(pairValue(statGroups, "accurate_passes")).toEqual([null, null]);
  });

  it("returns nothing for a key the source did not send", () => {
    expect(pairValue(statGroups, "expected_goals_on_target")).toEqual([null, null]);
  });
});

describe("matching their name for a club to ours", () => {
  it("matches a club whose name is written longer or shorter", () => {
    expect(sameClub("AFC Bournemouth", "Bournemouth")).toBe(true);
    expect(sameClub("Man United", "Manchester United")).toBe(true);
    expect(sameClub("Brighton & Hove Albion", "Brighton and Hove Albion")).toBe(true);
  });

  it("does not match two different clubs", () => {
    expect(sameClub("Liverpool", "Everton")).toBe(false);
    expect(sameClub("", "Liverpool")).toBe(false);
  });

  /** The case that decides whether the prefix rule is safe. If "Man" matching
   *  "Manchester" were enough on its own, one club's numbers would land on
   *  another club's match. */
  it("does not match Man City to Manchester United", () => {
    expect(sameClub("Man City", "Manchester United")).toBe(false);
    expect(sameClub("Manchester City", "Manchester United")).toBe(false);
    expect(sameClub("West Ham United", "Newcastle United")).toBe(false);
  });
});

describe("parsing one match", () => {
  it("returns both models' numbers with the model named", () => {
    const parsed = parseMatchDetails(details);
    expect(parsed).toMatchObject({
      sourceId: "fotmob",
      model: "FotMob expected goals",
      homeTeam: "AFC Bournemouth",
      awayTeam: "Liverpool",
      homeXg: 0.79,
      awayXg: 1.65,
      homeXgOpenPlay: 0.72,
    });
  });

  it("returns nothing when the payload does not name both clubs", () => {
    expect(parseMatchDetails({ general: {}, content: {} })).toBeNull();
  });

  it("returns the match with null figures when the source sent no expected goals", () => {
    const parsed = parseMatchDetails({ ...details, content: { stats: { Periods: { All: {} } } } });
    expect(parsed?.homeXg).toBeNull();
    expect(parsed?.homeTeam).toBe("AFC Bournemouth");
  });

  it("finds the fixture by the two clubs", () => {
    const day = {
      leagues: [
        {
          matches: [
            { id: 1, home: { longName: "Everton" }, away: { longName: "Fulham" } },
            { id: 5795455, home: { longName: "AFC Bournemouth" }, away: { longName: "Liverpool" } },
          ],
        },
      ],
    };
    expect(findFixtureId(day, "Bournemouth", "Liverpool")).toBe(5795455);
    expect(findFixtureId(day, "Arsenal", "Liverpool")).toBeNull();
  });

  /** A day's payload holds a hundred and fifty leagues, and the same two clubs
   *  can meet in a league game and a cup tie. Two candidates is not a near
   *  miss, it is a coin toss between two different results. */
  it("yields nothing when the day holds two matches between the same clubs", () => {
    const day = {
      leagues: [
        {
          matches: [
            { id: 11, home: { longName: "Liverpool" }, away: { longName: "Everton" } },
            { id: 22, home: { longName: "Liverpool" }, away: { longName: "Everton" } },
          ],
        },
      ],
    };
    expect(findFixtureId(day, "Liverpool", "Everton")).toBeNull();
  });
});

/** None of this is load-bearing enough to stop a show being made. Every way it
 *  can fail has to end in null, not in an exception. */
describe("a source that must never throw", () => {
  const adapter = (impl: typeof fetch) => fotmobAdapter(impl);
  const ask = { homeTeam: "Bournemouth", awayTeam: "Liverpool", date: "2026-09-20" };

  it("returns nothing when the request fails outright", async () => {
    const thrower = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(adapter(thrower).fetchMatchStats(ask)).resolves.toBeNull();
  });

  /** Two of their endpoints answer 200 with an HTML application shell. A
   *  reader that trusts the status code hands a page of markup to JSON.parse. */
  it("returns nothing when a 200 carries the HTML application shell", async () => {
    const shell = (async () =>
      new Response("<!DOCTYPE html><html><head>", { status: 200 })) as unknown as typeof fetch;
    await expect(adapter(shell).fetchMatchStats(ask)).resolves.toBeNull();
  });

  it("returns nothing when the fixture is not in that day's list", async () => {
    const empty = (async () =>
      new Response(JSON.stringify({ leagues: [] }), { status: 200 })) as unknown as typeof fetch;
    await expect(adapter(empty).fetchMatchStats(ask)).resolves.toBeNull();
  });

  it("returns nothing on a rate limit", async () => {
    const limited = (async () => new Response("", { status: 429 })) as unknown as typeof fetch;
    await expect(adapter(limited).fetchMatchStats(ask)).resolves.toBeNull();
  });

  it("walks the two calls and returns the parsed match", async () => {
    const calls: string[] = [];
    const impl = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      const body = String(url).includes("matchDetails")
        ? details
        : {
            leagues: [
              {
                matches: [
                  {
                    id: 5795455,
                    home: { longName: "AFC Bournemouth" },
                    away: { longName: "Liverpool" },
                  },
                ],
              },
            ],
          };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await adapter(impl).fetchMatchStats(ask);
    expect(result?.homeXg).toBe(0.79);
    expect(calls[0]).toContain("matches?date=20260920");
    expect(calls[1]).toContain("matchDetails?matchId=5795455");
  });
});

/** Twelve matches a day share one fixture list. Re-reading it twelve times
 *  is the behaviour that gets a caller refused by a source with every reason
 *  to refuse. */
describe("asking for a day only once", () => {
  it("reuses the fixture list across matches on the same date", async () => {
    const calls: string[] = [];
    const impl = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      const body = String(url).includes("matchDetails")
        ? details
        : {
            leagues: [
              {
                matches: [
                  {
                    id: 5795455,
                    home: { longName: "AFC Bournemouth" },
                    away: { longName: "Liverpool" },
                  },
                  { id: 99, home: { longName: "Everton" }, away: { longName: "Fulham" } },
                ],
              },
            ],
          };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;

    const adapter = fotmobAdapter(impl);
    await adapter.fetchMatchStats({
      homeTeam: "Bournemouth",
      awayTeam: "Liverpool",
      date: "2026-09-20",
    });
    await adapter.fetchMatchStats({
      homeTeam: "Everton",
      awayTeam: "Fulham",
      date: "2026-09-20",
    });

    expect(calls.filter((url) => url.includes("matches?date=")).length).toBe(1);
    expect(calls.filter((url) => url.includes("matchDetails")).length).toBe(2);
  });
});

describe("the rights posture this source ships with", () => {
  /** docs/11-legal.md requires a recorded basis, and a row claiming permission
   *  nobody granted would be a fabricated audit record. The audit trail is the
   *  whole basis of this product's editorial claim. */
  it("says plainly that nobody granted permission", () => {
    expect(fotmobAdapter().rights.basis).toBe("unlicensed");
    expect(fotmobAdapter().rights.restriction).toMatch(/no permission was sought or granted/i);
    expect(fotmobAdapter().rights.attribution).toBe("FotMob");
  });
});
