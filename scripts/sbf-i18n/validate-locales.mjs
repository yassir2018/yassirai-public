import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const publicRoot = path.join(repoRoot, "public");
const siteRoot = path.join(publicRoot, "SBF_site");
const origin = "https://yassirai.com";
const directions = [
  "a-editorial",
  "b-visuel",
  "c-institutionnel",
  "d-showcase",
];
const locales = ["ar", "en", "fr"];
const errors = [];

function routeFor(direction, locale) {
  return locale === "ar"
    ? `/SBF_site/${direction}`
    : `/SBF_site/${direction}/${locale}`;
}

function fileFor(direction, locale) {
  return locale === "ar"
    ? path.join(siteRoot, direction, "index.html")
    : path.join(siteRoot, direction, locale, "index.html");
}

function visibleMarkup(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

function valuesFor(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]).sort();
}

for (const direction of directions) {
  const arabic = await readFile(fileFor(direction, "ar"), "utf8");
  const arabicIds = valuesFor(arabic, /\bid="([^"]+)"/g);
  const arabicImages = valuesFor(arabic, /<img\b[^>]*\bsrc="([^"]+)"/g).map((src) =>
    src.replace("../assets/", "/SBF_site/assets/"),
  );

  for (const locale of locales) {
    const file = fileFor(direction, locale);
    const html = await readFile(file, "utf8");
    const expectedDir = locale === "ar" ? "rtl" : "ltr";
    const expectedRoute = routeFor(direction, locale);
    const canonical = `${origin}${expectedRoute}`;

    if (!html.includes(`<html lang="${locale}" dir="${expectedDir}">`)) {
      errors.push(`${direction}/${locale}: wrong html language or direction`);
    }
    if (!html.includes(`<link rel="canonical" href="${canonical}">`)) {
      errors.push(`${direction}/${locale}: wrong or missing canonical URL`);
    }
    for (const alternate of locales) {
      const href = `${origin}${routeFor(direction, alternate)}`;
      if (!html.includes(`<link rel="alternate" hreflang="${alternate}" href="${href}">`)) {
        errors.push(`${direction}/${locale}: missing ${alternate} hreflang`);
      }
    }
    if (!html.includes(`hreflang="x-default" href="${origin}${routeFor(direction, "ar")}"`)) {
      errors.push(`${direction}/${locale}: missing x-default hreflang`);
    }
    if ((html.match(/<a\b[^>]*aria-current="page"[^>]*>\s*<span lang="(?:ar|en|fr)">/g) ?? []).length < 1) {
      errors.push(`${direction}/${locale}: current language is not identified`);
    }
    if (/TODO:\s*EN\/FR|class="lang"|aria-disabled="true"[^>]*>\s*<span class="lat">AR/.test(html)) {
      errors.push(`${direction}/${locale}: legacy disabled language switch remains`);
    }
    if (locale !== "ar" && /[\u0600-\u06ff]/u.test(visibleMarkup(html))) {
      errors.push(`${direction}/${locale}: untranslated Arabic remains in visible markup`);
    }

    const ids = valuesFor(html, /\bid="([^"]+)"/g);
    if (JSON.stringify(ids) !== JSON.stringify(arabicIds)) {
      errors.push(`${direction}/${locale}: document IDs drifted from the Arabic source`);
    }
    const images = valuesFor(html, /<img\b[^>]*\bsrc="([^"]+)"/g).map((src) =>
      src.replace("../assets/", "/SBF_site/assets/"),
    );
    if (JSON.stringify(images) !== JSON.stringify(arabicImages)) {
      errors.push(`${direction}/${locale}: image assets drifted from the Arabic source`);
    }

    for (const asset of valuesFor(html, /(?:src|href)="(\/SBF_site\/(?:assets|[^/]+\/(?:style\.css|app\.js))[^"#?]*)"/g)) {
      await access(path.join(publicRoot, asset.slice(1))).catch(() => {
        errors.push(`${direction}/${locale}: missing local asset ${asset}`);
      });
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Validated 12 SBF locale pages, SEO links, content direction and shared assets.");
}
