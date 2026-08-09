import type { ReporterFeedItem } from "@/lib/api/editorial-public.server";
import { DEFAULT_COVER_IMAGE_URL, SITE_URL } from "@/lib/site-url";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function op3Wrap(url: string): string {
  return `https://op3.dev/e/${url.replace(/^https?:\/\//, "")}`;
}

function duration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function reporterItemXml(item: ReporterFeedItem): string {
  const episodeUrl = `${SITE_URL}/?drop=${item.drop_id}&pundit=zen`;
  const imageUrl = item.share_image_url ?? DEFAULT_COVER_IMAGE_URL;
  const description = `${item.description}\n\nChoose another pundit at ${SITE_URL}.`;
  return [
    "<item>",
    `<title>${escapeXml(item.title)}</title>`,
    `<link>${escapeXml(episodeUrl)}</link>`,
    `<description>${escapeXml(description)}</description>`,
    `<guid isPermaLink="false">${escapeXml(item.drop_id)}</guid>`,
    `<pubDate>${new Date(item.published_at).toUTCString()}</pubDate>`,
    `<enclosure url="${escapeXml(op3Wrap(item.audio_url))}" type="audio/mpeg" length="${item.audio_bytes ?? 0}" />`,
    `<itunes:title>${escapeXml(item.title)}</itunes:title>`,
    `<itunes:summary>${escapeXml(description)}</itunes:summary>`,
    `<itunes:duration>${duration(item.audio_duration_sec ?? 0)}</itunes:duration>`,
    `<itunes:image href="${escapeXml(imageUrl)}" />`,
    "<itunes:explicit>false</itunes:explicit>",
    "<itunes:episodeType>full</itunes:episodeType>",
    "</item>",
  ].join("");
}

export function renderReporterFeed(rows: ReporterFeedItem[]) {
  const feedUrl = `${SITE_URL}/api/public/feed.rss`;
  const lastBuildDate = rows[0]?.published_at
    ? new Date(rows[0].published_at).toUTCString()
    : new Date(0).toUTCString();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    "<title>Full Time</title>",
    `<link>${SITE_URL}</link>`,
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    "<description>The Reporter edition of Full Time. Evidence-backed football judgment, with every prediction getting a receipt.</description>",
    "<language>en-gb</language>",
    `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    "<itunes:author>Full Time</itunes:author>",
    "<itunes:type>episodic</itunes:type>",
    "<itunes:explicit>false</itunes:explicit>",
    `<itunes:image href="${DEFAULT_COVER_IMAGE_URL}" />`,
    "<itunes:owner><itunes:name>Full Time</itunes:name><itunes:email>krish@themindmaker.ai</itunes:email></itunes:owner>",
    '<itunes:category text="Sports"><itunes:category text="Soccer" /></itunes:category>',
    ...rows.map(reporterItemXml),
    "</channel>",
    "</rss>",
  ].join("");
}
