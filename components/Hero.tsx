"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { t, isRtl, type Locale } from "@/lib/i18n";
import type { Bio, HeroVideo } from "@/lib/api";
import { MagneticButton } from "./MagneticButton";

const R2 = "https://pub-9c404a6a434c4363be2c253e38e6c8d7.r2.dev";
const FALLBACK_SLIDES: { url: string; type: "video" | "image" }[] = [
  { url: `${R2}/videos/action.mp4`, type: "video" },
  { url: `${R2}/videos/cars.mp4`, type: "video" },
  { url: `${R2}/videos/gladiator.mp4`, type: "video" },
];
const SLIDE_DURATION = 8000;

type Slide = {
  url: string;
  type: "video" | "image";
  greeting?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  btn1Text?: string | null;
  btn1Href?: string | null;
  btn1Visible?: boolean;
  btn2Text?: string | null;
  btn2Href?: string | null;
  btn2Visible?: boolean;
};

export function Hero({ locale, bio, videos }: { locale: Locale; bio: Bio | null; videos?: HeroVideo[] }) {
  const slides: Slide[] = videos && videos.length > 0
    ? videos.map((v) => ({
        url: v.url,
        type: (v.type || "video") as "video" | "image",
        greeting: v.greeting, title: v.title, subtitle: v.subtitle, description: v.description,
        btn1Text: v.btn1Text, btn1Href: v.btn1Href, btn1Visible: v.btn1Visible,
        btn2Text: v.btn2Text, btn2Href: v.btn2Href, btn2Visible: v.btn2Visible,
      }))
    : FALLBACK_SLIDES;
  const bioName = bio?.name || "Yassir Mellakh";
  const bioTitle = bio?.title || "Creative Director | AI Visual Designer";
  const bioHeroText = bio?.heroText || "";
  const rtl = isRtl(locale);

  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>>(null);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setProgress(0);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, goTo]);

  // Auto-advance timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    setProgress(0);
    const startTime = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / SLIDE_DURATION, 1));
    }, 50);

    timerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, SLIDE_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [current]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Video layers */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {slides[current].type === "image" ? (
            <img
              src={slides[current].url}
              alt={`Slide ${current + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={slides[current].url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {(() => {
              const slide = slides[current];
              const greeting = slide.greeting || t.hero_greeting[locale];
              const displayName = slide.title || bioName;
              const displayTitle = slide.subtitle || bioTitle;
              const displayText = slide.description || bioHeroText;
              const showBtn1 = slide.btn1Visible !== false;
              const showBtn2 = slide.btn2Visible !== false;
              const btn1Label = slide.btn1Text || t.hero_cta[locale];
              const btn1Link = slide.btn1Href || "#projects";
              const btn2Label = slide.btn2Text || t.hero_contact[locale];
              const btn2Link = slide.btn2Href || "#contact";

              return (
                <>
                  {/* Greeting */}
                  <p className="text-sm sm:text-base text-white/60 mb-4 tracking-widest uppercase">
                    {greeting}
                  </p>

                  {/* Name */}
                  <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white leading-[0.9] mb-4">
                    {displayName}
                  </h1>

                  {/* Title */}
                  <p className="text-lg sm:text-xl md:text-2xl text-white/70 font-light mb-6 max-w-2xl">
                    {displayTitle}
                  </p>

                  {/* Hero text */}
                  {displayText && (
                    <p className="text-sm sm:text-base text-white/50 max-w-xl mb-8 leading-relaxed">
                      {displayText}
                    </p>
                  )}

                  {/* CTAs */}
                  {(showBtn1 || showBtn2) && (
                    <div className="flex flex-wrap items-center gap-4">
                      {showBtn1 && (
                        <MagneticButton
                          href={btn1Link}
                          className="px-8 py-4 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors"
                        >
                          {btn1Label}
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
                      )}

                      {showBtn2 && (
                        <MagneticButton
                          href={btn2Link}
                          className="px-8 py-4 text-sm font-medium text-white/80 border border-white/20 hover:border-white/40 hover:text-white rounded-full transition-all"
                        >
                          {btn2Label}
                        </MagneticButton>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar — navigation + progress */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
          <div className="flex items-center gap-4">
            {/* Nav arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-all"
                aria-label="Previous"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={next}
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-all"
                aria-label="Next"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Progress indicators */}
            <div className="flex-1 flex items-center gap-3">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="flex-1 group"
                >
                  <div className="h-0.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{
                        width:
                          i === current
                            ? `${progress * 100}%`
                            : i < current
                              ? "100%"
                              : "0%",
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
