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
  repo: string | null;
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
  type?: "video" | "image";
  greeting?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  btn1Text?: string | null;
  btn1Href?: string | null;
  btn1Visible?: boolean;
  btn2Text?: string | null;
  btn2Href?: string | null;
  btn2Visible?: boolean;
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
  projectCategories: string[];
}

const EMPTY: PortfolioData = {
  bio: null, services: [], contacts: [], projects: [], templates: [], heroVideos: [],
  siteSettings: { siteName: "YassirAI", siteTitle: "Yassir AI — Portfolio", siteDescription: null, logoUrl: null },
  templateCategories: [], projectCategories: [],
};

export async function fetchPortfolio(lang: Locale): Promise<PortfolioData> {
  let data: PortfolioData = EMPTY;
  try {
    const res = await fetch(`${API_URL}?lang=${lang}`, { next: { revalidate: 60 } });
    if (res.ok) data = await res.json();
  } catch {
    // network/API unavailable — fall back to EMPTY (keeps build/dev resilient)
  }

  // Dev-only: preview the Weaver marketplace locally even before the CMS is seeded.
  if (process.env.NODE_ENV !== "production" && (!data.templates || data.templates.length === 0)) {
    const { weaverFixture } = await import("./weaver-fixture");
    data = { ...data, templates: weaverFixture(lang) };
    data.templateCategories = [...new Set(data.templates.map((t) => t.category).filter(Boolean))] as string[];
  }

  return data;
}
