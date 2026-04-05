import { t, type Locale } from "@/lib/i18n";
import type { Project } from "@/lib/api";

const statusColors: Record<string, string> = {
  EN_COURS: "text-accent bg-accent/10",
  PLANIFIE: "text-amber-400 bg-amber-400/10",
  TERMINE: "text-success bg-success/10",
  EN_PAUSE: "text-muted bg-surface-hover",
};

export function Projects({ locale, projects }: { locale: Locale; projects: Project[] }) {
  return (
    <section id="projects" className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t.projects_title[locale]}
          </h2>
          <p className="text-muted text-base sm:text-lg">{t.projects_subtitle[locale]}</p>
          <div className="w-16 h-1 bg-accent rounded-full mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const statusKey = `status_${project.status}` as keyof typeof t;
            const statusLabel = t[statusKey]?.[locale] || project.status;
            const colors = statusColors[project.status] || statusColors.EN_COURS;

            return (
              <div
                key={project.id}
                className="group bg-surface border border-border rounded-2xl p-6 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold leading-tight">{project.name}</h3>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${colors}`}>
                    {statusLabel}
                  </span>
                </div>

                {project.stack && (
                  <p className="text-xs text-accent/80 mb-2 font-mono">{project.stack}</p>
                )}

                {project.description && (
                  <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-3 flex-1">{project.description}</p>
                )}

                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors mt-auto"
                  >
                    {t.projects_view[locale]}
                    <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
