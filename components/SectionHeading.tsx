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
