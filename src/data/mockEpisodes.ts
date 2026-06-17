// TODO: Replace with API-driven feed (see /api/episodes). Shape is intentionally minimal.

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
};

export type Team = {
  id: string;
  name: string;
  short: string;
  league: string;
  color: string;
};

export const TEAMS: Team[] = [
  { id: "ars", name: "Arsenal", short: "ARS", league: "Premier League", color: "#EF0107" },
  { id: "liv", name: "Liverpool", short: "LIV", league: "Premier League", color: "#C8102E" },
  { id: "bar", name: "Barcelona", short: "BAR", league: "La Liga", color: "#A50044" },
  { id: "sev", name: "Sevilla", short: "SEV", league: "La Liga", color: "#D5071E" },
  { id: "int", name: "Inter", short: "INT", league: "Serie A", color: "#0066B3" },
  { id: "juv", name: "Juventus", short: "JUV", league: "Serie A", color: "#111111" },
  { id: "psg", name: "PSG", short: "PSG", league: "Ligue 1", color: "#004170" },
  { id: "lyo", name: "Lyon", short: "LYO", league: "Ligue 1", color: "#003399" },
  { id: "bay", name: "Bayern", short: "BAY", league: "Bundesliga", color: "#DC052D" },
  { id: "bvb", name: "Dortmund", short: "BVB", league: "Bundesliga", color: "#FDE100" },
];

export const LEAGUES = ["Premier League", "La Liga", "Serie A", "Ligue 1", "Bundesliga"];

export const EPISODES: Episode[] = [
  {
    id: "ars-liv",
    title: "Arsenal steal it late",
    hook: "Ninety-two minutes of grit, then a header out of nowhere. North London exhales.",
    homeTeam: "Arsenal",
    awayTeam: "Liverpool",
    homeScore: 2,
    awayScore: 1,
    competition: "Premier League",
    durationSec: 95,
    badge: "BIGGEST MOMENT",
  },
  {
    id: "bar-sev",
    title: "Barcelona turn the screw",
    hook: "Patient, then ruthless. Three goals inside twenty minutes and Sevilla stopped resisting.",
    homeTeam: "Barcelona",
    awayTeam: "Sevilla",
    homeScore: 3,
    awayScore: 0,
    competition: "La Liga",
    durationSec: 78,
  },
  {
    id: "int-juv",
    title: "Derby d'Italia ends level",
    hook: "Two heavyweights, two punches, no winner. The title race tightens by a millimetre.",
    homeTeam: "Inter",
    awayTeam: "Juventus",
    homeScore: 1,
    awayScore: 1,
    competition: "Serie A",
    durationSec: 88,
    badge: "CLASSIC",
  },
  {
    id: "psg-lyo",
    title: "PSG outscore Lyon in a thriller",
    hook: "Six goals, two red cards' worth of tension, and Paris just had more in the tank.",
    homeTeam: "PSG",
    awayTeam: "Lyon",
    homeScore: 4,
    awayScore: 2,
    competition: "Ligue 1",
    durationSec: 102,
    badge: "LATE DRAMA",
  },
  {
    id: "bay-bvb",
    title: "Der Klassiker becomes a demolition",
    hook: "Bayern were rude. Dortmund were tourists. Five-one barely tells the story.",
    homeTeam: "Bayern",
    awayTeam: "Dortmund",
    homeScore: 5,
    awayScore: 1,
    competition: "Bundesliga",
    durationSec: 110,
    badge: "DEMOLITION",
  },
];

export const TONIGHT: { id: string; label: string; kickoff: string }[] = [
  { id: "t1", label: "Real Madrid vs Atlético", kickoff: "21:00" },
  { id: "t2", label: "Chelsea vs Man City", kickoff: "21:00" },
  { id: "t3", label: "Napoli vs Roma", kickoff: "20:45" },
];
