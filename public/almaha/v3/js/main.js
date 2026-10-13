// AL MAHA v3 — entry point.
import { initHeader, initScrollSpy, initMenu, initServices, initApproachTabs, initLangSwitch } from './ui.js';
import { initForm } from './form.js';
import { initMotion } from './motion.js';

const form = initForm();
initHeader();
initScrollSpy();
initMenu();
initServices((topic) => form.pick(topic));
initApproachTabs();
initLangSwitch();
initMotion();
