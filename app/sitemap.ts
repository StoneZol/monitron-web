import type { MetadataRoute } from "next";
import { placeholders } from "@/lib/placeholders";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/guide`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...placeholders.map((p) => ({
      url: `${base}${p.href}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
