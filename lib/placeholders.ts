export type PlaceholderSource = {
    href: string;
    /** Shader / piece author */
    author: string;
    /** Full original title */
    title: string;
};

export type PlaceholderMeta = {
    id: string;
    title: string;
    href: string;
    /** static preview image (screenshot) */
    previewSrc?: string;
    /** Compatible with Monitron Chrome extension audio-bus */
    reactive?: boolean;
    /** Attribution — non-clickable stamp + credit link under the card */
    sources?: PlaceholderSource[];
};

export const placeholders: PlaceholderMeta[] = [
    {
        id: "matrix",
        title: "Matrix",
        href: "/s/matrix",
        previewSrc: "/s/matrix.webp",
        reactive: true,
    },
    {
        id: "hexagons_place",
        title: "Hexagons Place",
        href: "/s/hexagons_place",
        previewSrc: "/s/hexagons_place.webp",
        reactive: true,
    },
    {
        id: "synthwave",
        title: "Synthwave",
        href: "/s/synthwave",
        previewSrc: "/s/synthwave.webp",
        reactive: true,
    },
    {
        id: "blackhole",
        title: "Blackhole",
        href: "/s/blackhole",
        previewSrc: "/s/blackhole.webp",
        reactive: true,
        sources: [
            {
                author: "set111",
                title: "Black hole with accretion disk",
                href: "https://www.shadertoy.com/view/tsBXW3",
            },
        ],
    },
    {
        id: "hexacore",
        title: "Hexacore",
        href: "/s/hexacore",
        previewSrc: "/s/hexacore.webp",
        reactive: true,
        sources: [
            {
                author: "nobody93",
                title: "Hexagonal Hive Lattice",
                href: "https://www.shadertoy.com/view/73KGRd",
            },
        ],
    },
    {
        id: "warpburst",
        title: "Warpburst",
        href: "/s/warpburst",
        previewSrc: "/s/warpburst.webp",
        reactive: true,
        sources: [
            {
                author: "heidro",
                title: "Warpburst 2",
                href: "https://www.shadertoy.com/view/fXGGDV",
            },
        ],
    },
    {
        id: "fairysmoke",
        title: "Fairy Smoke",
        href: "/s/fairysmoke",
        previewSrc: "/s/fairysmoke.webp",
        reactive: true,
        sources: [
            {
                author: "Himred",
                title: "Fairy smoke",
                href: "https://www.shadertoy.com/view/fXG3Ww",
            },
        ],
    },
    {
        id: "kalistarnest",
        title: "Kali Star Nest",
        href: "/s/kalistarnest",
        previewSrc: "/s/kalistarnest.webp",
        reactive: true,
        sources: [
            {
                author: "aladiN",
                title: "kali star nest, free 360° flight",
                href: "https://www.shadertoy.com/view/f3y3DW",
            },
        ],
    },
    {
        id: "coralreef",
        title: "Coral Reef",
        href: "/s/coralreef",
        previewSrc: "/s/coralreef.webp",
        reactive: true,
        sources: [
            {
                author: "Yusef28",
                title: "Coral Reef Y28",
                href: "https://www.shadertoy.com/view/7X3GRS",
            },
        ],
    },
];
