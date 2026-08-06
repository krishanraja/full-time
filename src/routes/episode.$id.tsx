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
import { pageSeo, ldJson } from "@/lib/seo";
import type { Episode } from "@/data/mockEpisodes";

// Schema.org PodcastEpisode for the share page, so search engines and AI
// assistants read this as a real audio episode rather than an untyped page.
// Built ONLY from the loaded row: every optional field is omitted when the
// underlying column is null or zero rather than filled with a plausible
// guess, because a wrong duration or date here is a factual claim.
function episodeJsonLd(ep: FeedEpisode, url: string, image: string) {
  const title = `${ep.homeTeam} ${ep.homeScore}-${ep.awayScore} ${ep.awayTeam}`;
  // ISO 8601 duration. duration_sec is set by the pipeline on every row.
  const duration = ep.durationSec > 0 ? `PT${ep.durationSec}S` : undefined;

  const audio = ep.audioUrl
    ? {
        "@type": "AudioObject",
        contentUrl: ep.audioUrl,
        encodingFormat: "audio/mpeg",
        // The narration script IS the transcript, verbatim: it is what the
        // TTS read out, so this is a real transcript, not a summary.
        transcript: ep.script,
        ...(duration ? { duration } : {}),
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    "@id": url,
    url,
    name: title,
    description: ep.hook,
    datePublished: ep.publishedAt,
    inLanguage: "en",
    // Same image the OG tag uses, including the app-icon fallback while
    // og_image_url is still null on every row.
    image,
    // @id ties this back to the PodcastSeries node the root layout emits, so
    // the series is described once and referenced everywhere rather than
    // re-asserted (and possibly contradicted) per episode.
    partOfSeries: {
      "@type": "PodcastSeries",
      "@id": `${SITE_URL}/#podcast`,
      name: "Full Time",
      url: SITE_URL,
      webFeed: `${SITE_URL}/api/public/feed.rss`,
    },
    ...(duration ? { duration } : {}),
    ...(audio ? { associatedMedia: audio } : {}),
  };
}

// Breadcrumbs give search results a readable trail and give answer engines
// the parent/child relationship without them having to infer it from URLs.
function breadcrumbJsonLd(url: string, title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Today", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: title, item: url },
    ],
  };
}

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
      return {
        meta: [
          { title: "Episode not found • Full Time" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const title = `${ep.homeTeam} ${ep.homeScore}-${ep.awayScore} ${ep.awayTeam} • Full Time`;
    const description = ep.hook;
    const path = `/episode/${ep.id}`;
    const url = `${SITE_URL}${path}`;
    // og_image_url is NULL on every episode today (nothing generates it
    // yet); fall back to the app icon so the share card is never blank.
    const image = ep.ogImageUrl ?? DEFAULT_COVER_IMAGE_URL;

    const seo = pageSeo({
      path,
      title,
      description,
      image,
      imageAlt: title,
      type: "article",
    });

    return {
      ...seo,
      meta: [
        ...seo.meta,
        { property: "article:published_time", content: ep.publishedAt },
        // TanStack Router renders these as <script type="application/ld+json">
        // in the server-rendered <head> via HeadContent. The cast is because
        // the head `meta` array is typed as HTML <meta> attributes, which the
        // ld+json escape hatch deliberately is not; the same shape is already
        // used for the root layout's script tag.
        ldJson(episodeJsonLd(ep, url, image)),
        ldJson(breadcrumbJsonLd(url, title)),
      ],
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

      {/* The narration script, verbatim. It is already inside the
          PodcastEpisode JSON-LD as `transcript`, but structured data alone
          is metadata: putting the words in the document body is what makes
          the recap readable to anything that cannot press play, from a
          crawler to a screen reader to someone on a silent commute. Kept in
          a <details> so the page stays an audio-first surface by default;
          the content ships in the HTML either way. */}
      {episode.script ? (
        <details className="mt-6 border-t border-[var(--pitch-line)] pt-4">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Read the transcript
          </summary>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {episode.script
              .split(/\n{2,}/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
        </details>
      ) : null}

      <div className="mt-5">
        <ShareButton episode={episode} />
      </div>
    </div>
  );
}
