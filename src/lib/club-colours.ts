import { isNeutral, lift, oklch } from "./colour";
import { clubDisplayName } from "./premier-league";

/** Each club's primary and secondary colour, by the short name Full Time shows.
 *
 *  Ruling (Krish, 2026-10-02): adopt the premium design, in which each match
 *  takes its two clubs' colours: the seal around the score, the floodlight on
 *  each side, the ring around each crest and the goal marks in every AI
 *  Pundit cover. `teams.color` is never written by the ingest (it is
 *  '#888888' for every row), so the colours live here. They are public
 *  facts about the clubs, not marks. */
export const CLUB_COLOURS: Record<string, readonly [string, string]> = {
  Arsenal: ["#EF0107", "#FFFFFF"],
  "Aston Villa": ["#670E36", "#95BFE5"],
  Bournemouth: ["#DA291C", "#000000"],
  Brentford: ["#E30613", "#FFFFFF"],
  Brighton: ["#0057B8", "#FFFFFF"],
  Burnley: ["#6C1D45", "#99D6EA"],
  Chelsea: ["#034694", "#FFFFFF"],
  Coventry: ["#59B7E6", "#FFFFFF"],
  "Crystal Palace": ["#1B458F", "#C4122E"],
  Everton: ["#003399", "#FFFFFF"],
  Fulham: ["#FFFFFF", "#000000"],
  "Hull City": ["#F5A12D", "#000000"],
  Ipswich: ["#0044A9", "#FFFFFF"],
  Leeds: ["#FFFFFF", "#1D428A"],
  Leicester: ["#003090", "#FDBE11"],
  Liverpool: ["#C8102E", "#00B2A9"],
  "Man City": ["#6CABDD", "#1C2C5B"],
  "Man Utd": ["#DA291C", "#FBE122"],
  Newcastle: ["#241F20", "#FFFFFF"],
  "Nott'm Forest": ["#DD0000", "#FFFFFF"],
  "Sheffield Utd": ["#EE2737", "#FFFFFF"],
  Southampton: ["#D71920", "#FFFFFF"],
  Sunderland: ["#EB172B", "#FFFFFF"],
  Tottenham: ["#132257", "#FFFFFF"],
  "West Ham": ["#7A263A", "#1BB1E7"],
  Wolves: ["#FDB913", "#231F20"],
};

/** A club Full Time has no colours for prints in cream on both sides. */
const UNKNOWN: readonly [string, string] = ["#E6DFD2", "#E6DFD2"];

export function clubColours(name: string): readonly [string, string] {
  return CLUB_COLOURS[clubDisplayName(name)] ?? UNKNOWN;
}

const isLightNeutral = (hex: string) => isNeutral(hex) && oklch(hex)[0] > 0.8;

/** The ring around a crest: the true primary, or the secondary for the
 *  clubs whose primary is white (Fulham, Leeds) so the ring still shows. */
export function ringColour(name: string): string {
  const [primary, secondary] = clubColours(name);
  return isLightNeutral(primary) ? secondary : primary;
}

function keyColour([primary, secondary]: readonly [string, string]): string | null {
  if (!isNeutral(primary)) return primary;
  return isNeutral(secondary) ? null : secondary;
}

const warmHue = (hex: string) => {
  const degrees = (oklch(hex)[2] * 180) / Math.PI;
  return degrees > -40 && degrees < 90;
};

export type ClubInks = {
  /** The seal's weave on this club's half. */
  weave: string;
  weaveWidth: number;
  /** A white second colour runs as every fourth strand. */
  thread: string | null;
  /** A real second colour runs as the rim rules of this club's half. */
  rim: string | null;
  /** The floodlight and LED colour. */
  glow: string;
  /** Scales the light so goals, not hue, set brightness: a saturated red
   *  out-shouts a blue at the same opacity. */
  glowStrength: number;
  led: string;
};

/** How a club's colours print on the dark ground, kept faithful.
 *
 *  A dark warm colour (claret, maroon) turns raspberry the moment it is
 *  lightened, so it prints at its own lightness with a heavier line; a dark
 *  navy can take a small lift and still read as navy. */
export function clubInks(name: string): ClubInks {
  const colours = clubColours(name);
  const key = keyColour(colours);
  const secondary = colours[1];
  const dark = key ? oklch(key)[0] < 0.42 : false;
  const darkWarm = key != null && dark && warmHue(key);
  const glow = key ? lift(key, 0.56, 0.8) : "#E8E1CF";
  return {
    weave: key ? lift(key, darkWarm ? 0.35 : dark ? 0.39 : 0.46, 0.8) : "#E6DFD2",
    weaveWidth: darkWarm ? 0.8 : dark ? 0.64 : 0.42,
    thread: isLightNeutral(secondary) ? "#E9E2D5" : null,
    rim: isNeutral(secondary) ? null : lift(secondary, 0.5, 0.84),
    glow,
    glowStrength: Number(Math.min(1, (0.14 / Math.max(0.02, oklch(glow)[1])) ** 0.6).toFixed(3)),
    led: key ? lift(key, dark ? 0.43 : 0.5, 0.8) : "#E8E1CF",
  };
}
