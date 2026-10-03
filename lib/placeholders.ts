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
];
