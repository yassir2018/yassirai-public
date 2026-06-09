import type { Template } from "./api";
import type { Locale } from "./i18n";

/**
 * DEV-ONLY fixture mirroring the 10 curated WEAVER templates hosted under
 * /public/weaver. Used by fetchPortfolio() as a local fallback so the
 * marketplace is fully previewable with `npm run dev` even before the CMS
 * (Personal OS) is seeded. In production the real CMS data is always used.
 *
 * Keep in sync with personal-os-v2/prisma/seed-weaver.ts (source of truth).
 */
type Raw = {
  slug: string;
  path: string;
  thumb: string;
  name: string;
  category: string;
  price: number;
  sortOrder: number;
  features: string[];
  fr: string;
  en: string;
  ar: string;
};

const RAW: Raw[] = [
  { slug: "agency-bold", path: "templates/agency/agency-bold", thumb: "thumb_agency_agency_bold.webp", name: "APEX Studio", category: "agency", price: 390, sortOrder: 1, features: ["Typographie Syne", "Dark & Light", "WCAG AA", "Responsive"], fr: "Agence créative premium — typographie Syne audacieuse, accents magenta dynamiques et contraste élevé conforme WCAG.", en: "Premium creative agency — bold Syne typography, dynamic magenta accents, WCAG-compliant high contrast.", ar: "وكالة إبداعية فاخرة — خطوط Syne جريئة، لمسات أرجوانية ديناميكية وتباين عالٍ متوافق مع WCAG." },
  { slug: "saas-dark", path: "templates/saas/saas-dark", thumb: "thumb_saas_saas_dark.webp", name: "Nebula UI", category: "saas", price: 390, sortOrder: 2, features: ["Dark Mode", "Glassmorphism", "Micro-interactions", "Responsive"], fr: "SaaS en dark mode avec micro-interactions niveau Aceternity et glassmorphism.", en: "Dark-mode SaaS with Aceternity-level micro-interactions and glassmorphism.", ar: "منصة SaaS بالوضع الداكن مع تفاعلات دقيقة بمستوى Aceternity وتأثير الزجاج." },
  { slug: "neural-core", path: "templates/ai/neural-core", thumb: "thumb_ai_neural_core.webp", name: "Neural Core", category: "ai", price: 590, sortOrder: 3, features: ["Néon Cyan", "Deep Space", "AI / ML", "Responsive"], fr: "Plateforme IA & traitement de données — noir spatial profond, accents néon cyan.", en: "AI & data-processing platform — deep-space black, neon cyan accents.", ar: "منصة ذكاء اصطناعي ومعالجة بيانات — أسود فضائي عميق ولمسات سماوية نيون." },
  { slug: "alpine-lodge", path: "templates/hospitality/alpine-lodge", thumb: "thumb_hospitality_alpine_lodge.webp", name: "Maison Blanche", category: "hospitality", price: 590, sortOrder: 4, features: ["6 pages", "Vidéos cinematic", "View Transitions", "Luxe alpin"], fr: "Lodge alpin 5★ à Verbier — chalet de luxe, vidéos cinematic, View Transitions. 6 pages.", en: "5★ alpine lodge in Verbier — luxury chalet, cinematic videos, View Transitions. 6 pages.", ar: "نزل جبلي فاخر 5 نجوم في فيربييه — شاليه فخم، فيديوهات سينمائية وانتقالات سلسة. 6 صفحات." },
  { slug: "palais-royal", path: "templates/hospitality/palais-royal", thumb: "thumb_hospitality_palais_royal.webp", name: "Palais Atlas", category: "hospitality", price: 590, sortOrder: 5, features: ["6 pages", "Mega Menu", "Hero vidéo", "Or & Serif"], fr: "Palace marocain ultra-premium — méga-menus plein écran, serif doré, accents rouges luxueux. 6 pages.", en: "Ultra-premium Moroccan palace — full-screen mega menus, gold serif, luxurious red accents. 6 pages.", ar: "قصر مغربي فائق الفخامة — قوائم ضخمة بملء الشاشة، خط ذهبي ولمسات حمراء فاخرة. 6 صفحات." },
  { slug: "shop-luxury", path: "templates/ecommerce/shop-luxury", thumb: "thumb_ecommerce_shop_luxury.webp", name: "SILLAGE Parfums", category: "ecommerce", price: 390, sortOrder: 6, features: ["Hero vidéo", "Mega Menu", "Search overlay", "Light Mode"], fr: "Boutique de luxe inspirée Louis Vuitton — méga-menu, overlay de recherche et hero vidéo.", en: "Louis Vuitton-inspired luxury store — mega menu, search overlay and video hero.", ar: "متجر فاخر مستوحى من Louis Vuitton — قائمة ضخمة، بحث متراكب وواجهة فيديو." },
  { slug: "synapse-ai", path: "templates/saas/synapse-ai", thumb: "thumb_saas_synapse_ai.webp", name: "Synapse AI", category: "saas", price: 590, sortOrder: 7, features: ["Glassmorphism", "Neon glow", "Dark", "Responsive"], fr: "Template SaaS IA ultra-moderne — lueurs violet/cyan et verre dépoli.", en: "Ultra-modern AI SaaS template — purple/cyan glows and frosted glass.", ar: "قالب SaaS للذكاء الاصطناعي فائق الحداثة — توهجات بنفسجية/سماوية وزجاج مصنفر." },
  { slug: "lumiere", path: "templates/portfolio/lumiere", thumb: "thumb_portfolio_lumiere.webp", name: "Lumière", category: "portfolio", price: 590, sortOrder: 8, features: ["Galerie cinématique", "Light / Dark", "Pages projet", "Responsive"], fr: "Portfolio photo cinématique — galerie immersive, pages projet et bascule clair/sombre.", en: "Cinematic photography portfolio — immersive gallery, project pages and light/dark toggle.", ar: "بورتفوليو تصوير سينمائي — معرض غامر، صفحات مشاريع وتبديل فاتح/داكن." },
  { slug: "architecture-firm", path: "templates/corporate/architecture-firm", thumb: "thumb_corporate_architecture_firm.webp", name: "Horizon Architecture", category: "corporate", price: 590, sortOrder: 9, features: ["Industriel", "Bold", "Corporate", "Responsive"], fr: "Cabinet d'architecture & construction premium — palette jaune industriel et gris béton.", en: "Premium architecture & construction firm — industrial yellow and concrete grey palette.", ar: "شركة هندسة معمارية وبناء فاخرة — لوحة صفراء صناعية ورمادي إسمنتي." },
  { slug: "etherial-web3", path: "templates/dashboard/etherial-web3", thumb: "thumb_dashboard_etherial_web3.webp", name: "Etherial NFT", category: "web3", price: 590, sortOrder: 10, features: ["Web3", "Holographic", "Dark", "Marketplace"], fr: "Marketplace NFT Web3 holographique — dégradés profonds et noir absolu.", en: "Holographic Web3 NFT marketplace — deep gradients and absolute black.", ar: "سوق NFT للويب3 هولوغرافي — تدرجات عميقة وأسود مطلق." },
];

export function weaverFixture(lang: Locale): Template[] {
  return RAW.map((x) => ({
    id: `weaver-${x.slug}`,
    name: x.name,
    slug: x.slug,
    description: x[lang],
    status: "DONE",
    previewUrl: `/weaver/${x.path}/index.html`,
    saleUrl: null,
    thumbnailUrl: `/weaver/assets/img/${x.thumb}`,
    category: x.category,
    badge: x.price >= 500 ? "Premium" : "Standard",
    price: x.price,
    currency: "MAD",
    demoMode: true,
    features: x.features,
    sortOrder: x.sortOrder,
  }));
}
