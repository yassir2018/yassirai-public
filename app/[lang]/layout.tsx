import { locales, isRtl, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";

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
    <div dir={rtl ? "rtl" : "ltr"} lang={locale}>
      {children}
    </div>
  );
}
