"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { locales, isRtl, t, type Locale } from "@/lib/i18n";

const langLabels: Record<Locale, string> = { fr: "FR", en: "EN", ar: "AR" };

export function Navbar({ locale, siteName }: { locale: Locale; siteName?: string }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rtl = isRtl(locale);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(latest > 100 && latest > prev);
    setScrolled(latest > 50);
  });

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const links = [
    { href: "#about", label: t.nav_about[locale] },
    { href: "#services", label: t.nav_services[locale] },
    { href: "#projects", label: t.nav_projects[locale] },
    { href: "#contact", label: t.nav_contact[locale] },
  ];

  return (
    <>
      <motion.nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/60 backdrop-blur-2xl border-b border-border/50"
            : "bg-transparent"
        }`}
        initial={{ y: 0 }}
        animate={{ y: hidden ? -100 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">
            <span className="gradient-text">{siteName || "YassirAI"}</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-muted hover:text-foreground transition-colors relative group"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 w-0 group-hover:w-full h-px bg-accent transition-all duration-300" />
              </a>
            ))}

            {/* Language switcher with animated pill */}
            <div className="flex items-center gap-0.5 ms-4 p-1 bg-surface/50 rounded-full border border-border/50">
              {locales.map((l) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  className="relative px-3 py-1.5 text-xs font-medium rounded-full transition-colors z-10"
                >
                  {l === locale && (
                    <motion.div
                      layoutId="lang-pill"
                      className="absolute inset-0 bg-accent rounded-full"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span className={`relative z-10 ${l === locale ? "text-white" : "text-muted hover:text-foreground"}`}>
                    {langLabels[l]}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-muted hover:text-foreground z-50 relative"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setOpen(false)} />

            {/* Panel */}
            <motion.div
              className={`absolute top-0 ${rtl ? "left-0" : "right-0"} w-4/5 max-w-sm h-full bg-background/95 border-${rtl ? "e" : "s"} border-border`}
              initial={{ x: rtl ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: rtl ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="pt-20 px-8 space-y-6">
                {links.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block text-2xl font-light text-muted hover:text-foreground transition-colors"
                    initial={{ opacity: 0, x: rtl ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    {l.label}
                  </motion.a>
                ))}

                <motion.div
                  className="flex items-center gap-2 pt-6 border-t border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {locales.map((l) => (
                    <Link
                      key={l}
                      href={`/${l}`}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                        l === locale
                          ? "bg-accent text-white"
                          : "text-muted bg-surface hover:text-foreground"
                      }`}
                    >
                      {langLabels[l]}
                    </Link>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
