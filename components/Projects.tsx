"use client";
import { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { t, isRtl, type Locale } from "@/lib/i18n";
import type { Project } from "@/lib/api";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal } from "./ScrollReveal";
import { MagneticButton } from "./MagneticButton";
import { trackEvent } from "./Analytics";

const statusColors: Record<string, string> = {
  EN_COURS: "text-accent bg-accent/10 border-accent/20",
  PLANIFIE: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  TERMINE: "text-success bg-success/10 border-success/20",
  EN_PAUSE: "text-muted bg-surface-hover border-border",
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  all: { fr: "Tout", en: "All", ar: "الكل" },
  web: { fr: "Web", en: "Web", ar: "ويب" },
  ai: { fr: "IA", en: "AI", ar: "ذكاء اصطناعي" },
  design: { fr: "Design", en: "Design", ar: "تصميم" },
  mobile: { fr: "Mobile", en: "Mobile", ar: "موبايل" },
};

export function Projects({ locale, projects, categories }: { locale: Locale; projects: Project[]; categories?: string[] }) {
  const rtl = isRtl(locale);
  const CATEGORIES = ["all", ...(categories && categories.length > 0 ? categories : [])];
  const [activeCategory, setActiveCategory] = useState("all");
  const hasCategories = CATEGORIES.length > 1;

  const filtered = activeCategory === "all"
    ? projects
    : projects.filter((p) => p.category === activeCategory);

  return (
    <section id="projects" className="py-32 sm:py-40 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <SectionHeading
          title={t.projects_title[locale]}
          subtitle={t.projects_subtitle[locale]}
        />

        {hasCategories && (
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <LayoutGroup>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="relative px-5 py-2 text-sm font-medium rounded-full transition-colors"
                >
                  {activeCategory === cat && (
                    <motion.div
                      layoutId="proj-cat-pill"
                      className="absolute inset-0 bg-accent rounded-full"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span
                    className={`relative z-10 ${
                      activeCategory === cat ? "text-white" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {CATEGORY_LABELS[cat]?.[locale] || cat}
                  </span>
                </button>
              ))}
            </LayoutGroup>
          </div>
        )}

        <div className="space-y-8">
          {filtered.map((project, i) => {
            const statusKey = `status_${project.status}` as keyof typeof t;
            const statusLabel = t[statusKey]?.[locale] || project.status;
            const colors = statusColors[project.status] || statusColors.EN_COURS;
            const isInProgress = project.status === "EN_COURS" || project.status === "IN_PROGRESS";

            return (
              <ScrollReveal key={project.id} variant="scaleUp" delay={i * 0.1}>
                <div className="glass rounded-2xl p-8 sm:p-10 transition-all duration-500 hover:translate-y-[-2px]">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <a href={`/${locale}/projects/${project.slug}`} className="text-xl sm:text-2xl font-semibold tracking-tight hover:text-accent transition-colors">
                      {project.name}
                    </a>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${colors}`}
                    >
                      {isInProgress && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
                      )}
                      {statusLabel}
                    </span>
                  </div>

                  {project.stack && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.stack.split(",").map((tech) => (
                        <span
                          key={tech.trim()}
                          className="px-2.5 py-1 rounded-md text-xs font-mono text-accent/80 bg-accent/5 border border-accent/10"
                        >
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {project.description && (
                    <p className="text-base text-muted leading-relaxed mb-6 max-w-3xl">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    <a
                      href={`/${locale}/projects/${project.slug}`}
                      className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
                    >
                      {t.projects_details[locale]}
                      <svg
                        className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${rtl ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                    {project.url && (
                      <MagneticButton
                        href={project.url}
                        onClick={() => trackEvent(project.slug, "project", locale)}
                        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
                      >
                        {t.projects_view[locale]}
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </MagneticButton>
                    )}
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                        </svg>
                        Demo
                      </a>
                    )}
                  </div>
                </div>

                {/* Self-drawing separator */}
                {i < filtered.length - 1 && (
                  <div className="mt-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                )}
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
