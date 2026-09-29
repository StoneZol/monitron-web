export type PlaceholderMeta = {
    id: string;
    title: string;
    href: string;
    /** static preview image (screenshot) */
    previewSrc?: string;
    /** Compatible with Monitron Chrome extension audio-bus */
    reactive?: boolean;
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
        id: "grid",
        title: "Grid",
        href: "/s/grid",
    },
];
