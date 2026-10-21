import {
  MONITRON_AI,
  withPorter,
  type PlaceholderMeta,
} from "./types";

/** First catalog chapter (~12 screens). */
export const placeholdersCh01: PlaceholderMeta[] = [
  {
    id: "matrix",
    title: "Matrix",
    href: "/s/matrix",
    previewSrc: "/s/matrix.webp",
    tags: ["reactive"],
    cost: "low",
    ai: MONITRON_AI,
  },
  {
    id: "hexagons_place",
    title: "Hexagons Place",
    href: "/s/hexagons_place",
    previewSrc: "/s/hexagons_place.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
  },
  {
    id: "synthwave",
    title: "Synthwave",
    href: "/s/synthwave",
    previewSrc: "/s/synthwave.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
  },
  {
    id: "blackhole",
    title: "Blackhole",
    href: "/s/blackhole",
    previewSrc: "/s/blackhole.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "set111",
        title: "Black hole with accretion disk",
        href: "https://www.shadertoy.com/view/tsBXW3",
      }),
    ],
  },
  {
    id: "hexacore",
    title: "Hexacore",
    href: "/s/hexacore",
    previewSrc: "/s/hexacore.webp",
    tags: ["reactive"],
    cost: "high",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "nobody93",
        title: "Hexagonal Hive Lattice",
        href: "https://www.shadertoy.com/view/73KGRd",
      }),
    ],
  },
  {
    id: "warpburst",
    title: "Warpburst",
    href: "/s/warpburst",
    previewSrc: "/s/warpburst.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "heidro",
        title: "Warpburst 2",
        href: "https://www.shadertoy.com/view/fXGGDV",
      }),
    ],
  },
  {
    id: "fairy_smoke",
    title: "Fairy Smoke",
    href: "/s/fairy_smoke",
    previewSrc: "/s/fairy_smoke.webp",
    tags: ["reactive"],
    cost: "high",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "Himred",
        title: "Fairy smoke",
        href: "https://www.shadertoy.com/view/fXG3Ww",
      }),
    ],
  },
  {
    id: "kali_star_nest",
    title: "Kali Star Nest",
    href: "/s/kali_star_nest",
    previewSrc: "/s/kali_star_nest.webp",
    tags: ["reactive"],
    cost: "low",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "aladiN",
        title: "kali star nest, free 360° flight",
        href: "https://www.shadertoy.com/view/f3y3DW",
      }),
    ],
  },
  {
    id: "coral_reef",
    title: "Coral Reef",
    href: "/s/coral_reef",
    previewSrc: "/s/coral_reef.webp",
    tags: ["reactive"],
    cost: "high",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "Yusef28",
        title: "Coral Reef Y28",
        href: "https://www.shadertoy.com/view/7X3GRS",
      }),
    ],
  },
  {
    id: "spectrum",
    title: "Spectrum",
    href: "/s/spectrum",
    previewSrc: "/s/spectrum.webp",
    tags: ["only-reactive"],
    cost: "low",
    ai: MONITRON_AI,
  },
  {
    id: "observance",
    title: "Observance",
    href: "/s/observance",
    previewSrc: "/s/observance.webp",
    tags: ["reactive", "sensitive"],
    cost: "mid",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "diatribes",
        title: "Observance",
        href: "https://www.shadertoy.com/view/s3G3D1",
      }),
    ],
  },
  {
    id: "dark_terrain",
    title: "Dark Terrain",
    href: "/s/dark_terrain",
    previewSrc: "/s/dark_terrain.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "diatribes",
        title: "Dark Terrain",
        href: "https://www.shadertoy.com/view/WcccRl",
      }),
    ],
  },
];

export const blurbsCh01: Record<string, string> = {
  matrix:
    "Matrix-style glyph rain for idle monitors — audio-reactive color and fall.",
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
  fairy_smoke:
    "Volumetric fairy smoke shell for idle monitors — reactive tint and speed.",
  kali_star_nest:
    "Kali Star Nest free flight for idle monitors — reactive stars, fog, and speed.",
  coral_reef:
    "Volumetric coral reef tunnel for idle monitors — reactive tint and speed.",
  spectrum:
    "Plain audio-bus spectrum bars for idle monitors — 32 bands, peak caps, mirror.",
  observance:
    "Observance void flight for idle monitors — crosses, lightning, and reactive tint.",
  dark_terrain:
    "Dark Terrain hill flight for idle monitors — flex look, lightning, and reactive tint.",
};
