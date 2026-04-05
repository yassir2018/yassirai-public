import { t, type Locale } from "@/lib/i18n";
import type { Template } from "@/lib/api";

export function Templates({ locale, templates }: { locale: Locale; templates: Template[] }) {
  return (
    <section id="templates" className="py-24 sm:py-32 bg-surface/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t.templates_title[locale]}
          </h2>
          <p className="text-muted text-base sm:text-lg">{t.templates_subtitle[locale]}</p>
          <div className="w-16 h-1 bg-accent rounded-full mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group bg-surface border border-border rounded-2xl overflow-hidden hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 flex flex-col"
            >
              {tmpl.thumbnailUrl && (
                <div className="aspect-video bg-background border-b border-border overflow-hidden">
                  <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-semibold leading-tight">{tmpl.name}</h3>
                  {tmpl.category && (
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-xs text-muted bg-surface-hover">{tmpl.category}</span>
                  )}
                </div>

                {tmpl.description && (
                  <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2 flex-1">{tmpl.description}</p>
                )}

                <div className="flex items-center gap-3 mt-auto">
                  {tmpl.previewUrl && (
                    <a
                      href={tmpl.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                      className="inline-flex items-center gap-1.5 text-xs text-success hover:text-success/80 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                      </svg>
                      {t.templates_buy[locale]}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
