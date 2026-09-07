import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";

const sbfDirections = [
  "a-editorial",
  "b-visuel",
  "c-institutionnel",
  "d-showcase",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://yassirai.com";

  const portfolioPages: MetadataRoute.Sitemap = locales.map((lang) => ({
    url: `${baseUrl}/${lang}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 1.0,
  }));

  const sbfPages: MetadataRoute.Sitemap = sbfDirections.flatMap((direction) => {
    const routes = {
      ar: `${baseUrl}/SBF_site/${direction}`,
      en: `${baseUrl}/SBF_site/${direction}/en`,
      fr: `${baseUrl}/SBF_site/${direction}/fr`,
      "x-default": `${baseUrl}/SBF_site/${direction}`,
    };

    return (["ar", "en", "fr"] as const).map((locale) => ({
      url: routes[locale],
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages: routes },
    }));
  });

  return [...portfolioPages, ...sbfPages];
}
