import { describe, expect, it } from "vitest";
import { clubColours, clubInks, ringColour } from "./club-colours";
import { contrast, lift, oklch } from "./colour";
import { atmosphere } from "./match-atmosphere";
import { sealPlate, sealTrack, sealWeave } from "./match-seal";
import { accentFor, coverArt, PUNDIT_HUES } from "./pundit-cover";
import { PUNDIT_IDS } from "./pundit/types";

const hueDegrees = (hex: string) => (oklch(hex)[2] * 180) / Math.PI;

describe("club colours stay faithful", () => {
  it("lifts lightness without moving hue", () => {
    const claret = "#670E36";
    const lifted = lift(claret, 0.6, 0.8);
    expect(oklch(lifted)[0]).toBeGreaterThanOrEqual(0.59);
    expect(Math.abs(hueDegrees(lifted) - hueDegrees(claret))).toBeLessThan(6);
  });

  it("keeps Villa claret claret and Spurs navy navy in the seal", () => {
    // HSL lightening turned these pink and periwinkle in an earlier concept.
    expect(
      Math.abs(hueDegrees(clubInks("Aston Villa").weave) - hueDegrees("#670E36")),
    ).toBeLessThan(6);
    expect(Math.abs(hueDegrees(clubInks("Tottenham").weave) - hueDegrees("#132257"))).toBeLessThan(
      6,
    );
  });

  it("looks clubs up by the name Full Time shows or the provider's full name", () => {
    expect(clubColours("Manchester City")).toEqual(clubColours("Man City"));
    expect(clubColours("Nottingham Forest")[0]).toBe("#DD0000");
  });

  it("rings a white-primary club in its second colour so the ring shows", () => {
    expect(ringColour("Fulham")).toBe("#000000");
    expect(ringColour("Leeds")).toBe("#1D428A");
    expect(ringColour("Man City")).toBe("#6CABDD");
  });

  it("prints an unknown club in cream rather than failing", () => {
    expect(ringColour("Somewhere United")).toBe("#E6DFD2");
    expect(clubInks("Somewhere United").weave).toBe("#E6DFD2");
  });

  it("gives a real second colour rim rules and a white one a thread", () => {
    expect(clubInks("Aston Villa").rim).not.toBeNull();
    expect(clubInks("Sunderland").rim).toBeNull();
    expect(clubInks("Sunderland").thread).not.toBeNull();
  });
});

describe("AI Pundit covers", () => {
  const match = {
    seed: "18f075fd-3c2b-47d1-b2ed-c1ebda74acd5",
    homeGoals: 5,
    awayGoals: 3,
    homeColours: clubColours("Man City"),
    awayColours: clubColours("Sunderland"),
  };

  it("prints the same cover for the same show, and a new one for a new match", () => {
    for (const pundit of PUNDIT_IDS) {
      expect(coverArt(pundit, match)).toBe(coverArt(pundit, match));
      expect(coverArt(pundit, { ...match, seed: "another-match" })).not.toBe(
        coverArt(pundit, match),
      );
    }
  });

  it("prints each pundit on its own paper, and no two share one", () => {
    const papers = PUNDIT_IDS.map((pundit) => {
      const art = coverArt(pundit, match);
      // The first fill is the paper the rest is printed on.
      return art.match(/fill="(#[0-9A-Fa-f]{6})"/)?.[1];
    });
    expect(papers).toEqual(PUNDIT_IDS.map((pundit) => PUNDIT_HUES[pundit]));
    expect(new Set(papers).size).toBe(PUNDIT_IDS.length);
  });

  it("marks every goal in the scoring club's ink on The Gaffer's board", () => {
    const art = coverArt("gaffer", match);
    const homeInk = accentFor(match.homeColours, PUNDIT_HUES.gaffer);
    const os = art.match(new RegExp(`<circle[^>]*stroke="${homeInk}"`, "g")) ?? [];
    expect(os).toHaveLength(5);
  });

  it("chooses a club ink that separates from the paper", () => {
    for (const pundit of PUNDIT_IDS) {
      const ink = accentFor(clubColours("Tottenham"), PUNDIT_HUES[pundit]);
      expect(contrast(ink, PUNDIT_HUES[pundit])).toBeGreaterThan(1.29);
    }
  });

  it("never builds markup from anything but numbers and fixed colours", () => {
    const hostile = '#ff0000"/><script>alert(1)</script>';
    for (const pundit of PUNDIT_IDS) {
      const art = coverArt(pundit, {
        ...match,
        seed: '"><script>alert(1)</script>',
        homeColours: [hostile, hostile],
        awayColours: ["#fff", hostile],
      });
      expect(art).not.toContain("<script");
      expect(art).not.toContain("alert");
      for (const [, value] of art.matchAll(/(?:fill|stroke)="([^"]*)"/g)) {
        expect(value).toMatch(/^(#[0-9A-F]{6}|none)$/i);
      }
    }
    expect(accentFor([hostile, hostile], PUNDIT_HUES.gaffer)).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe("the match seal", () => {
  const input = {
    seed: "18f075fd-3c2b-47d1-b2ed-c1ebda74acd5",
    homeGoals: 5,
    awayGoals: 3,
    home: clubInks("Man City"),
    away: clubInks("Sunderland"),
  };

  it("draws the same seal for the same match", () => {
    expect(sealWeave(input)).toBe(sealWeave(input));
    expect(sealPlate(input.seed)).toBe(sealPlate(input.seed));
  });

  it("weaves each half in its club's ink", () => {
    const weave = sealWeave(input);
    expect(weave).toContain(`stroke="${input.home.weave}"`);
    expect(weave).toContain(`stroke="${input.away.weave}"`);
  });

  it("changes with the score", () => {
    expect(sealWeave({ ...input, homeGoals: 0, awayGoals: 0 })).not.toBe(sealWeave(input));
  });

  it("marks ninety minutes on the track", () => {
    expect(sealTrack().match(/<line /g)).toHaveLength(91);
  });
});

describe("the matchday atmosphere", () => {
  const input = {
    seed: "18f075fd-3c2b-47d1-b2ed-c1ebda74acd5",
    homeGoals: 5,
    awayGoals: 3,
    home: clubInks("Man City"),
    away: clubInks("Sunderland"),
    width: 412,
    height: 330,
    cx: 206,
    cy: 200,
    radius: 100,
  };

  it("is deterministic and draws nothing before layout", () => {
    expect(atmosphere(input)).toBe(atmosphere(input));
    expect(atmosphere({ ...input, width: 0 })).toBe("");
  });

  it("lights each side in its own club's colour", () => {
    const art = atmosphere(input);
    expect(art).toContain(input.home.glow);
    expect(art).toContain(input.away.glow);
  });
});
