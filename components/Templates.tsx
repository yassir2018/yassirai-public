"use client";
import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { t, type Locale } from "@/lib/i18n";
import type { Template } from "@/lib/api";
import { SectionHeading } from "./SectionHeading";
import { trackEvent } from "./Analytics";

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  all: { fr: "Tout", en: "All", ar: "الكل" },
  creative: { fr: "Agence & Portfolio", en: "Agency & Portfolio", ar: "وكالة وملف" },
  food: { fr: "Restaurant & Food", en: "Restaurant & Food", ar: "مطعم وطعام" },
  ecommerce: { fr: "E-commerce & Mode", en: "E-commerce & Fashion", ar: "تجارة إلكترونية" },
  entertainment: { fr: "Entertainment & Media", en: "Entertainment & Media", ar: "ترفيه وإعلام" },
};

export function Templates({ locale, templates, categories }: { locale: Locale; templates: Template[]; categories?: string[] }) {
  const CATEGORIES = ["all", ...(categories && categories.length > 0 ? categories : Object.keys(CATEGORY_LABELS).filter((k) => k !== "all"))];
  const [activeCategory, setActiveCategory] = useState("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filtered =
    activeCategory === "all"
      ? templates
      : templates.filter((tmpl) => tmpl.category === activeCategory);

  if (templates.length === 0) return null;

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
                    onClick={() => {
                      if (tmpl.previewUrl) {
                        setPreviewUrl(tmpl.previewUrl);
                        trackEvent(tmpl.slug, "template", locale);
                      }
                    }}
                    className="w-full text-start group"
                  >
                    <div className="glass rounded-2xl overflow-hidden transition-all duration-500 hover:translate-y-[-4px]">
                      {/* Iframe thumbnail */}
                      {tmpl.previewUrl && (
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
                      )}

                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold tracking-tight truncate">
                            {tmpl.name}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {tmpl.price != null && tmpl.price > 0 && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20">
                                {tmpl.price}{tmpl.currency ? ` ${tmpl.currency}` : " MAD"}
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded-full text-[10px] text-muted bg-surface-hover border border-border uppercase tracking-wider">
                              {CATEGORY_LABELS[tmpl.category as string]?.[locale] || tmpl.category}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted mt-1">{tmpl.description}</p>

                        {/* Features pills */}
                        {tmpl.features && tmpl.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {tmpl.features.slice(0, 3).map((f) => (
                              <span key={f} className="px-2 py-0.5 rounded-full text-[10px] text-muted bg-background border border-border">
                                {f}
                              </span>
                            ))}
                            {tmpl.features.length > 3 && (
                              <span className="px-2 py-0.5 text-[10px] text-muted">
                                +{tmpl.features.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Buy button */}
                        {tmpl.saleUrl && (
                          <a
                            href={tmpl.saleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors"
                          >
                            {t.templates_buy[locale]}
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                        )}
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
                {templates.find((tmpl) => tmpl.previewUrl === previewUrl)?.name}
              </span>
              <div className="flex items-center gap-3">
                {(() => {
                  const active = templates.find((tmpl) => tmpl.previewUrl === previewUrl);
                  return active?.saleUrl ? (
                    <a
                      href={active.saleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors"
                    >
                      {t.templates_buy[locale]}
                      {active.price != null && active.price > 0 && ` — ${active.price} ${active.currency || "MAD"}`}
                    </a>
                  ) : null;
                })()}
              </div>
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
