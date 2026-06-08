"use client";
import { TextReveal } from "./TextReveal";

export function SectionHeading({
  title,
  subtitle,
  className,
  align = "center",
}: {
  title: string;
  subtitle?: string;
  className?: string;
  align?: "center" | "left" | "right";
}) {
  const alignClass =
    align === "center" ? "text-center" : align === "left" ? "text-start" : "text-end";

  return (
    <div className={`mb-16 md:mb-24 ${alignClass} ${className || ""}`}>
      <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
        <TextReveal text={title} highlightLast />
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg sm:text-xl text-muted max-w-2xl mx-auto text-balance">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Weaver-style eyebrow heading — small violet pill label + title + subtitle.
 * Supports dark and light section themes (for the dark/light alternance).
 */
export function EyebrowHeading({
  eyebrow,
  title,
  subtitle,
  theme = "dark",
  align = "center",
  className,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  theme?: "dark" | "light";
  align?: "center" | "left";
  className?: string;
}) {
  const dark = theme === "dark";
  return (
    <div
      className={`mb-12 sm:mb-14 max-w-2xl ${align === "center" ? "mx-auto text-center" : "text-start"} ${className || ""}`}
    >
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
          dark
            ? "text-[#c4b5fd] bg-[#7c3aed]/15 border border-[#7c3aed]/30"
            : "text-[#7c3aed] bg-[#7c3aed]/10 border border-[#7c3aed]/20"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
        {eyebrow}
      </span>
      <h2
        className={`mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-balance ${
          dark ? "text-[#fafafa]" : "text-[#09090b]"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-base sm:text-lg text-balance ${dark ? "text-[#a1a1aa]" : "text-[#71717a]"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
