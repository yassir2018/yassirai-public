import { locales, isRtl, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { ClientProviders } from "@/components/ClientProviders";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!locales.includes(lang as Locale)) notFound();

  const locale = lang as Locale;
  const rtl = isRtl(locale);

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      lang={locale}
      className={rtl ? "font-[var(--font-noto-arabic)]" : ""}
    >
      <a href="#main-content" className="skip-link">
        {locale === "ar" ? "انتقل إلى المحتوى" : locale === "en" ? "Skip to content" : "Aller au contenu"}
      </a>
      <ClientProviders>
        {children}
      </ClientProviders>
    </div>
  );
}
