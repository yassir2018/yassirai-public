"use client";
import { t, type Locale } from "@/lib/i18n";
import type { Service } from "@/lib/api";
import { EyebrowHeading } from "./SectionHeading";
import { StaggerContainer, StaggerItem } from "./ScrollReveal";

const EYEBROW: Record<Locale, string> = { fr: "Expertise", en: "Expertise", ar: "خبرة" };

export function Services({ locale, services }: { locale: Locale; services: Service[] }) {
  return (
    <section id="services" className="bg-[#f7f7f8] text-[#09090b] py-24 sm:py-32 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <EyebrowHeading
          theme="light"
          eyebrow={EYEBROW[locale]}
          title={t.services_title[locale]}
          subtitle={t.services_subtitle[locale]}
        />

        <StaggerContainer
          className={`grid gap-5 ${
            services.length === 1
              ? "grid-cols-1 max-w-lg mx-auto"
              : services.length === 2
                ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
          staggerDelay={0.08}
        >
          {services.map((service, i) => (
            <StaggerItem
              key={service.id}
              className={i === 0 && services.length >= 4 ? "sm:col-span-2 sm:row-span-2" : ""}
            >
              <div
                className={`group h-full bg-white rounded-2xl p-8 border border-[#e4e4e7] card-shadow card-shadow-hover transition-all duration-300 hover:-translate-y-1 ${
                  i === 0 && services.length >= 4 ? "flex flex-col justify-center" : ""
                }`}
              >
                {service.icon && (
                  <div
                    className={`mb-5 inline-flex items-center justify-center rounded-2xl bg-[#7c3aed]/10 ${
                      i === 0 && services.length >= 4 ? "w-16 h-16 text-4xl" : "w-14 h-14 text-3xl"
                    }`}
                  >
                    {service.icon}
                  </div>
                )}
                <h3 className={`font-semibold mb-3 text-[#09090b] ${i === 0 && services.length >= 4 ? "text-2xl" : "text-lg"}`}>
                  {service.title}
                </h3>
                {service.description && (
                  <p className="text-sm sm:text-base text-[#71717a] leading-relaxed">{service.description}</p>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
