"use client";
import { t, isRtl, type Locale } from "@/lib/i18n";
import type { Service } from "@/lib/api";
import { SectionHeading } from "./SectionHeading";
import { StaggerContainer, StaggerItem } from "./ScrollReveal";

export function Services({ locale, services }: { locale: Locale; services: Service[] }) {
  const rtl = isRtl(locale);

  return (
    <section id="services" className="py-32 sm:py-40 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeading
          title={t.services_title[locale]}
          subtitle={t.services_subtitle[locale]}
        />

        <StaggerContainer
          className={`grid gap-4 ${
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
              className={
                i === 0 && services.length >= 4
                  ? "sm:col-span-2 sm:row-span-2"
                  : ""
              }
            >
              <div
                className={`group glass rounded-2xl p-8 h-full animated-border transition-all duration-500 hover:translate-y-[-2px] ${
                  i === 0 && services.length >= 4 ? "flex flex-col justify-center" : ""
                }`}
              >
                {service.icon && (
                  <div
                    className={`mb-5 ${
                      i === 0 && services.length >= 4 ? "text-6xl" : "text-5xl"
                    }`}
                  >
                    {service.icon}
                  </div>
                )}
                <h3
                  className={`font-semibold mb-3 ${
                    i === 0 && services.length >= 4
                      ? "text-2xl"
                      : "text-lg"
                  }`}
                >
                  {service.title}
                </h3>
                {service.description && (
                  <p className="text-sm sm:text-base text-muted leading-relaxed">
                    {service.description}
                  </p>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
