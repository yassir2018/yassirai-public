import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "app.yassirai.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudflare.com",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [],
      // Sites statiques autonomes servis depuis public/ : l'URL propre sans
      // index.html doit etre reecrite avant que la route dynamique [lang] ne
      // capture le segment.
      afterFiles: [
        { source: "/Games", destination: "/Games/index.html" },
        { source: "/Games/star-factory", destination: "/Games/star-factory/index.html" },
        { source: "/SBF_site", destination: "/SBF_site/index.html" },
        { source: "/SBF_site/:dir", destination: "/SBF_site/:dir/index.html" },
        { source: "/almaha", destination: "/almaha/index.html" },
        { source: "/almaha/:dir", destination: "/almaha/:dir/index.html" },
      ],
      fallback: [],
    };
  },
  // Cache navigateur des fichiers statiques sous /almaha/ (public/, noms non
  // hashes) : polices 1 an, images et medias 7 jours + 1 jour de revalidation
  // en arriere-plan. HTML, CSS, JS, JSON, TXT et webmanifest ne sont pas listes
  // et gardent le defaut de Next (public, max-age=0) : revalidation a chaque
  // visite tant que le site change tous les jours.
  async headers() {
    return [
      {
        source: "/almaha/:path+\\.(woff2|woff|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/almaha/:path+\\.(webp|avif|jpg|jpeg|png|svg|ico|gif|mp4)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
