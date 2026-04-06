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
  stack: string | null;
  status: string;
  description: string | null;
  url: string | null;
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

export interface PortfolioData {
  bio: Bio | null;
  services: Service[];
  contacts: Contact[];
  projects: Project[];
  templates: Template[];
}

export async function fetchPortfolio(lang: Locale): Promise<PortfolioData> {
  const res = await fetch(`${API_URL}?lang=${lang}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return { bio: null, services: [], contacts: [], projects: [], templates: [] };
  }

  return res.json();
}
