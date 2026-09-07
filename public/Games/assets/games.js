(() => {
  'use strict';
  const copy = {
    ar: {
      skip:'انتقل إلى الألعاب',language:'لغة الصفحة',back:'موقع YassirAI',eyebrow:'العب. اكتشف. تعلّم.',heading:'مغامرتك تبدأ هنا',count:'لعبة واحدة متاحة',education:'مغامرة تعليمية',ageShort:'٣–١٠ سنوات',pair:'أكسي وبيب',title:'مصنع النجوم',description:'ساعد أكسي وبيب على إضاءة النجوم بحل تحديات الأشكال والعدّ والحساب.',ages:'الفئات العمرية',little:'٣–٥ سنوات',explorer:'٦–٧ سنوات',inventor:'٨–١٠ سنوات',featureAge:'تحديات حسب العمر',featureLanguages:'العربية · الدارجة · الإنجليزية',featureName:'يمكن اللعب بدون اسم',play:'ابدأ اللعب',playLabel:'العب مصنع النجوم',playNote:'مباشرة في المتصفح · بدون حساب',parentNote:'للأطفال غير القادرين على القراءة: شاركوهم قراءة التعليمات. التعليق الصوتي الطبيعي سيُضاف لاحقًا.',footer:'مساحة للعب والتعلّم',coverAlt:'شاشة مصنع النجوم المضيئة، مع أكسي وبيب بين الجزر العائمة',pageTitle:'ألعاب YassirAI — مصنع النجوم'
    },
    ary: {
      skip:'دوز للألعاب',language:'لغة الصفحة',back:'موقع YassirAI',eyebrow:'لعب. اكتاشف. تعلّم.',heading:'المغامرة ديالك كتبدا هنا',count:'لعبة وحدة واجدة',education:'مغامرة تعليمية',ageShort:'٣–١٠ سنين',pair:'أكسي وبيب',title:'معمل النجوم',description:'عاون أكسي وبيب يشعلو النجوم بتحديات ديال الأشكال والعدّ والحساب.',ages:'الفئات العمرية',little:'٣–٥ سنين',explorer:'٦–٧ سنين',inventor:'٨–١٠ سنين',featureAge:'تحديات على حساب العمر',featureLanguages:'العربية · الدارجة · الإنجليزية',featureName:'تقدر تلعب بلا اسم',play:'يلا نلعبو',playLabel:'لعب معمل النجوم',playNote:'مباشرة فالمتصفح · بلا حساب',parentNote:'للصغار اللي باقي ما كيقراوش: عاونوهم يقراو التعليمات. الصوت الطبيعي غادي نزيدوه من بعد.',footer:'بلاصة للعب والتعلّم',coverAlt:'أكسي وبيب فمعمل النجوم المضيء بين الجزر اللي كتعوم',pageTitle:'ألعاب YassirAI — معمل النجوم'
    },
    en: {
      skip:'Skip to games',language:'Page language',back:'YassirAI website',eyebrow:'Play. Discover. Learn.',heading:'Your adventure starts here',count:'1 game available',education:'Learning adventure',ageShort:'Ages 3–10',pair:'Axi & Bip',title:'Star Factory',description:'Help Axi and Bip light up the stars with shape, counting and maths challenges.',ages:'Age groups',little:'Ages 3–5',explorer:'Ages 6–7',inventor:'Ages 8–10',featureAge:'Age-specific challenges',featureLanguages:'Arabic · Darija · English',featureName:'Play with or without a name',play:'Play now',playLabel:'Play Star Factory',playNote:'Play in your browser · No account needed',parentNote:'For children who are not reading yet, please help them read the instructions. Natural voice narration will be added later.',footer:'A place to play and learn',coverAlt:'The bright Star Factory welcome screen, with Axi and Bip among floating islands',pageTitle:'YassirAI Games — Star Factory'
    }
  };
  const preferenceKey = 'axi-bip-language';
  function applyLanguage(locale) {
    if (!Object.hasOwn(copy, locale)) locale = 'ar';
    const text = copy[locale];
    document.documentElement.lang = locale === 'ary' ? 'ar-MA' : locale;
    document.documentElement.dir = locale === 'en' ? 'ltr' : 'rtl';
    document.title = text.pageTitle;
    for (const node of document.querySelectorAll('[data-copy]')) node.textContent = text[node.dataset.copy];
    for (const node of document.querySelectorAll('[data-label]')) node.setAttribute('aria-label', text[node.dataset.label]);
    for (const node of document.querySelectorAll('[data-alt]')) node.alt = text[node.dataset.alt];
    for (const button of document.querySelectorAll('[data-lang]')) button.setAttribute('aria-pressed', String(button.dataset.lang === locale));
    try { localStorage.setItem(preferenceKey, locale); } catch { /* Language still works without storage. */ }
  }
  for (const button of document.querySelectorAll('[data-lang]')) button.addEventListener('click', () => applyLanguage(button.dataset.lang));
  let initial = 'ar';
  try { initial = localStorage.getItem(preferenceKey) || 'ar'; } catch { /* Arabic is the official default. */ }
  applyLanguage(initial);
})();
