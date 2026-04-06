import { fetchPortfolio } from "@/lib/api";
import { locales, type Locale } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { Projects } from "@/components/Projects";
import { Templates } from "@/components/Templates";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import type { Metadata } from "next";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const data = await fetchPortfolio(lang as Locale);
  return {
    title: data.siteSettings?.siteTitle || "Yassir AI — Portfolio",
    description: data.siteSettings?.siteDescription || "Directeur Artistique & AI Visual Designer",
  };
}

export default async function LangPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const data = await fetchPortfolio(locale);
  const siteName = data.siteSettings?.siteName;

  return (
    <>
      <Analytics page={`/${locale}`} lang={locale} />
      <Navbar locale={locale} siteName={siteName} />
      <main>
        <Hero locale={locale} bio={data.bio} videos={data.heroVideos} />
        {data.bio && <About locale={locale} bio={data.bio} />}
        {data.services.length > 0 && <Services locale={locale} services={data.services} />}
        {data.projects.length > 0 && <Projects locale={locale} projects={data.projects} />}
        <Templates locale={locale} templates={data.templates} categories={data.templateCategories} />
        <Contact locale={locale} contacts={data.contacts} />
      </main>
      <Footer locale={locale} bio={data.bio} siteName={siteName} />
    </>
  );
}
