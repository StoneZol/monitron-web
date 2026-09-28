export type PlaceholderMeta = {
    id: string;
    title: string;
    href: string;
    /** static preview image (screenshot) */
    previewSrc?: string;
};

export const placeholders: PlaceholderMeta[] = [
    {
        id: "matrix",
        title: "Matrix",
        href: "/s/matrix",
        previewSrc: "/s/matrix.webp",
    },
    {
        id: "gradient",
        title: "Gradient",
        href: "/s/gradient",
    },
    {
        id: "grid",
        title: "Grid",
        href: "/s/grid",
    },
];
