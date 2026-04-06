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
  const title = data.siteSettings?.siteTitle || "Yassir AI — Portfolio";
  const description = data.siteSettings?.siteDescription || "Directeur Artistique & AI Visual Designer";
  const url = `https://yassirai.com/${lang}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: data.siteSettings?.siteName || "YassirAI",
      locale: lang,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
      languages: {
        fr: "https://yassirai.com/fr",
        en: "https://yassirai.com/en",
        ar: "https://yassirai.com/ar",
      },
    },
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.bio?.name || "Yassir Mellakh",
    jobTitle: data.bio?.title || "Creative Director & AI Visual Designer",
    url: `https://yassirai.com/${locale}`,
    sameAs: data.contacts?.filter((c: { type: string }) => c.type === "social").map((c: { value: string }) => c.value) || [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Analytics page={`/${locale}`} lang={locale} />
      <Navbar locale={locale} siteName={siteName} />
      <main id="main-content" tabIndex={-1}>
        <Hero locale={locale} bio={data.bio} videos={data.heroVideos} />
        {data.bio && <About locale={locale} bio={data.bio} />}
        {data.services.length > 0 && <Services locale={locale} services={data.services} />}
        {data.projects.length > 0 && <Projects locale={locale} projects={data.projects} categories={data.projectCategories} />}
        <Templates locale={locale} templates={data.templates} categories={data.templateCategories} />
        <Contact locale={locale} contacts={data.contacts} />
      </main>
      <Footer locale={locale} bio={data.bio} siteName={siteName} />
    </>
  );
}
