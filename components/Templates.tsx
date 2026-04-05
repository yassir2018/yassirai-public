"use client";
import Image from "next/image";
import { t, isRtl, type Locale } from "@/lib/i18n";
import type { Template } from "@/lib/api";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal } from "./ScrollReveal";

export function Templates({ locale, templates }: { locale: Locale; templates: Template[] }) {
  const rtl = isRtl(locale);

  return (
    <section id="templates" className="py-32 sm:py-40 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeading
          title={t.templates_title[locale]}
          subtitle={t.templates_subtitle[locale]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {templates.map((tmpl, i) => (
            <ScrollReveal
              key={tmpl.id}
              variant={i % 2 === 0 ? "fadeLeft" : "fadeRight"}
              rtl={rtl}
              delay={i * 0.1}
            >
              <div className="group glass rounded-2xl overflow-hidden transition-all duration-500 hover:translate-y-[-2px]">
                {/* Image with cinematic hover */}
                {tmpl.thumbnailUrl && (
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={tmpl.thumbnailUrl}
                      alt={tmpl.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                      <span className="text-lg font-semibold text-white">{tmpl.name}</span>
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold tracking-tight">{tmpl.name}</h3>
                    {tmpl.category && (
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-xs text-muted bg-surface-hover border border-border">
                        {tmpl.category}
                      </span>
                    )}
                  </div>

                  {tmpl.description && (
                    <p className="text-sm text-muted leading-relaxed mb-5 line-clamp-2">
                      {tmpl.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    {tmpl.previewUrl && (
                      <a
                        href={tmpl.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors group/link"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t.templates_preview[locale]}
                      </a>
                    )}
                    {tmpl.saleUrl && (
                      <a
                        href={tmpl.saleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-success hover:text-success/80 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                        </svg>
                        {t.templates_buy[locale]}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
