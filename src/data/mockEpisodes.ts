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
};
