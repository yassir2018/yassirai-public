import { t, type Locale } from "@/lib/i18n";
import type { Bio } from "@/lib/api";

export function Hero({ locale, bio }: { locale: Locale; bio: Bio | null }) {
  const name = bio?.name || "Yassir";
  const title = bio?.title || "Developer & Designer";
  const heroText = bio?.heroText || "";

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-sm sm:text-base text-muted mb-4 animate-fade-in-up">
          {t.hero_greeting[locale]}
        </p>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4 animate-fade-in-up animate-delay-100">
          {name}
        </h1>

        <p className="text-xl sm:text-2xl lg:text-3xl text-muted font-light mb-6 animate-fade-in-up animate-delay-200">
          {title}
        </p>

        {heroText && (
          <p className="text-base sm:text-lg text-muted/80 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animate-delay-300">
            {heroText}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animate-delay-400">
          <a
            href="#projects"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-xl transition-all"
          >
            {t.hero_cta[locale]}
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-muted border border-border hover:border-accent/40 hover:text-foreground rounded-xl transition-all"
          >
            {t.hero_contact[locale]}
          </a>
        </div>
      </div>
    </section>
  );
}
