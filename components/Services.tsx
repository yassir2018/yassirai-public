import { t, type Locale } from "@/lib/i18n";
import type { Service } from "@/lib/api";

export function Services({ locale, services }: { locale: Locale; services: Service[] }) {
  return (
    <section id="services" className="py-24 sm:py-32 bg-surface/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t.services_title[locale]}
          </h2>
          <p className="text-muted text-base sm:text-lg">{t.services_subtitle[locale]}</p>
          <div className="w-16 h-1 bg-accent rounded-full mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="group bg-surface border border-border rounded-2xl p-6 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
            >
              {service.icon && (
                <div className="text-3xl mb-4">{service.icon}</div>
              )}
              <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
              {service.description && (
                <p className="text-sm text-muted leading-relaxed">{service.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
