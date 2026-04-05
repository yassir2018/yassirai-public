import { t, type Locale } from "@/lib/i18n";
import type { Bio } from "@/lib/api";

export function Footer({ locale, bio }: { locale: Locale; bio: Bio | null }) {
  const name = bio?.name || "YassirAI";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted">
          &copy; {year} {name}. {t.footer_rights[locale]}
        </p>
        <span className="text-lg font-bold tracking-tight">
          <span className="gradient-text">YassirAI</span>
        </span>
      </div>
    </footer>
  );
}
