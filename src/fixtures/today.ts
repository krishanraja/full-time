import type {
  PublicFixture,
  PublicMatch,
  PublicToday,
  PublicVariant,
} from "@/lib/api/editorial-public.server";
import type { PunditId } from "@/lib/pundit/types";
import { PERSONALITIES } from "@/components/PersonalitySelector";
import { editionPunditFor } from "@/lib/edition-pundit";

/** Development-only data for `/?fixture=today`: three Premier League matches,
 *  one with all six AI Pundits, two with some of them, so the rail, the
 *  match stepping and the "no show for this match" state can all be seen
 *  without a database. The crest URLs follow the provider's public pattern. */

const crest = (providerTeamId: number) =>
  `https://media.api-sports.io/football/teams/${providerTeamId}.png`;

type FixtureMatch = PublicMatch & {
  fixture: PublicFixture;
  titles: Partial<Record<PunditId, string>>;
};

const MATCHES: FixtureMatch[] = [
  {
    dropId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    coverageDate: "2026-09-20",
    fixture: {
      homeTeam: "Manchester City",
      awayTeam: "Sunderland",
      homeScore: 5,
      awayScore: 3,
      competition: "Premier League",
      homeCrest: crest(50),
      awayCrest: crest(746),
    },
    pundits: ["zen", "gaffer", "stats", "romantic", "doomer", "banter"],
    canonicalPundit: "zen",
    titles: { stats: "The game after the goals" },
  },
  {
    dropId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    coverageDate: "2026-09-19",
    fixture: {
      homeTeam: "Tottenham",
      awayTeam: "Aston Villa",
      homeScore: 2,
      awayScore: 3,
      competition: "Premier League",
      homeCrest: crest(47),
      awayCrest: crest(66),
    },
    pundits: ["gaffer", "romantic"],
    canonicalPundit: "zen",
    titles: {},
  },
  {
    dropId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    coverageDate: "2026-09-14",
    fixture: {
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      homeScore: 1,
      awayScore: 1,
      competition: "Premier League",
      homeCrest: crest(42),
      awayCrest: crest(49),
    },
    pundits: ["zen", "stats", "doomer"],
    canonicalPundit: "zen",
    titles: {},
  },
];

function variant(match: FixtureMatch, pundit: PunditId): PublicVariant {
  const meta = PERSONALITIES.find((item) => item.id === pundit)!;
  const slot = PERSONALITIES.findIndex((item) => item.id === pundit);
  return {
    id: `${match.dropId.slice(0, 24)}00000000000${slot}`,
    drop_id: match.dropId,
    pundit_id: pundit,
    spec_version: 1,
    thesis: { selectedClaimIds: ["77777777-7777-4777-8777-777777777777"] },
    title: match.titles[pundit] ?? "What the score forgot to say",
    description: "Six AI Pundits each made a full show from the same checked facts.",
    display_script: `${meta.name} reads the same match through a different lens.`,
    performance_plan: [],
    audio_url: "__fixture_audio__",
    audio_bytes: null,
    audio_duration_sec: 362,
    share_image_url: null,
    transcript: null,
    published_at: `${match.coverageDate}T06:00:00.000Z`,
  };
}

const PROOF = [
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
];

function summaries(): PublicMatch[] {
  return MATCHES.map(({ titles: _titles, ...match }) => match);
}

function response(match: FixtureMatch, pundit: PunditId, withMatches: boolean): PublicToday {
  return {
    coverageDate: withMatches ? "2026-09-26" : match.coverageDate,
    state: withMatches ? "variant_unavailable" : "published",
    drop: { id: match.dropId },
    variant: withMatches ? null : variant(match, pundit),
    latest: withMatches
      ? { coverageDate: match.coverageDate, variant: variant(match, pundit) }
      : null,
    matchId: "fixture-match",
    teamIds: ["fixture-home", "fixture-away"],
    fixture: match.fixture,
    proofCards: PROOF,
    matches: withMatches ? summaries() : [],
  };
}

/** What `/api/public/drops/today` returns: the newest match, opened on the
 *  listener's pundit when they made a show for it. */
export function todayFixture(pundit: PunditId, dropId?: string): PublicToday {
  const match = MATCHES.find((item) => item.dropId === dropId) ?? MATCHES[0];
  return response(match, editionPunditFor(match, pundit) ?? match.pundits[0], true);
}

/** What `/api/public/drops/:id/variants/:pundit` returns, or null for a 404. */
export function fixtureVariant(dropId: string, pundit: PunditId): PublicToday | null {
  const match = MATCHES.find((item) => item.dropId === dropId);
  if (!match || !match.pundits.includes(pundit)) return null;
  return response(match, pundit, false);
}
