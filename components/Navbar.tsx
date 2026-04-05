"use client";
import { useState } from "react";
import Link from "next/link";
import { locales, t, type Locale } from "@/lib/i18n";

const langLabels: Record<Locale, string> = { fr: "FR", en: "EN", ar: "AR" };

export function Navbar({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#about", label: t.nav_about[locale] },
    { href: "#services", label: t.nav_services[locale] },
    { href: "#projects", label: t.nav_projects[locale] },
    { href: "#contact", label: t.nav_contact[locale] },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">
          <span className="gradient-text">YassirAI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
          <div className="flex items-center gap-1 ms-4 p-1 bg-surface rounded-lg border border-border">
            {locales.map((l) => (
              <Link
                key={l}
                href={`/${l}`}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  l === locale ? "bg-accent text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {langLabels[l]}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-muted hover:text-foreground">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-muted hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
            <div className="flex items-center gap-1 pt-2">
              {locales.map((l) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    l === locale ? "bg-accent text-white" : "text-muted bg-surface hover:text-foreground"
                  }`}
                >
                  {langLabels[l]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
