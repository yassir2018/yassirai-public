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
  projects_details: { fr: "Voir les details", en: "View details", ar: "عرض التفاصيل" },

  back_to_projects: { fr: "Retour aux projets", en: "Back to projects", ar: "العودة للمشاريع" },
  project_screenshots: { fr: "Captures d'ecran", en: "Screenshots", ar: "لقطات الشاشة" },
  project_video: { fr: "Video", en: "Video", ar: "فيديو" },
  project_repo: { fr: "Code source", en: "Source code", ar: "الكود المصدري" },
  project_demo: { fr: "Demo", en: "Demo", ar: "عرض" },
  project_visit: { fr: "Visiter le site", en: "Visit site", ar: "زيارة الموقع" },
  project_tech: { fr: "Technologies", en: "Technologies", ar: "التقنيات" },
  project_status_label: { fr: "Statut", en: "Status", ar: "الحالة" },
  project_not_found: { fr: "Projet introuvable", en: "Project not found", ar: "المشروع غير موجود" },
  project_not_found_desc: { fr: "Ce projet n'existe pas ou n'est plus disponible.", en: "This project doesn't exist or is no longer available.", ar: "هذا المشروع غير موجود أو لم يعد متاحا." },

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
  footer_top: { fr: "Retour en haut", en: "Back to top", ar: "العودة للأعلى" },

  status_EN_COURS: { fr: "En cours", en: "In progress", ar: "قيد التنفيذ" },
  status_PLANIFIE: { fr: "Planifie", en: "Planned", ar: "مخطط" },
  status_TERMINE: { fr: "Termine", en: "Completed", ar: "مكتمل" },
  status_EN_PAUSE: { fr: "En pause", en: "Paused", ar: "متوقف" },

  status_DONE: { fr: "Termine", en: "Done", ar: "مكتمل" },
  status_PENDING: { fr: "En attente", en: "Pending", ar: "في الانتظار" },
  status_IN_PROGRESS: { fr: "En cours", en: "In progress", ar: "قيد التنفيذ" },

  empty_projects: { fr: "Aucun projet pour le moment", en: "No projects yet", ar: "لا توجد مشاريع حاليا" },
  empty_services: { fr: "Aucun service pour le moment", en: "No services yet", ar: "لا توجد خدمات حاليا" },

  form_name: { fr: "Votre nom", en: "Your name", ar: "اسمك" },
  form_email: { fr: "Votre email", en: "Your email", ar: "بريدك الإلكتروني" },
  form_subject: { fr: "Sujet", en: "Subject", ar: "الموضوع" },
  form_message: { fr: "Votre message", en: "Your message", ar: "رسالتك" },
  form_send: { fr: "Envoyer", en: "Send", ar: "إرسال" },
  form_sending: { fr: "Envoi en cours...", en: "Sending...", ar: "جارٍ الإرسال..." },
  form_success: { fr: "Message envoye avec succes !", en: "Message sent successfully!", ar: "تم إرسال الرسالة بنجاح!" },
  form_error: { fr: "Erreur lors de l'envoi. Reessayez.", en: "Error sending. Please try again.", ar: "خطأ في الإرسال. حاول مرة أخرى." },
  form_or: { fr: "ou contactez-moi directement", en: "or contact me directly", ar: "أو تواصل معي مباشرة" },
};
