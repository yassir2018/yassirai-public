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
        { source: "/SBF_site", destination: "/SBF_site/index.html" },
        {
          source: "/SBF_site/:dir/:locale(en|fr)",
          destination: "/SBF_site/:dir/:locale/index.html",
        },
        { source: "/SBF_site/:dir", destination: "/SBF_site/:dir/index.html" },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
