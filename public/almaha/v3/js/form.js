// AL MAHA v3 — contact form. Honest by design: it validates, then asks the visitor's mail app to open a
// ready message (mailto). Nothing is sent or stored by the page, and no success is claimed.
import { CONTACT_EMAIL_FALLBACK, MESSAGE_MAX } from './config.js';

const MSG = {
  name: { valueMissing: 'يرجى كتابة الاسم الكامل.' },
  organisation: { valueMissing: 'يرجى كتابة اسم الجهة أو المؤسسة.' },
  email: { valueMissing: 'يرجى كتابة البريد المهني.', typeMismatch: 'صيغة البريد غير صحيحة. مثال: name@organisation.tn', patternMismatch: 'صيغة البريد غير صحيحة. مثال: name@organisation.tn' },
  phone: { patternMismatch: 'يرجى كتابة رقم الهاتف بالأرقام، مع رمز الدولة إن أمكن.' },
  topic: { valueMissing: 'يرجى اختيار موضوع الطلب.' },
  message: { valueMissing: 'يرجى كتابة رسالتكم.', tooShort: 'الرسالة قصيرة جداً. أضيفوا بعض التفاصيل (20 حرفاً على الأقل).' },
};
// Arabic-Indic (U+0660..) and Persian (U+06F0..) digits are accepted, then normalised for the message
const DIGITS = '0-9\\u0660-\\u0669\\u06F0-\\u06F9';
const latinDigits = (s) => s.replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x6F0);
const remaining = (n) => (n === 0 ? 'لم يبقَ أي حرف.' : n === 1 ? 'تبقّى حرف واحد.' : n === 2 ? 'تبقّى حرفان.' : n <= 10 ? `تبقّت ${n} أحرف.` : `تبقّى ${n} حرفاً.`);

export function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return { pick() {} };
  const status = form.querySelector('.form__status');
  const fields = [...form.querySelectorAll('input, select, textarea')];
  const f = form.elements;
  // valid under both the u and the v regex flags (browsers compile the pattern attribute with v)
  f.phone.pattern = `[+]?[${DIGITS}][${DIGITS} \\(\\)\\.\\-]{6,}`;
  f.email.pattern = '[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}';   // type=email alone accepts name@host
  f.message.maxLength = MESSAGE_MAX;

  const mailLink = document.querySelector('.channel a[href^="mailto:"]');
  const to = mailLink ? mailLink.getAttribute('href').replace('mailto:', '') : CONTACT_EMAIL_FALLBACK;

  const counter = document.getElementById('f-msg-count');
  const count = () => { counter.textContent = remaining(MESSAGE_MAX - f.message.value.length); };
  count();

  const check = (el) => {
    const v = el.validity;
    // minlength is only enforced by the browser after user edits; check it ourselves too
    const tooShort = el.minLength > 0 && el.value.trim().length > 0 && el.value.trim().length < el.minLength;
    const key = v.valueMissing || (el.required && !el.value.trim()) ? 'valueMissing'
      : v.typeMismatch ? 'typeMismatch'
      : v.patternMismatch ? 'patternMismatch'
      : (v.tooShort || tooShort) ? 'tooShort' : null;
    const field = el.closest('.field');
    const err = field.querySelector('.field__err');
    const text = key ? (MSG[el.name]?.[key] || 'يرجى مراجعة هذا الحقل.') : '';
    err.textContent = text;
    field.classList.toggle('is-invalid', !!text);
    if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    return !text;
  };

  fields.forEach((el) => {
    el.addEventListener('blur', () => { if (el.value || el.dataset.touched) { el.dataset.touched = '1'; check(el); } });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid')) check(el); });
    el.addEventListener('change', () => { if (el.tagName === 'SELECT') check(el); });
  });
  f.message.addEventListener('input', count);

  const say = (...nodes) => { status.replaceChildren(...nodes); };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = fields.filter((el) => !check(el));
    if (bad.length) {
      const n = bad.length;
      say(n === 1 ? 'يرجى مراجعة الحقل المشار إليه.' : n === 2 ? 'يرجى مراجعة الحقلين المشار إليهما.' : `يرجى مراجعة ${n} حقول مشار إليها.`);
      bad[0].focus();
      return;
    }
    const v = (k) => f[k].value.trim();
    const subject = `طلب تواصل: ${f.topic.value}`;
    const body = [
      `${v('name')} — ${v('organisation')}`,
      v('email') + (v('phone') ? ` · ${latinDigits(v('phone'))}` : ''),
      '',
      v('message'),
    ].join('\n');
    const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // honest status: we can only ask the system to open the mail app
    const a = document.createElement('a');
    a.href = `mailto:${to}`; a.className = 'link lat'; a.lang = 'en'; a.textContent = to;
    const copy = document.createElement('button');
    copy.type = 'button'; copy.className = 'btn-copy'; copy.textContent = 'نسخ الرسالة';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(`${subject}\n\n${body}`); copy.textContent = 'نُسخت الرسالة'; }
      catch (err) { copy.textContent = 'تعذّر النسخ'; }
    });
    const p = document.createElement('p');
    p.append('حاولنا فتح تطبيق البريد لديكم برسالة جاهزة؛ إن لم يُفتح، انسخوا الرسالة وراسلونا على ', a, '.');
    say(p, copy);
    form.dispatchEvent(new CustomEvent('form:mailto', { detail: href }));
    window.location.href = href;
  });

  return {
    /** preselect a topic (from the services index), say so, and bring the form into view */
    pick(topic) {
      if (topic) {
        const opt = [...f.topic.options].find((o) => o.text === topic);
        if (opt) { f.topic.value = opt.value || opt.text; check(f.topic); say(`اخترنا لكم موضوع: ${opt.text}.`); }
      }
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      history.replaceState(null, '', '#contact-form');
      setTimeout(() => f.name.focus({ preventScroll: true }), reduce ? 0 : 900);
    },
  };
}
