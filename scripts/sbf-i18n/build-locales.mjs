import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { translations } from "./translations.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const siteRoot = path.join(repoRoot, "public", "SBF_site");
const origin = "https://yassirai.com";

const directions = [
  "a-editorial",
  "b-visuel",
  "c-institutionnel",
  "d-showcase",
];
const locales = ["en", "fr"];

const localeNames = {
  ar: { ar: "العربية", en: "الإنجليزية", fr: "الفرنسية" },
  en: { ar: "Arabic", en: "English", fr: "French" },
  fr: { ar: "Arabe", en: "Anglais", fr: "Français" },
};

const seoByDirection = {
  "a-editorial": {
    ar: {
      title: "اتجاه أ — تحريري | المنتدى السوري للأعمال",
      description:
        "مقترح اتجاه بصري تحريري لموقع المنتدى السوري للأعمال — عرض داخلي.",
    },
    en: {
      title: "Direction A — Editorial | Syrian Business Forum",
      description:
        "Editorial visual direction proposal for the Syrian Business Forum website — internal review.",
    },
    fr: {
      title: "Direction A — Éditoriale | Forum syrien des affaires",
      description:
        "Proposition de direction visuelle éditoriale pour le site du Forum syrien des affaires — revue interne.",
    },
  },
  "b-visuel": {
    ar: {
      title: "اتجاه ب — بصري | المنتدى السوري للأعمال",
      description:
        "مقترح اتجاه بصري قائم على الصورة لموقع المنتدى السوري للأعمال — عرض داخلي.",
    },
    en: {
      title: "Direction B — Visual | Syrian Business Forum",
      description:
        "Image-led visual direction proposal for the Syrian Business Forum website — internal review.",
    },
    fr: {
      title: "Direction B — Visuelle | Forum syrien des affaires",
      description:
        "Proposition de direction visuelle centrée sur l’image pour le site du Forum syrien des affaires — revue interne.",
    },
  },
  "c-institutionnel": {
    ar: {
      title: "اتجاه ج — مؤسسي | المنتدى السوري للأعمال",
      description:
        "مقترح اتجاه بصري مؤسسي لموقع المنتدى السوري للأعمال — عرض داخلي.",
    },
    en: {
      title: "Direction C — Institutional | Syrian Business Forum",
      description:
        "Institutional visual direction proposal for the Syrian Business Forum website — internal review.",
    },
    fr: {
      title: "Direction C — Institutionnelle | Forum syrien des affaires",
      description:
        "Proposition de direction visuelle institutionnelle pour le site du Forum syrien des affaires — revue interne.",
    },
  },
  "d-showcase": {
    ar: {
      title: "اتجاه د — مؤسسي متكامل | المنتدى السوري للأعمال",
      description:
        "مقترح صفحة رئيسية متكاملة لموقع المنتدى السوري للأعمال — عرض داخلي.",
    },
    en: {
      title: "Direction D — Full Institutional | Syrian Business Forum",
      description:
        "Complete institutional homepage proposal for the Syrian Business Forum website — internal review.",
    },
    fr: {
      title: "Direction D — Institutionnelle complète | Forum syrien des affaires",
      description:
        "Proposition de page d’accueil institutionnelle complète pour le Forum syrien des affaires — revue interne.",
    },
  },
};

function routeFor(direction, locale) {
  return locale === "ar"
    ? `/SBF_site/${direction}`
    : `/SBF_site/${direction}/${locale}`;
}

function languageSwitcher(direction, locale, mobile = false) {
  const links = ["ar", "en", "fr"]
    .map((code) => {
      const current = code === locale ? ' aria-current="page"' : "";
      return `<a href="${routeFor(direction, code)}" hreflang="${code}"${current}><span lang="${code}">${code.toUpperCase()}</span><span class="vh"> — ${localeNames[locale][code]}</span></a>`;
    })
    .join("");

  return `<nav class="lang-switch${mobile ? " lang-switch-mobile" : ""}" data-lang-switch${
    mobile ? '="mobile"' : ""
  } aria-label="${locale === "ar" ? "اختيار اللغة" : locale === "fr" ? "Choisir la langue" : "Choose language"}">${links}</nav>`;
}

function seoBlock(direction, locale) {
  const seo = seoByDirection[direction][locale];
  const canonical = `${origin}${routeFor(direction, locale)}`;
  const ar = `${origin}${routeFor(direction, "ar")}`;
  const en = `${origin}${routeFor(direction, "en")}`;
  const fr = `${origin}${routeFor(direction, "fr")}`;
  const ogLocale = locale === "ar" ? "ar_SY" : locale === "fr" ? "fr_FR" : "en_US";
  const alternates = ["ar_SY", "en_US", "fr_FR"]
    .filter((item) => item !== ogLocale)
    .map((item) => `<meta property="og:locale:alternate" content="${item}">`)
    .join("\n");

  return `<!-- SBF_SEO_START -->
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="ar" href="${ar}">
<link rel="alternate" hreflang="en" href="${en}">
<link rel="alternate" hreflang="fr" href="${fr}">
<link rel="alternate" hreflang="x-default" href="${ar}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Syrian Business Forum">
<meta property="og:locale" content="${ogLocale}">
${alternates}
<meta property="og:title" content="${seo.title}">
<meta property="og:description" content="${seo.description}">
<meta property="og:url" content="${canonical}">
<!-- SBF_SEO_END -->`;
}

function translateText(value, locale, missing) {
  if (!/[\u0600-\u06ff]/u.test(value)) return value;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return value;
  const translated = translations[locale][normalized];
  if (!translated) {
    missing.add(normalized);
    return value;
  }
  const leading = value.match(/^\s*/u)?.[0] ?? "";
  const trailing = value.match(/\s*$/u)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function translateHtml(html, locale, missing) {
  const tokenPattern =
    /(<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>|[^<]+)/gi;

  return html.replace(tokenPattern, (token) => {
    if (/^(?:<!--|<script\b|<style\b)/i.test(token)) return token;
    if (!token.startsWith("<")) return translateText(token, locale, missing);

    return token.replace(
      /\b(alt|aria-label|aria-roledescription|content|data-tags|placeholder|title)=("([^"]*)"|'([^']*)')/gi,
      (full, attr, quoted, doubleValue, singleValue) => {
        const value = doubleValue ?? singleValue ?? "";
        const translated = translateText(value, locale, missing);
        const quote = quoted[0];
        return `${attr}=${quote}${translated}${quote}`;
      },
    );
  });
}

function renderLocalized(source, direction, locale) {
  const missing = new Set();
  const seo = seoByDirection[direction][locale];
  let output = source
    .replace('<html lang="ar" dir="rtl">', `<html lang="${locale}" dir="ltr">`)
    .replace(
      new RegExp(`<base href="/SBF_site/${direction}/">`),
      `<base href="${routeFor(direction, locale)}/">`,
    )
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${seo.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${seo.description}">`,
    )
    .replace(
      /<!-- SBF_SEO_START -->[\s\S]*?<!-- SBF_SEO_END -->/,
      seoBlock(direction, locale),
    )
    .replace(
      /<nav class="lang-switch" data-lang-switch[\s\S]*?<\/nav>/,
      languageSwitcher(direction, locale),
    )
    .replace(
      /<nav class="lang-switch lang-switch-mobile" data-lang-switch="mobile"[\s\S]*?<\/nav>/,
      languageSwitcher(direction, locale, true),
    )
    .replaceAll('href="../assets/', 'href="/SBF_site/assets/')
    .replaceAll('src="../assets/', 'src="/SBF_site/assets/')
    .replace('href="style.css"', `href="/SBF_site/${direction}/style.css"`)
    .replace('src="app.js"', `src="/SBF_site/${direction}/app.js"`)
    .replace(/(<span aria-hidden="true">\s*)←/g, "$1→");

  output = translateHtml(output, locale, missing);
  return { output, missing };
}

const allMissing = [];

for (const direction of directions) {
  const sourcePath = path.join(siteRoot, direction, "index.html");
  const source = await readFile(sourcePath, "utf8");

  for (const locale of locales) {
    const { output, missing } = renderLocalized(source, direction, locale);
    if (missing.size) {
      allMissing.push(
        ...[...missing].map((text) => `${direction}/${locale}: ${text}`),
      );
      continue;
    }

    const outputDir = path.join(siteRoot, direction, locale);
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "index.html"), output, "utf8");
  }
}

if (allMissing.length) {
  console.error("Missing SBF translations:\n" + allMissing.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Generated 8 localized SBF pages (EN/FR)." );
}
