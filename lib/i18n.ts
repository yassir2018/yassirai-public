export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export const isRtl = (locale: Locale) => locale === "ar";

export const t: Record<string, Record<Locale, string>> = {
  nav_home: { fr: "Accueil", en: "Home", ar: "الرئيسية" },
  nav_about: { fr: "A propos", en: "About", ar: "حولي" },
  nav_services: { fr: "Services", en: "Services", ar: "الخدمات" },
  nav_projects: { fr: "Projets", en: "Projects", ar: "المشاريع" },
  nav_contact: { fr: "Contact", en: "Contact", ar: "اتصل بي" },

  hero_greeting: { fr: "Bonjour, je suis", en: "Hi, I'm", ar: "مرحبا، أنا" },
  hero_cta: { fr: "Voir mes projets", en: "View my projects", ar: "شاهد مشاريعي" },
  hero_contact: { fr: "Me contacter", en: "Contact me", ar: "اتصل بي" },

  about_title: { fr: "A propos", en: "About me", ar: "حولي" },

  services_title: { fr: "Services", en: "Services", ar: "الخدمات" },
  services_subtitle: {
    fr: "Ce que je peux faire pour vous",
    en: "What I can do for you",
    ar: "ما يمكنني تقديمه لك",
  },

  projects_title: { fr: "Projets", en: "Projects", ar: "المشاريع" },
  projects_subtitle: {
    fr: "Une selection de mes travaux recents",
    en: "A selection of my recent work",
    ar: "مجموعة من أعمالي الحديثة",
  },
  projects_view: { fr: "Voir le projet", en: "View project", ar: "عرض المشروع" },

  templates_title: { fr: "Templates", en: "Templates", ar: "القوالب" },
  templates_subtitle: {
    fr: "Templates et ressources disponibles",
    en: "Available templates and resources",
    ar: "قوالب وموارد متاحة",
  },
  templates_preview: { fr: "Apercu", en: "Preview", ar: "معاينة" },
  templates_buy: { fr: "Acheter", en: "Buy", ar: "شراء" },

  contact_title: { fr: "Contact", en: "Contact", ar: "اتصل بي" },
  contact_subtitle: {
    fr: "N'hesitez pas a me contacter",
    en: "Feel free to reach out",
    ar: "لا تتردد في التواصل معي",
  },

  footer_rights: { fr: "Tous droits reserves.", en: "All rights reserved.", ar: "جميع الحقوق محفوظة." },

  status_EN_COURS: { fr: "En cours", en: "In progress", ar: "قيد التنفيذ" },
  status_PLANIFIE: { fr: "Planifie", en: "Planned", ar: "مخطط" },
  status_TERMINE: { fr: "Termine", en: "Completed", ar: "مكتمل" },
  status_EN_PAUSE: { fr: "En pause", en: "Paused", ar: "متوقف" },

  status_DONE: { fr: "Termine", en: "Done", ar: "مكتمل" },
  status_PENDING: { fr: "En attente", en: "Pending", ar: "في الانتظار" },
  status_IN_PROGRESS: { fr: "En cours", en: "In progress", ar: "قيد التنفيذ" },

  empty_projects: { fr: "Aucun projet pour le moment", en: "No projects yet", ar: "لا توجد مشاريع حاليا" },
  empty_services: { fr: "Aucun service pour le moment", en: "No services yet", ar: "لا توجد خدمات حاليا" },
};
