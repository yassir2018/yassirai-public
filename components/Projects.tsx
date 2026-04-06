"use client";
import { t, isRtl, type Locale } from "@/lib/i18n";
import type { Project } from "@/lib/api";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal } from "./ScrollReveal";
import { MagneticButton } from "./MagneticButton";

const statusColors: Record<string, string> = {
  EN_COURS: "text-accent bg-accent/10 border-accent/20",
  PLANIFIE: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  TERMINE: "text-success bg-success/10 border-success/20",
  EN_PAUSE: "text-muted bg-surface-hover border-border",
};

export function Projects({ locale, projects }: { locale: Locale; projects: Project[] }) {
  const rtl = isRtl(locale);

  return (
    <section id="projects" className="py-32 sm:py-40 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <SectionHeading
          title={t.projects_title[locale]}
          subtitle={t.projects_subtitle[locale]}
        />

        <div className="space-y-8">
          {projects.map((project, i) => {
            const statusKey = `status_${project.status}` as keyof typeof t;
            const statusLabel = t[statusKey]?.[locale] || project.status;
            const colors = statusColors[project.status] || statusColors.EN_COURS;
            const isInProgress = project.status === "EN_COURS" || project.status === "IN_PROGRESS";

            return (
              <ScrollReveal key={project.id} variant="scaleUp" delay={i * 0.1}>
                <div className="glass rounded-2xl p-8 sm:p-10 transition-all duration-500 hover:translate-y-[-2px]">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">
                      {project.name}
                    </h3>
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
                    {project.url && (
                      <MagneticButton
                        href={project.url}
                        className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
                      >
                        {t.projects_view[locale]}
                        <svg
                          className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${rtl ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
                {i < projects.length - 1 && (
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
