import { t, type Locale } from "@/lib/i18n";
import type { Bio } from "@/lib/api";

export function About({ locale, bio }: { locale: Locale; bio: Bio }) {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t.about_title[locale]}
          </h2>
          <div className="w-16 h-1 bg-accent rounded-full mx-auto" />
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 sm:p-12">
          {bio.avatarUrl && (
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-accent/30 mx-auto mb-8">
              <img src={bio.avatarUrl} alt={bio.name} className="w-full h-full object-cover" />
            </div>
          )}
          <p className="text-base sm:text-lg text-muted leading-relaxed whitespace-pre-line text-center">
            {bio.bio}
          </p>
        </div>
      </div>
    </section>
  );
}
