"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { t, isRtl, type Locale } from "@/lib/i18n";
import type { Bio } from "@/lib/api";
import { TextReveal } from "./TextReveal";
import { MagneticButton } from "./MagneticButton";

export function Hero({ locale, bio }: { locale: Locale; bio: Bio | null }) {
  const name = bio?.name || "Yassir";
  const title = bio?.title || "Developer & Designer";
  const heroText = bio?.heroText || "";
  const rtl = isRtl(locale);

  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Gradient orbs — pure CSS animations */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: orbY }}>
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-500/15 blur-[120px] animate-orb-1" />
        <div className="absolute top-[40%] right-[15%] w-[400px] h-[400px] rounded-full bg-purple-500/12 blur-[100px] animate-orb-2" />
        <div className="absolute bottom-[20%] left-[40%] w-[350px] h-[350px] rounded-full bg-pink-500/10 blur-[80px] animate-orb-3" />
        <div className="absolute top-[60%] left-[10%] w-[250px] h-[250px] rounded-full bg-cyan-500/8 blur-[90px] animate-orb-2" />
        <div className="absolute top-[10%] right-[30%] w-[300px] h-[300px] rounded-full bg-violet-500/10 blur-[110px] animate-orb-3" />
      </motion.div>

      {/* Dot grid layer */}
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

      {/* Content */}
      <motion.div
        className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-10"
        style={{ y: contentY, opacity }}
      >
        {/* Greeting */}
        <motion.p
          className="text-sm sm:text-base text-muted mb-6 tracking-widest uppercase"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t.hero_greeting[locale]}
        </motion.p>

        {/* Name — massive */}
        <h1 className="text-6xl sm:text-8xl md:text-[10rem] font-bold tracking-tighter leading-[0.85] mb-6">
          <TextReveal text={name} delay={0.4} />
        </h1>

        {/* Title */}
        <motion.p
          className="text-xl sm:text-2xl md:text-3xl text-muted font-light mb-8 text-balance"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {title}
        </motion.p>

        {/* Hero text */}
        {heroText && (
          <motion.p
            className="text-base sm:text-lg text-muted/70 max-w-2xl mx-auto mb-12 leading-relaxed text-balance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            {heroText}
          </motion.p>
        )}

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <MagneticButton
            href="#projects"
            className="px-8 py-4 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors"
          >
            {t.hero_cta[locale]}
            <svg
              className={`w-4 h-4 ${rtl ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </MagneticButton>

          <MagneticButton
            href="#contact"
            className="px-8 py-4 text-sm font-medium text-muted border border-border hover:border-foreground/20 hover:text-foreground rounded-full transition-all"
          >
            {t.hero_contact[locale]}
          </MagneticButton>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        style={{ opacity }}
      >
        <motion.div
          className="w-5 h-8 rounded-full border border-muted/30 flex justify-center pt-1.5"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-2 rounded-full bg-muted/50"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
