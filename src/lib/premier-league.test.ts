import { describe, expect, it } from "vitest";
import {
  PREMIER_LEAGUE_ID,
  clubDisplayName,
  crestUrl,
  currentSeasonClubs,
  isPremierLeague,
} from "./premier-league";

describe("isPremierLeague", () => {
  it("accepts only the stored Premier League id", () => {
    expect(isPremierLeague(PREMIER_LEAGUE_ID)).toBe(true);
    // The first migration seeded 'epl'; nothing live references it.
    expect(isPremierLeague("epl")).toBe(false);
    expect(isPremierLeague("af_140")).toBe(false);
    expect(isPremierLeague(null)).toBe(false);
  });
});

describe("clubDisplayName", () => {
  it("shortens the names fans shorten and leaves the rest alone", () => {
    expect(clubDisplayName("Manchester City")).toBe("Man City");
    expect(clubDisplayName("Manchester United")).toBe("Man Utd");
    expect(clubDisplayName("Nottingham Forest")).toBe("Nott'm Forest");
    expect(clubDisplayName("Sunderland")).toBe("Sunderland");
    expect(clubDisplayName(" Aston Villa ")).toBe("Aston Villa");
  });
});

describe("currentSeasonClubs", () => {
  // Live shape on 2026-09-27: 25 clubs carry the league id, 20 play in the
  // current season. Wolves is team af_39, the same string as the league id.
  const teams = [
    { id: "af_50", name: "Manchester City" },
    { id: "af_746", name: "Sunderland" },
    { id: "af_42", name: "Arsenal" },
    { id: "af_39", name: "Wolves" },
    { id: "af_48", name: "West Ham" },
  ];
  const seasonMatches = [
    { home_team_id: "af_50", away_team_id: "af_746" },
    { home_team_id: "af_42", away_team_id: "af_50" },
  ];

  it("keeps only clubs that play in the current season", () => {
    const clubs = currentSeasonClubs(teams, seasonMatches).map((club) => club.id);
    expect(clubs).toEqual(["af_42", "af_50", "af_746"]);
    expect(clubs).not.toContain("af_39");
    expect(clubs).not.toContain("af_48");
  });

  it("sorts by the name a listener sees", () => {
    const names = currentSeasonClubs(teams, seasonMatches).map((club) =>
      clubDisplayName(club.name),
    );
    expect(names).toEqual(["Arsenal", "Man City", "Sunderland"]);
  });

  it("returns nothing when no season has been stored", () => {
    expect(currentSeasonClubs(teams, [])).toEqual([]);
  });
});

describe("crestUrl", () => {
  it("passes the provider's https imagery through", () => {
    expect(crestUrl("https://media.api-sports.io/football/teams/50.png")).toBe(
      "https://media.api-sports.io/football/teams/50.png",
    );
  });

  it("refuses anything that is not an https URL", () => {
    expect(crestUrl("http://media.api-sports.io/football/teams/50.png")).toBeNull();
    expect(crestUrl("javascript:alert(1)")).toBeNull();
    expect(crestUrl("not a url")).toBeNull();
    expect(crestUrl(null)).toBeNull();
    expect(crestUrl("")).toBeNull();
  });
});
