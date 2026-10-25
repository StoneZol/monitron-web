import {
    MONITRON_AI,
    withPorter,
    type PlaceholderMeta,
} from "./types";

/** Second catalog chapter. */
export const placeholdersCh02: PlaceholderMeta[] = [
    {
        id: "protean_clouds",
        title: "Protean Clouds",
        href: "/s/protean_clouds",
        previewSrc: "/s/protean_clouds.webp",
        tags: ["reactive"],
        cost: "high",
        ai: MONITRON_AI,
        sources: [
            withPorter({
                author: "nimitz",
                title: "Protean clouds",
                href: "https://www.shadertoy.com/view/3l23Rh",
            }),
        ],
    },
    {
        id: "wet_glass",
        title: "Wet Glass",
        href: "/s/wet_glass",
        previewSrc: "/s/wet_glass.webp",
        tags: ["track-sync"],
        cost: "low",
        ai: MONITRON_AI,
        sources: [
            withPorter({
                author: "BigWings",
                title: "Heartfelt (rain on glass ref)",
                href: "https://www.shadertoy.com/view/ltffzl",
            }),
        ],
    },
    {
        id: "music_visual_bar",
        title: "Music Visual Bar",
        href: "/s/music_visual_bar",
        previewSrc: "/s/music_visual_bar.webp",
        tags: ["reactive"],
        cost: "low",
        ai: MONITRON_AI,
        sources: [
            withPorter({
                author: "beetom",
                title: "Music Visual Bar",
                href: "https://www.shadertoy.com/view/sXtSDS",
            }),
        ],
    },
    {
        id: "rainbow_crystal",
        title: "Rainbow Crystal",
        href: "/s/rainbow_crystal",
        previewSrc: "/s/rainbow_crystal.webp",
        tags: ["reactive"],
        cost: "mid",
        ai: MONITRON_AI,
        sources: [
            withPorter({
                author: "OldEclipse",
                title: "Rainbow Crystal",
                href: "https://www.shadertoy.com/view/sXtSzB",
            }),
        ],
    },
    {
        id: "starleidoscope",
        title: "Starleidoscope",
        href: "/s/starleidoscope",
        previewSrc: "/s/starleidoscope.webp",
        tags: ["reactive"],
        cost: "mid",
        ai: MONITRON_AI,
        sources: [
            withPorter({
                author: "DanielXMoore",
                title: "Starleidoscope",
                href: "https://www.shadertoy.com/view/ftt3R7",
            }),
        ],
    },
    {
        id: "quaternion_fractal",
        title: "Quaternion Fractal",
        href: "/s/quaternion_fractal",
        previewSrc: "/s/quaternion_fractal.webp",
        tags: ["reactive"],
        cost: "high",
        ai: MONITRON_AI,
        sources: [
            withPorter({
                author: "asyncker",
                title: "Quaternion fractal",
                href: "https://www.shadertoy.com/view/N3tSDf",
            }),
        ],
    },
    {
        id: "blue_002",
        title: "002 Blue",
        href: "/s/blue_002",
        previewSrc: "/s/blue_002.webp",
        tags: ["reactive"],
        cost: "mid",
        ai: MONITRON_AI,
        sources: [
            withPorter({
                author: "haquxx",
                title: "002-Blue",
                href: "https://www.shadertoy.com/view/WldSRn",
            }),
        ],
    },
    {
        id: "dark_transit",
        title: "Dark Transit",
        href: "/s/dark_transit",
        tags: ["reactive"],
        cost: "low",
        ai: MONITRON_AI,
        sources: [
            withPorter({
                author: "diatribes",
                title: "Dark Transit",
                href: "https://www.shadertoy.com/view/WcdczB",
            }),
        ],
    },
];

export const blurbsCh02: Record<string, string> = {
    protean_clouds:
        "Protean clouds volume flight for idle monitors — reactive tint and speed.",
    wet_glass:
        "Wet glass for idle monitors — rain streaks, fog, and your own background still.",
    music_visual_bar:
        "Cyber neon spectrum ring for idle monitors — frost lens, bloom, reactive hue and speed.",
    rainbow_crystal:
        "Rainbow Crystal fold march for idle monitors — reactive tint, twinkle, and speed.",
    starleidoscope:
        "Starleidoscope kaleidoscope starfield for idle monitors — twinkle, palette, reactive pattern.",
    quaternion_fractal:
        "Quaternion fractal raymarch for idle monitors — camera orbit, idle/peak tint, twinkle.",
    blue_002:
        "002 Blue tunnel flight for idle monitors — flex look, stock path, reactive glow.",
    dark_transit:
        "Dark Transit tunnel for idle monitors — cinema bars, wall/orb palettes, reactive flight.",
};
