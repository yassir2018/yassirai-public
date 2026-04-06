import type { Locale } from "./i18n";

const API_URL = process.env.PORTFOLIO_API_URL || "https://app.yassirai.com/api/public/portfolio";

export interface Bio {
  id: string;
  lang: string;
  name: string;
  title: string;
  bio: string;
  heroText: string | null;
  avatarUrl: string | null;
}

export interface Service {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface Contact {
  id: string;
  type: string;
  value: string;
  label: string | null;
  sortOrder: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  stack: string | null;
  status: string;
  description: string | null;
  url: string | null;
  demoUrl: string | null;
  videoUrl: string | null;
  screenshots: string[];
  category: string | null;
  sortOrder: number;
}

export interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  previewUrl: string | null;
  saleUrl: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  demoMode: boolean;
  features: string[];
  sortOrder: number;
}

export interface HeroVideo {
  id: string;
  url: string;
  label: string | null;
}

export interface SiteSettings {
  siteName: string;
  siteTitle: string;
  siteDescription: string | null;
  logoUrl: string | null;
}

export interface PortfolioData {
  bio: Bio | null;
  services: Service[];
  contacts: Contact[];
  projects: Project[];
  templates: Template[];
  heroVideos: HeroVideo[];
  siteSettings: SiteSettings;
  templateCategories: string[];
}

export async function fetchPortfolio(lang: Locale): Promise<PortfolioData> {
  const res = await fetch(`${API_URL}?lang=${lang}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return { bio: null, services: [], contacts: [], projects: [], templates: [], heroVideos: [], siteSettings: { siteName: "YassirAI", siteTitle: "Yassir AI — Portfolio", siteDescription: null, logoUrl: null }, templateCategories: [] };
  }

  return res.json();
}
