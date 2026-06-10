"use client";
import { useRef, useState, useEffect, useCallback } from "react";
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

// Local lightweight posters (≤44 KB webp) generated from the hero clips. The
// poster is plain <img> (no Framer Motion, no next/image optimizer) so it is in
// the SSR HTML and paints at FCP — it is the LCP, never gated by JS hydration.
const KNOWN_POSTERS = new Set(["action", "cars", "gladiator"]);
function posterFor(url: string): string | undefined {
  const m = url.match(/\/([^/]+)\.(?:mp4|webm|mov)(?:\?|#|$)/i);
  if (m && KNOWN_POSTERS.has(m[1])) return `/hero/${m[1]}.webp`;
  return undefined;
}

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
  const [animate, setAnimate] = useState(false);   // crossfade ONLY after the first slide change; slide 0 paints instantly (= LCP, never JS-gated)
  const [loadVideo, setLoadVideo] = useState(false); // defer heavy video, desktop only
  const [isDesktop, setIsDesktop] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>>(null);

  const goTo = useCallback((index: number) => { setAnimate(true); setCurrent(index); setProgress(0); }, []);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo, slides.length]);

  // Detect desktop (≥768px). Mobile keeps the poster only — never downloads the
  // heavy hero video (the #1 LCP/data cost on cellular).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches && !reduce);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Defer video loading on desktop only: never compete with the poster (LCP).
  useEffect(() => {
    if (!isDesktop) { setLoadVideo(false); return; }
    setLoadVideo(false);
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idle = 0;
    let to: ReturnType<typeof setTimeout> | null = null;
    if (w.requestIdleCallback) idle = w.requestIdleCallback(() => setLoadVideo(true), { timeout: 1500 });
    else to = setTimeout(() => setLoadVideo(true), 600);
    return () => { if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle); if (to) clearTimeout(to); };
  }, [current, isDesktop]);

  // Auto-advance timer
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      setProgress(Math.min((Date.now() - startTime) / SLIDE_DURATION, 1));
    }, 50);
    timerRef.current = setTimeout(() => { setAnimate(true); setCurrent((c) => (c + 1) % slides.length); }, SLIDE_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [current, slides.length]);

  const slide = slides[current];
  const poster = slide.type === "video" ? posterFor(slide.url) : undefined;

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#09090b]">
      {/* Media layer — plain HTML (no Framer Motion / no next/image optimizer):
          the poster is in the SSR HTML and is the LCP, painted at first paint. */}
      <div
        key={current}
        className={`absolute inset-0 ${animate ? "hero-fade" : ""}`}
      >
        {slide.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.url} alt="" fetchPriority={current === 0 ? "high" : "auto"} className="w-full h-full object-cover" />
        ) : (
          <>
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt=""
                fetchPriority={current === 0 ? "high" : "auto"}
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[#09090b]" />
            )}
            {loadVideo && (
              <video
                src={slide.url}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                poster={poster}
                onCanPlay={(e) => { e.currentTarget.style.opacity = "1"; }}
                className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700"
              />
            )}
          </>
        )}
      </div>

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />

      {/* Content — plain HTML, visible at first paint (the <h1> is not JS-gated) */}
      <div className="relative z-10 h-full flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6">
        <div key={current} className={animate ? "hero-fade-up" : ""}>
          {(() => {
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
                <p className="text-sm sm:text-base text-white/60 mb-4 tracking-widest uppercase">{greeting}</p>
                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white leading-[0.9] mb-4">
                  {displayName}
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-white/70 font-light mb-6 max-w-2xl">{displayTitle}</p>
                {displayText && (
                  <p className="text-sm sm:text-base text-white/50 max-w-xl mb-8 leading-relaxed">{displayText}</p>
                )}
                {(showBtn1 || showBtn2) && (
                  <div className="flex flex-wrap items-center gap-4">
                    {showBtn1 && (
                      <MagneticButton href={btn1Link} className="px-8 py-4 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors">
                        {btn1Label}
                        <svg className={`w-4 h-4 ${rtl ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </MagneticButton>
                    )}
                    {showBtn2 && (
                      <MagneticButton href={btn2Link} className="px-8 py-4 text-sm font-medium text-white/80 border border-white/20 hover:border-white/40 hover:text-white rounded-full transition-all">
                        {btn2Label}
                      </MagneticButton>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Bottom bar — navigation + progress */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={prev} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-all" aria-label="Previous">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={next} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-all" aria-label="Next">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="flex-1 flex items-center gap-3">
              {slides.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} className="flex-1 group" aria-label={`Slide ${i + 1}`}>
                  <div className="h-0.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: i === current ? `${progress * 100}%` : i < current ? "100%" : "0%" }} />
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
