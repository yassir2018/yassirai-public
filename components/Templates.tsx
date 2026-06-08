"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { t, isRtl, type Locale } from "@/lib/i18n";
import type { Template } from "@/lib/api";
import { trackEvent } from "./Analytics";

const CATEGORY_LABELS: Record<string, Record<Locale, string>> = {
  agency: { fr: "Agence", en: "Agency", ar: "وكالة" },
  saas: { fr: "SaaS", en: "SaaS", ar: "ساس" },
  ai: { fr: "IA / Tech", en: "AI / Tech", ar: "ذكاء اصطناعي" },
  hospitality: { fr: "Hôtellerie", en: "Hospitality", ar: "ضيافة" },
  ecommerce: { fr: "E-commerce", en: "E-commerce", ar: "تجارة" },
  portfolio: { fr: "Portfolio", en: "Portfolio", ar: "بورتفوليو" },
  corporate: { fr: "Corporate", en: "Corporate", ar: "شركات" },
  web3: { fr: "Web3", en: "Web3", ar: "ويب3" },
  // legacy keys (older CMS entries)
  creative: { fr: "Créatif", en: "Creative", ar: "إبداعي" },
  food: { fr: "Restaurant", en: "Restaurant", ar: "مطعم" },
  entertainment: { fr: "Média", en: "Media", ar: "إعلام" },
};

type SortKey = "featured" | "name" | "price_asc" | "price_desc";
type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, string> = { desktop: "100%", tablet: "820px", mobile: "390px" };

function catLabel(cat: string | null, locale: Locale): string {
  if (!cat) return "";
  return CATEGORY_LABELS[cat]?.[locale] || cat.charAt(0).toUpperCase() + cat.slice(1);
}
function priceLabel(tmpl: Template): string | null {
  if (tmpl.price == null || tmpl.price <= 0) return null;
  return `${tmpl.price} ${tmpl.currency || "MAD"}`;
}
function tier(tmpl: Template): "Premium" | "Pro" | null {
  if (tmpl.price == null || tmpl.price <= 0) return null;
  return tmpl.price >= 500 ? "Premium" : "Pro";
}

const DEVICE_ICON: Record<Device, string> = {
  desktop: "M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v7.5A2.25 2.25 0 0118 15.75H6a2.25 2.25 0 01-2.25-2.25V6zM9 20.25h6",
  tablet: "M10.5 19.5h3M6.75 3.75h10.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z",
  mobile: "M10.5 18.75h3M8.25 3.75h7.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z",
};

export function Templates({ locale, templates, categories }: { locale: Locale; templates: Template[]; categories?: string[] }) {
  const rtl = isRtl(locale);
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [active, setActive] = useState<Template | null>(null);
  const [device, setDevice] = useState<Device>("desktop");

  // Featured = the 3 lowest sortOrder
  const topIds = useMemo(
    () => new Set([...templates].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 3).map((x) => x.id)),
    [templates],
  );

  const cats = useMemo(() => {
    const derived = categories && categories.length
      ? categories
      : ([...new Set(templates.map((x) => x.category).filter(Boolean))] as string[]);
    return ["all", ...derived];
  }, [templates, categories]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: templates.length };
    for (const x of templates) if (x.category) m[x.category] = (m[x.category] || 0) + 1;
    return m;
  }, [templates]);

  const filtered = useMemo(() => {
    let list = activeCategory === "all" ? templates : templates.filter((x) => x.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          (x.description || "").toLowerCase().includes(q) ||
          (x.features || []).some((f) => f.toLowerCase().includes(q)),
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "name": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "price_asc": sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case "price_desc": sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      default: sorted.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return sorted;
  }, [templates, activeCategory, query, sort]);

  const openPreview = useCallback(
    (tmpl: Template) => {
      if (!tmpl.previewUrl) return;
      setDevice("desktop");
      setActive(tmpl);
      trackEvent(tmpl.slug, "template", locale);
    },
    [locale],
  );

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [active]);

  if (templates.length === 0) return null;

  const marquee = templates.filter((x) => x.thumbnailUrl || x.previewUrl);
  const marqueeItems = [...marquee, ...marquee];
  const catWord = { fr: "catégories", en: "categories", ar: "فئات" }[locale];
  const srcWord = { fr: "code source inclus", en: "source code included", ar: "الكود المصدري مضمّن" }[locale];

  const Thumb = ({ tmpl }: { tmpl: Template }) =>
    tmpl.thumbnailUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tmpl.thumbnailUrl}
        alt={tmpl.name}
        loading="lazy"
        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
      />
    ) : tmpl.previewUrl ? (
      <iframe
        src={tmpl.previewUrl}
        title={tmpl.name}
        loading="lazy"
        sandbox="allow-same-origin"
        className="w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#7c3aed]/15 to-[#d946ef]/10">
        <span className="text-3xl font-black text-[#7c3aed]/40">{tmpl.name.charAt(0)}</span>
      </div>
    );

  const Badges = ({ tmpl }: { tmpl: Template }) => {
    const tr = tier(tmpl);
    return (
      <>
        {topIds.has(tmpl.id) && (
          <span className="absolute top-3 start-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-white bg-[#7c3aed] shadow-lg shadow-[#7c3aed]/30">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M11.48 3.5a.6.6 0 011.04 0l2.34 4.74 5.23.76a.6.6 0 01.33 1.02l-3.78 3.69.9 5.2a.6.6 0 01-.87.64L12 17.9l-4.67 2.46a.6.6 0 01-.87-.64l.9-5.2-3.79-3.69a.6.6 0 01.33-1.02l5.23-.76L11.48 3.5z" /></svg>
            {t.templates_top[locale]}
          </span>
        )}
        {tr && (
          <span
            className={`absolute top-3 end-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md ${
              tr === "Premium" ? "text-white bg-[#09090b]/70 border border-white/15" : "text-[#09090b] bg-white/85 border border-black/5"
            }`}
          >
            {tr}
          </span>
        )}
      </>
    );
  };

  const FeaturePills = ({ tmpl }: { tmpl: Template }) =>
    tmpl.features && tmpl.features.length > 0 ? (
      <div className="flex flex-wrap gap-1.5 mt-3">
        {tmpl.features.slice(0, 3).map((f) => (
          <span key={f} className="px-2 py-0.5 rounded-md text-[11px] text-[#52525b] bg-[#f0f0f2] border border-[#e4e4e7]">
            {f}
          </span>
        ))}
        {tmpl.features.length > 3 && <span className="px-1.5 py-0.5 text-[11px] text-[#a1a1aa]">+{tmpl.features.length - 3}</span>}
      </div>
    ) : null;

  const Actions = ({ tmpl }: { tmpl: Template }) => {
    const price = priceLabel(tmpl);
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        {price ? (
          <span className="text-sm font-bold text-[#09090b]">{price}</span>
        ) : (
          <span className="text-sm font-semibold text-[#16a34a]">{locale === "fr" ? "Gratuit" : locale === "ar" ? "مجاني" : "Free"}</span>
        )}
        <div className="flex items-center gap-2">
          {tmpl.previewUrl && (
            <button
              onClick={() => openPreview(tmpl)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full text-[#09090b] bg-white border border-[#e4e4e7] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors cursor-pointer"
            >
              {t.templates_preview[locale]}
            </button>
          )}
          {tmpl.saleUrl && (
            <a
              href={tmpl.saleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full text-white bg-[#7c3aed] hover:bg-[#8b5cf6] transition-colors"
            >
              {t.templates_buy[locale]}
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <section id="templates" className="relative">
        {/* ── DARK intro + marquee ─────────────────────────── */}
        <div className="relative bg-[#09090b] text-[#fafafa] pt-24 sm:pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 grid-pattern" aria-hidden />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[320px] violet-glow opacity-60" aria-hidden />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-[#c4b5fd] bg-[#7c3aed]/15 border border-[#7c3aed]/30"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse-dot" />
              {t.templates_eyebrow[locale]}
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
            >
              {t.templates_title[locale]}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-base sm:text-lg text-[#a1a1aa] max-w-2xl mx-auto text-balance"
            >
              {t.templates_subtitle[locale]}
            </motion.p>

            {/* stats */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#a1a1aa]">
              <span className="inline-flex items-center gap-2">
                <strong className="text-white text-lg font-bold tabular-nums">{templates.length}</strong>
                {t.templates_count_many[locale]}
              </span>
              <span className="w-px h-4 bg-[#27272a]" aria-hidden />
              <span className="inline-flex items-center gap-2">
                <strong className="text-white text-lg font-bold tabular-nums">{cats.length - 1}</strong>
                {catWord}
              </span>
              <span className="w-px h-4 bg-[#27272a]" aria-hidden />
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                {srcWord}
              </span>
            </div>
          </div>

          {/* marquee */}
          {marquee.length > 0 && (
            <div className="relative mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
              <div className="marquee-track gap-4 px-2">
                {marqueeItems.map((tmpl, i) => (
                  <button
                    key={`${tmpl.id}-${i}`}
                    onClick={() => openPreview(tmpl)}
                    aria-label={tmpl.name}
                    className="group relative shrink-0 w-72 aspect-video rounded-xl overflow-hidden border border-[#27272a] bg-[#18181b] cursor-pointer"
                  >
                    <Thumb tmpl={tmpl} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute bottom-2 start-3 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {tmpl.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── LIGHT grid area ──────────────────────────────── */}
        <div className="bg-[#f7f7f8] text-[#09090b] py-14 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              <LayoutGroup>
                {cats.map((cat) => {
                  const isActive = activeCategory === cat;
                  const label = cat === "all" ? t.templates_all[locale] : catLabel(cat, locale);
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="relative shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="tmpl-tab"
                          className="absolute inset-0 bg-[#7c3aed] rounded-full"
                          transition={{ type: "spring", damping: 26, stiffness: 320 }}
                        />
                      )}
                      <span className={`relative z-10 inline-flex items-center gap-1.5 ${isActive ? "text-white" : "text-[#52525b] hover:text-[#09090b]"}`}>
                        {label}
                        <span className={`text-[11px] tabular-nums ${isActive ? "text-white/70" : "text-[#a1a1aa]"}`}>{counts[cat] ?? 0}</span>
                      </span>
                    </button>
                  );
                })}
              </LayoutGroup>
            </div>

            {/* toolbar */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <svg className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-[#a1a1aa] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m2.2-5.3a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.templates_search[locale]}
                  className="w-full ps-10 pe-4 py-2.5 rounded-full bg-white border border-[#e4e4e7] text-sm text-[#09090b] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-[#71717a] whitespace-nowrap tabular-nums">
                  {filtered.length} {filtered.length === 1 ? t.templates_count_one[locale] : t.templates_count_many[locale]}
                </span>

                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    aria-label={t.templates_sort_label[locale]}
                    className="appearance-none ps-3.5 pe-9 py-2.5 rounded-full bg-white border border-[#e4e4e7] text-sm text-[#09090b] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 cursor-pointer transition"
                  >
                    <option value="featured">{t.templates_sort_featured[locale]}</option>
                    <option value="name">{t.templates_sort_name[locale]}</option>
                    <option value="price_asc">{t.templates_sort_price_asc[locale]}</option>
                    <option value="price_desc">{t.templates_sort_price_desc[locale]}</option>
                  </select>
                  <svg className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-[#71717a] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>

                <div className="hidden sm:flex items-center rounded-full border border-[#e4e4e7] bg-white p-0.5">
                  <button
                    onClick={() => setView("grid")}
                    aria-label={t.templates_view_grid[locale]}
                    aria-pressed={view === "grid"}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${view === "grid" ? "bg-[#7c3aed] text-white" : "text-[#71717a] hover:text-[#09090b]"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setView("list")}
                    aria-label={t.templates_view_list[locale]}
                    aria-pressed={view === "list"}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${view === "list" ? "bg-[#7c3aed] text-white" : "text-[#71717a] hover:text-[#09090b]"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* results */}
            {filtered.length === 0 ? (
              <p className="mt-16 text-center text-[#71717a]">{t.templates_no_results[locale]}</p>
            ) : view === "grid" ? (
              <motion.div layout className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filtered.map((tmpl) => (
                    <motion.div
                      key={tmpl.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25 }}
                      className="group"
                    >
                      <div className="bg-white rounded-2xl overflow-hidden border border-[#e4e4e7] card-shadow card-shadow-hover transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                        <button
                          onClick={() => openPreview(tmpl)}
                          className="relative aspect-video overflow-hidden bg-[#f0f0f2] block w-full cursor-pointer"
                          aria-label={`${t.templates_preview[locale]} — ${tmpl.name}`}
                        >
                          <Thumb tmpl={tmpl} />
                          <Badges tmpl={tmpl} />
                          <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/0 group-hover:bg-[#09090b]/25 transition-colors">
                            <span className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all text-sm font-medium text-[#09090b] bg-white/95 px-4 py-2 rounded-full shadow-lg">
                              {t.templates_preview[locale]}
                            </span>
                          </div>
                        </button>

                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base font-semibold tracking-tight text-[#09090b]">{tmpl.name}</h3>
                            {tmpl.category && (
                              <span className="shrink-0 text-[11px] font-medium text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {catLabel(tmpl.category, locale)}
                              </span>
                            )}
                          </div>
                          {tmpl.description && <p className="mt-1.5 text-sm text-[#71717a] leading-relaxed line-clamp-2">{tmpl.description}</p>}
                          <FeaturePills tmpl={tmpl} />
                          <div className="mt-auto">
                            <Actions tmpl={tmpl} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div layout className="mt-8 space-y-4">
                <AnimatePresence mode="popLayout">
                  {filtered.map((tmpl) => (
                    <motion.div
                      key={tmpl.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="group flex flex-col sm:flex-row gap-5 bg-white rounded-2xl border border-[#e4e4e7] card-shadow card-shadow-hover transition-all duration-300 overflow-hidden p-3 sm:p-3"
                    >
                      <button
                        onClick={() => openPreview(tmpl)}
                        className="relative sm:w-64 shrink-0 aspect-video rounded-xl overflow-hidden bg-[#f0f0f2] cursor-pointer"
                        aria-label={`${t.templates_preview[locale]} — ${tmpl.name}`}
                      >
                        <Thumb tmpl={tmpl} />
                        <Badges tmpl={tmpl} />
                      </button>
                      <div className="flex-1 flex flex-col py-2 pe-2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold tracking-tight text-[#09090b]">{tmpl.name}</h3>
                          {tmpl.category && (
                            <span className="shrink-0 text-[11px] font-medium text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-0.5 rounded-full">
                              {catLabel(tmpl.category, locale)}
                            </span>
                          )}
                        </div>
                        {tmpl.description && <p className="mt-1 text-sm text-[#71717a] leading-relaxed line-clamp-2">{tmpl.description}</p>}
                        <FeaturePills tmpl={tmpl} />
                        <div className="mt-auto">
                          <Actions tmpl={tmpl} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── Preview modal (multi-device) ───────────────────── */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label={active.name}
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setActive(null)} />

            {/* top bar */}
            <div className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-[#09090b]/90 backdrop-blur-xl border-b border-[#27272a]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-white truncate">{active.name}</span>
                {priceLabel(active) && <span className="hidden md:inline text-xs text-[#a1a1aa] whitespace-nowrap">{priceLabel(active)}</span>}
              </div>

              {/* device toggles */}
              <div className="hidden sm:flex items-center gap-1 rounded-full border border-[#27272a] bg-[#18181b] p-0.5">
                {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    aria-label={t[`templates_device_${d}`][locale]}
                    aria-pressed={device === d}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${device === d ? "bg-[#7c3aed] text-white" : "text-[#a1a1aa] hover:text-white"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={DEVICE_ICON[d]} />
                    </svg>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={active.previewUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full text-white border border-[#27272a] hover:border-[#7c3aed] hover:bg-[#7c3aed]/10 transition-colors"
                >
                  {t.templates_open_full[locale]}
                  <svg className={`w-3.5 h-3.5 ${rtl ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
                {active.saleUrl && (
                  <a
                    href={active.saleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full text-white bg-[#7c3aed] hover:bg-[#8b5cf6] transition-colors"
                  >
                    {t.templates_buy[locale]}
                    {priceLabel(active) && ` — ${priceLabel(active)}`}
                  </a>
                )}
                <button
                  onClick={() => setActive(null)}
                  className="w-9 h-9 rounded-full bg-[#18181b] hover:bg-[#27272a] flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* iframe stage */}
            <div className="relative z-10 flex-1 overflow-auto bg-[#18181b] p-0 sm:p-4 flex justify-center">
              <div
                className="h-full bg-white sm:rounded-lg overflow-hidden shadow-2xl transition-[width] duration-300 ease-out"
                style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
              >
                {active.previewUrl && <iframe key={active.id} src={active.previewUrl} className="w-full h-full" title={active.name} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
