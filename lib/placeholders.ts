export type PlaceholderMeta = {
    id: string;
    title: string;
    href: string;
    /** static preview image (screenshot) */
    previewSrc?: string;
    /** Compatible with Monitron Chrome extension audio-bus */
    reactive?: boolean;
    /** Attribution links (Shadertoy etc.) — clickable badge on the card */
    sources?: { label: string; href: string }[];
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
        reactive: true,
        sources: [
            {
                label: "Gargantua · sonicether",
                href: "https://www.shadertoy.com/view/lstSRS",
            },
            {
                label: "flight · tsBXW3",
                href: "https://www.shadertoy.com/view/tsBXW3",
            },
        ],
    },
];
