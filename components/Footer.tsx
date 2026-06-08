"use client";
import { t, type Locale } from "@/lib/i18n";
import type { Bio } from "@/lib/api";

export function Footer({ locale, bio, siteName }: { locale: Locale; bio: Bio | null; siteName?: string }) {
  const name = bio?.name || "YassirAI";
  const year = new Date().getFullYear();

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const links = [
    { href: "#templates", label: t.nav_templates[locale] },
    { href: "#services", label: t.nav_services[locale] },
    { href: "#projects", label: t.nav_projects[locale] },
    { href: "#about", label: t.nav_about[locale] },
    { href: "#contact", label: t.nav_contact[locale] },
  ];

  return (
    <footer className="bg-[#09090b] text-[#fafafa] border-t border-[#27272a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Brand */}
          <div className="max-w-sm">
            <span className="text-2xl font-bold tracking-tight gradient-text">{siteName || "YassirAI"}</span>
            {bio?.title && <p className="mt-3 text-sm text-[#a1a1aa] leading-relaxed">{bio.title}</p>}
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm md:justify-end md:self-start">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-[#a1a1aa] hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-[#27272a] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#71717a]">
            &copy; {year} {name}. {t.footer_rights[locale]}
          </p>
          <button
            onClick={scrollToTop}
            className="group flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {t.footer_top[locale]}
          </button>
        </div>
      </div>
    </footer>
  );
}
