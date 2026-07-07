// Per-episode share page. Loads the real episode row via the existing
// getEpisode server fn (feed.functions.ts) and renders it with route-level
// head() OG tags so a shared link unfurls with the real scoreline, not the
// generic site card. Never invents an episode: a bad/missing id 404s via
// the shared root notFoundComponent instead of rendering placeholder data.

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, ChevronLeft, Share2 } from "lucide-react";
import { useState } from "react";
import { AudioCard } from "@/components/AudioCard";
import { HapticButton } from "@/components/HapticButton";
import { getEpisode, type FeedEpisode } from "@/lib/api/feed.functions";
import { SITE_URL, DEFAULT_COVER_IMAGE_URL } from "@/lib/site-url";
import type { Episode } from "@/data/mockEpisodes";

export const Route = createFileRoute("/episode/$id")({
  loader: async ({ params }) => {
    try {
      return await getEpisode({ data: { id: params.id } });
    } catch {
      // Bad id, wrong shape, or no such row: 404, don't fabricate a page.
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const ep = loaderData as FeedEpisode | undefined;
    if (!ep) {
      return { meta: [{ title: "Episode not found • Full Time" }] };
    }
    const title = `${ep.homeTeam} ${ep.homeScore}-${ep.awayScore} ${ep.awayTeam} • Full Time`;
    const description = ep.hook;
    const url = `${SITE_URL}/episode/${ep.id}`;
    // og_image_url is NULL on every episode today (nothing generates it
    // yet); fall back to the app icon so the share card is never blank.
    const image = ep.ogImageUrl ?? DEFAULT_COVER_IMAGE_URL;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:site_name", content: "Full Time" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: EpisodePage,
});

function toEpisode(ep: FeedEpisode): Episode {
  return {
    id: ep.id,
    title: ep.title,
    hook: ep.hook,
    homeTeam: ep.homeTeam,
    awayTeam: ep.awayTeam,
    homeScore: ep.homeScore,
    awayScore: ep.awayScore,
    competition: ep.competition,
    durationSec: ep.durationSec,
    badge: ep.badge,
    audioUrl: ep.audioUrl,
    homeTeamId: ep.homeTeamId,
    awayTeamId: ep.awayTeamId,
    leagueId: ep.leagueId,
  };
}

function ShareButton({ episode }: { episode: FeedEpisode }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/episode/${episode.id}`;

  const handleShare = async () => {
    const shareData = {
      title: `${episode.homeTeam} ${episode.homeScore}-${episode.awayScore} ${episode.awayTeam}`,
      text: episode.hook,
      url,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled the native sheet, or the API rejected; fall
        // through to clipboard so the tap never dead-ends.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (e.g. non-HTTPS/local): nothing more we
      // can do without a manual selection fallback UI. Fail quietly.
    }
  };

  return (
    <HapticButton
      hapticPattern="soft"
      onClick={handleShare}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--pitch-line)] px-5 py-3 text-sm font-semibold tracking-tight hover:border-foreground/30"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-[var(--lime)]" />
          Link copied
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Share this recap
        </>
      )}
    </HapticButton>
  );
}

function EpisodePage() {
  const episode = Route.useLoaderData();
  const uiEpisode = toEpisode(episode);

  return (
    <div className="pb-6 pt-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to today&rsquo;s drop
      </Link>

      <div className="mt-4">
        <AudioCard episode={uiEpisode} hero />
      </div>

      <div className="mt-5">
        <ShareButton episode={episode} />
      </div>
    </div>
  );
}
