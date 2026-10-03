import type { Metadata } from "next";
import { placeholders } from "@/lib/placeholders";
import { getSiteUrl } from "@/lib/site";

export const SITE_NAME = "Monitron";
export const SITE_TAGLINE = "Bootleg generative signals for idle monitors.";
export const SITE_DESCRIPTION =
  "Full-screen generative savers for idle monitors. Chrome extension grabs tab audio — bass, mid, high, beat — and drives the picture.";

const GOOGLE_SITE_VERIFICATION = "nZeHCauFJdsg93vSYyMwWigE77hdQjTvuQhEk1hGy0M";

/** Short SEO blurbs for each visual channel. */
const SCREEN_BLURBS: Record<string, string> = {
  matrix: "Matrix-style glyph rain for idle monitors — audio-reactive color and fall.",
  hexagons_place:
    "Hex lattice flight for idle monitors — reactive color, glow, and fog.",
  synthwave:
    "Neon synthwave grid and sun for idle monitors — audio-reactive look.",
  blackhole:
    "Accretion-disk black hole for idle monitors — reactive tint and motion.",
  hexacore:
    "Hexagonal hive tunnel for idle monitors — garland, tint, and flight.",
  warpburst:
    "Goo tunnel fog for idle monitors — speed, color, and peak flicker.",
};

function absoluteOg(path: string): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

function ogImages(path: string, alt: string): NonNullable<Metadata["openGraph"]>["images"] {
  return [
    {
      url: absoluteOg(path),
      width: 1200,
      height: 630,
      alt,
      type: "image/png",
    },
  ];
}

export function rootMetadata(): Metadata {
  const url = getSiteUrl();
  const images = ogImages("/og/monitronOG.png", SITE_NAME);

  return {
    metadataBase: new URL(url),
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    alternates: {
      canonical: "/",
    },
    keywords: [
      "monitron",
      "screensaver",
      "generative",
      "shader",
      "audio reactive",
      "idle monitor",
      "chrome extension",
    ],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    verification: {
      google: GOOGLE_SITE_VERIFICATION,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_TAGLINE,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_TAGLINE,
      images: [absoluteOg("/og/monitronOG.png")],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function screenMetadata(screenId: string): Metadata {
  const placeholder = placeholders.find((p) => p.id === screenId);
  const title = placeholder?.title ?? screenId;
  const description =
    SCREEN_BLURBS[screenId] ??
    `${title} — generative fullscreen saver on Monitron.`;
  const path = placeholder?.href ?? `/s/${screenId}`;
  const ogPath = `/og/${screenId}.png`;
  const images = ogImages(ogPath, `${title} — ${SITE_NAME}`);
  const url = absoluteOg(path);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      title: `${title} · ${SITE_NAME}`,
      description,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [absoluteOg(ogPath)],
    },
  };
}
