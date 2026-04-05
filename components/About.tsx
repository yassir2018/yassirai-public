"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { t, type Locale } from "@/lib/i18n";
import type { Bio } from "@/lib/api";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal } from "./ScrollReveal";

export function About({ locale, bio }: { locale: Locale; bio: Bio }) {
  const avatarRef = useRef(null);
  const isInView = useInView(avatarRef, { once: true, margin: "-100px" });

  return (
    <section id="about" className="py-32 sm:py-40 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeading title={t.about_title[locale]} />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16 items-center">
          {/* Avatar with clip-path reveal */}
          {bio.avatarUrl && (
            <div className="md:col-span-2 flex justify-center">
              <div ref={avatarRef} className="relative w-64 h-64 md:w-80 md:h-80">
                <motion.div
                  className="w-full h-full rounded-3xl overflow-hidden"
                  initial={{ clipPath: "circle(0% at 50% 50%)" }}
                  animate={isInView ? { clipPath: "circle(50% at 50% 50%)" } : {}}
                  transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
                >
                  <Image
                    src={bio.avatarUrl}
                    alt={bio.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 256px, 320px"
                  />
                </motion.div>
                {/* Decorative ring */}
                <motion.div
                  className="absolute inset-0 rounded-3xl border border-accent/20"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={isInView ? { scale: 1.05, opacity: 1 } : {}}
                  transition={{ duration: 0.8, delay: 0.6 }}
                />
              </div>
            </div>
          )}

          {/* Bio text */}
          <div className={bio.avatarUrl ? "md:col-span-3" : "md:col-span-5"}>
            <ScrollReveal variant="fadeUp" delay={0.3}>
              <p className="text-xl sm:text-2xl text-muted leading-relaxed whitespace-pre-line text-balance">
                {bio.bio}
              </p>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
