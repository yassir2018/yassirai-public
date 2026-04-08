"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { t, isRtl, type Locale } from "@/lib/i18n";
import type { Project } from "@/lib/api";
import { ScrollReveal } from "./ScrollReveal";
import { MagneticButton } from "./MagneticButton";

const statusColors: Record<string, string> = {
  EN_COURS: "text-accent bg-accent/10 border-accent/20",
  PLANIFIE: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  TERMINE: "text-success bg-success/10 border-success/20",
  EN_PAUSE: "text-muted bg-surface-hover border-border",
};

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

function getYouTubeEmbedUrl(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

export function ProjectDetail({ locale, project }: { locale: Locale; project: Project }) {
  const rtl = isRtl(locale);
  const statusKey = `status_${project.status}` as keyof typeof t;
  const statusLabel = t[statusKey]?.[locale] || project.status;
  const colors = statusColors[project.status] || statusColors.EN_COURS;
  const isInProgress = project.status === "EN_COURS" || project.status === "IN_PROGRESS";

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((i: number) => setLightboxIndex(i), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(() => {
    setLightboxIndex((i) =>
      i !== null ? (i - 1 + project.screenshots.length) % project.screenshots.length : null
    );
  }, [project.screenshots.length]);
  const nextImage = useCallback(() => {
    setLightboxIndex((i) =>
      i !== null ? (i + 1) % project.screenshots.length : null
    );
  }, [project.screenshots.length]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Back button */}
      <ScrollReveal>
        <a
          href={`/${locale}#projects`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8"
        >
          <svg
            className={`w-4 h-4 ${rtl ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t.back_to_projects[locale]}
        </a>
      </ScrollReveal>

      {/* Header */}
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter">
            {project.name}
          </h1>
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border ${colors}`}
          >
            {isInProgress && (
              <span className="w-2 h-2 rounded-full bg-current animate-pulse-dot" />
            )}
            {statusLabel}
          </span>
        </div>
      </ScrollReveal>

      {/* Stack tags */}
      {project.stack && (
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap gap-2 mb-8">
            {project.stack.split(",").map((tech) => (
              <span
                key={tech.trim()}
                className="px-3 py-1.5 rounded-lg text-sm font-mono text-accent/80 bg-accent/5 border border-accent/10"
              >
                {tech.trim()}
              </span>
            ))}
          </div>
        </ScrollReveal>
      )}

      {/* Description */}
      {project.description && (
        <ScrollReveal delay={0.15}>
          <div className="glass rounded-2xl p-8 sm:p-10 mb-8">
            <p className="text-base sm:text-lg text-muted leading-relaxed whitespace-pre-line">
              {project.description}
            </p>
          </div>
        </ScrollReveal>
      )}

      {/* Screenshots gallery */}
      {project.screenshots && project.screenshots.length > 0 && (
        <ScrollReveal delay={0.2}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-white/80">
              {t.project_screenshots[locale]}
            </h2>
            <div className={`grid gap-4 ${project.screenshots.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {project.screenshots.map((url, i) => (
                <button
                  key={i}
                  onClick={() => openLightbox(i)}
                  className="relative group rounded-xl overflow-hidden border border-white/5 hover:border-accent/30 transition-all cursor-pointer"
                >
                  <img
                    src={url}
                    alt={`${project.name} screenshot ${i + 1}`}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Video */}
      {project.videoUrl && (
        <ScrollReveal delay={0.25}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-white/80">
              {t.project_video[locale]}
            </h2>
            <div className="rounded-xl overflow-hidden border border-white/5">
              {isYouTubeUrl(project.videoUrl) ? (
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={getYouTubeEmbedUrl(project.videoUrl)}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              ) : (
                <video
                  src={project.videoUrl}
                  controls
                  playsInline
                  className="w-full"
                  poster={project.screenshots?.[0] || undefined}
                />
              )}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Action links */}
      <ScrollReveal delay={0.3}>
        <div className="flex flex-wrap items-center gap-4">
          {project.url && (
            <MagneticButton
              href={project.url}
              className="px-6 py-3 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors"
            >
              {t.project_visit[locale]}
              <svg
                className={`w-4 h-4 ${rtl ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </MagneticButton>
          )}
          {project.demoUrl && (
            <MagneticButton
              href={project.demoUrl}
              className="px-6 py-3 text-sm font-medium text-white/80 border border-white/20 hover:border-white/40 hover:text-white rounded-full transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
              {t.project_demo[locale]}
            </MagneticButton>
          )}
          {project.repo && (
            <MagneticButton
              href={project.repo}
              className="px-6 py-3 text-sm font-medium text-white/80 border border-white/20 hover:border-white/40 hover:text-white rounded-full transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              {t.project_repo[locale]}
            </MagneticButton>
          )}
        </div>
      </ScrollReveal>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation */}
            {project.screenshots.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image */}
            <motion.img
              key={lightboxIndex}
              src={project.screenshots[lightboxIndex]}
              alt={`${project.name} screenshot ${lightboxIndex + 1}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {lightboxIndex + 1} / {project.screenshots.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
