"use client";
import { motion } from "framer-motion";
import { t, type Locale } from "@/lib/i18n";
import type { Bio } from "@/lib/api";

export function Footer({ locale, bio }: { locale: Locale; bio: Bio | null }) {
  const name = bio?.name || "YassirAI";
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative pt-16 pb-8">
      {/* Gradient separator */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 max-w-xl h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Logo centered */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-3xl font-bold tracking-tight gradient-text">YassirAI</span>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            &copy; {year} {name}. {t.footer_rights[locale]}
          </p>

          {/* Back to top */}
          <button
            onClick={scrollToTop}
            className="group flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-y-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {t.footer_top[locale]}
          </button>
        </div>
      </div>
    </footer>
  );
}
