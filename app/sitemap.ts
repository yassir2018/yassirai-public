import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://yassirai.com";

  return locales.map((lang) => ({
    url: `${baseUrl}/${lang}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 1.0,
  }));
}
