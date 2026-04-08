import { fetchPortfolio } from "@/lib/api";
import { locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { ProjectDetail } from "@/components/ProjectDetail";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const params: { lang: string; slug: string }[] = [];
  for (const lang of locales) {
    const data = await fetchPortfolio(lang);
    for (const project of data.projects) {
      params.push({ lang, slug: project.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const data = await fetchPortfolio(lang as Locale);
  const project = data.projects.find((p) => p.slug === slug);
  if (!project) return { title: "Project not found" };

  const title = `${project.name} — ${data.siteSettings?.siteName || "YassirAI"}`;
  const description = project.description || data.siteSettings?.siteDescription || "";
  const url = `https://yassirai.com/${lang}/projects/${slug}`;
  const image = project.screenshots?.[0] || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: data.siteSettings?.siteName || "YassirAI",
      locale: lang,
      type: "article",
      ...(image && { images: [{ url: image, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://yassirai.com/${l}/projects/${slug}`])
      ),
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const data = await fetchPortfolio(locale);
  const project = data.projects.find((p) => p.slug === slug);

  if (!project) notFound();

  const siteName = data.siteSettings?.siteName;

  return (
    <>
      <Analytics page={`/${locale}/projects/${slug}`} lang={locale} />
      <Navbar locale={locale} siteName={siteName} />
      <main id="main-content" tabIndex={-1} className="pt-24 pb-32">
        <ProjectDetail locale={locale} project={project} />
      </main>
      <Footer locale={locale} bio={data.bio} siteName={siteName} />
    </>
  );
}
