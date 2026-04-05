"use client";
import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { t, type Locale } from "@/lib/i18n";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

interface LocalTemplate {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  description: string;
}

const CATEGORIES = ["all", "creative", "food", "ecommerce", "entertainment"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, Record<string, string>> = {
  all: { fr: "Tout", en: "All", ar: "الكل" },
  creative: { fr: "Agence & Portfolio", en: "Agency & Portfolio", ar: "وكالة وملف" },
  food: { fr: "Restaurant & Food", en: "Restaurant & Food", ar: "مطعم وطعام" },
  ecommerce: { fr: "E-commerce & Mode", en: "E-commerce & Fashion", ar: "تجارة إلكترونية" },
  entertainment: { fr: "Entertainment & Media", en: "Entertainment & Media", ar: "ترفيه وإعلام" },
};

const LOCAL_TEMPLATES: LocalTemplate[] = [
  { id: "agency-pro", name: "APEX Studio", category: "creative", previewUrl: "/templates/agency-pro.html", description: "Creative Agency" },
  { id: "portfolio-cv", name: "Elena Vasquez", category: "creative", previewUrl: "/templates/portfolio-cv.html", description: "Portfolio & CV" },
  { id: "bigbrand-auto", name: "VOLTEX", category: "ecommerce", previewUrl: "/templates/bigbrand-auto.html", description: "Electric Supercar" },
  { id: "boulangerie", name: "MAISON PAIN", category: "food", previewUrl: "/templates/boulangerie.html", description: "Boulangerie Artisanale" },
  { id: "chaussures", name: "STRIDE", category: "ecommerce", previewUrl: "/templates/chaussures.html", description: "Chaussures Premium" },
  { id: "ecommerce", name: "MAISON ATLAS", category: "ecommerce", previewUrl: "/templates/ecommerce.html", description: "Mode & Lifestyle" },
  { id: "gaming", name: "PHANTOM Studios", category: "entertainment", previewUrl: "/templates/gaming-studio.html", description: "Gaming Studio" },
  { id: "news", name: "الصدى", category: "entertainment", previewUrl: "/templates/news-media.html", description: "جريدة إلكترونية" },
  { id: "parfums", name: "SILLAGE", category: "ecommerce", previewUrl: "/templates/parfums.html", description: "Maison de Parfums" },
  { id: "restaurant", name: "DAR ZITOUN", category: "food", previewUrl: "/templates/restaurant.html", description: "Restaurant Gastronomique" },
  { id: "nexus", name: "NEXUS Pictures", category: "entertainment", previewUrl: "/templates/nexus-pictures.html", description: "World-Class Entertainment" },
];

export function Templates({ locale }: { locale: Locale; templates?: unknown[] }) {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filtered =
    activeCategory === "all"
      ? LOCAL_TEMPLATES
      : LOCAL_TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <>
      <section id="templates" className="py-32 sm:py-40 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            title={t.templates_title[locale]}
            subtitle={t.templates_subtitle[locale]}
          />

          {/* Category filter pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <LayoutGroup>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="relative px-5 py-2 text-sm font-medium rounded-full transition-colors"
                >
                  {activeCategory === cat && (
                    <motion.div
                      layoutId="cat-pill"
                      className="absolute inset-0 bg-accent rounded-full"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span
                    className={`relative z-10 ${
                      activeCategory === cat ? "text-white" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {CATEGORY_LABELS[cat][locale] || CATEGORY_LABELS[cat].en}
                  </span>
                </button>
              ))}
            </LayoutGroup>
          </div>

          {/* Template grid */}
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((tmpl) => (
                <motion.div
                  key={tmpl.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    onClick={() => setPreviewUrl(tmpl.previewUrl)}
                    className="w-full text-start group"
                  >
                    <div className="glass rounded-2xl overflow-hidden transition-all duration-500 hover:translate-y-[-4px]">
                      {/* Iframe thumbnail */}
                      <div className="relative aspect-video overflow-hidden bg-background border-b border-border">
                        <iframe
                          src={tmpl.previewUrl}
                          className="w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none"
                          title={tmpl.name}
                          loading="lazy"
                          sandbox="allow-same-origin"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors duration-300 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-sm font-medium bg-accent/80 backdrop-blur-sm px-4 py-2 rounded-full">
                            {t.templates_preview[locale]}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold tracking-tight truncate">
                            {tmpl.name}
                          </h3>
                          <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] text-muted bg-surface-hover border border-border uppercase tracking-wider">
                            {CATEGORY_LABELS[tmpl.category as Category]?.[locale] || tmpl.category}
                          </span>
                        </div>
                        <p className="text-sm text-muted mt-1">{tmpl.description}</p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Fullscreen preview modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setPreviewUrl(null)}
            />

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-xl border-b border-border">
              <span className="text-sm text-muted">
                {LOCAL_TEMPLATES.find((t) => t.previewUrl === previewUrl)?.name}
              </span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Iframe */}
            <div className="relative z-10 flex-1">
              <iframe
                src={previewUrl}
                className="w-full h-full bg-white"
                title="Template Preview"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
