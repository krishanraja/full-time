import type { PunditId } from "@/lib/pundit/types";

// Episode type used across UI components. Sourced from Lovable Cloud
// at runtime via @/lib/api/feed.functions.ts; this file just keeps the
// shape stable for the player and card components.

export type Episode = {
  id: string;
  title: string;
  hook: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  durationSec: number;
  badge?: "BIGGEST MOMENT" | "LATE DRAMA" | "DEMOLITION" | "CLASSIC";
  audioUrl?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  leagueId?: string | null;
  format?: "match" | "daily";
  punditName?: string;
  script?: string;
  /** "Man City 5-3 Sunderland" for an AI Pundit edition, so every player
   *  surface can say which match it is. Absent when the pack carried no
   *  fixture. */
  matchLabel?: string;
  /** The AI Pundit and drop that made this edition, so the mini player can
   *  print the same cover as Today. */
  punditId?: PunditId;
  coverSeed?: string;
};
