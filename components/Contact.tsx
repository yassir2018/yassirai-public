"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { t, type Locale } from "@/lib/i18n";
import type { Contact as ContactType } from "@/lib/api";
import { TextReveal } from "./TextReveal";
import { StaggerContainer, StaggerItem } from "./ScrollReveal";

const typeIcons: Record<string, string> = {
  email: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  phone: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
  linkedin: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z",
  github: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
  twitter: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z",
};

function getHref(type: string, value: string) {
  if (type === "email") return `mailto:${value}`;
  if (type === "phone") return `tel:${value}`;
  if (value.startsWith("http")) return value;
  return value;
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const [transform, setTransform] = useState("perspective(800px) rotateX(0deg) rotateY(0deg)");

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(800px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg)`);
  };

  const handleLeave = () => {
    setTransform("perspective(800px) rotateX(0deg) rotateY(0deg)");
  };

  return (
    <div
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ transform, transition: "transform 0.2s ease-out" }}
    >
      {children}
    </div>
  );
}

export function Contact({ locale, contacts }: { locale: Locale; contacts: ContactType[] }) {
  return (
    <section id="contact" className="py-32 sm:py-40 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Massive headline */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <TextReveal text={t.contact_title[locale]} highlightLast />
          </h2>
          <motion.p
            className="text-lg sm:text-xl text-muted text-balance"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {t.contact_subtitle[locale]}
          </motion.p>
        </div>

        {contacts.length > 0 ? (
          <StaggerContainer
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto"
            staggerDelay={0.1}
          >
            {contacts.map((c) => {
              const iconPath = typeIcons[c.type];
              const href = getHref(c.type, c.value);
              const isLink = href.startsWith("http") || href.startsWith("mailto") || href.startsWith("tel");

              const inner = (
                <TiltCard className="h-full">
                  <div className="glass rounded-2xl p-6 h-full flex items-center gap-5 group transition-all duration-300 hover:translate-y-[-2px]">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      {iconPath ? (
                        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                        </svg>
                      ) : (
                        <span className="text-accent text-sm font-bold">{c.type[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted capitalize mb-0.5">{c.label || c.type}</p>
                      <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                        {c.value}
                      </p>
                      {/* Underline animation */}
                      <div className="h-px w-0 group-hover:w-full bg-accent/50 transition-all duration-300 mt-0.5" />
                    </div>
                  </div>
                </TiltCard>
              );

              return (
                <StaggerItem key={c.id}>
                  {isLink ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        ) : (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <a
              href="mailto:contact@yassirai.com"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-all"
            >
              contact@yassirai.com
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
