import type { Metadata } from "next";
import { Geist, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yassirai.com"),
  title: "Yassir AI — Portfolio",
  description: "Developpeur, designer et createur de solutions digitales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${notoArabic.variable} dark antialiased`}>
      <body className="min-h-screen bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
