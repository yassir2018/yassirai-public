import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const folder = resolve(root, 'public/Games');
const html = readFileSync(resolve(folder, 'index.html'), 'utf8');
const script = readFileSync(resolve(folder, 'assets/games.js'), 'utf8');

test('Games is an Arabic-first catalogue with one real game and no account form', () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /<base href="\/Games\/">/);
  assert.equal((html.match(/<article /g) || []).length, 1);
  assert.equal((html.match(/href="star-factory\/"/g) || []).length, 2);
  assert.doesNotMatch(html, /<form|<iframe|type="password"|placeholder=/);
});

test('runtime links stay inside the game even when Next removes trailing slashes', () => {
  const gameHtml = readFileSync(resolve(folder, 'star-factory/index.html'), 'utf8');
  assert.match(gameHtml, /<base href="\/Games\/star-factory\/">/);
  for (const match of gameHtml.matchAll(/(?:src|href)="(\.\/assets\/[^"?]+)"/g)) {
    const url = new URL(match[1], 'https://yassirai.com/Games/star-factory/');
    assert.ok(existsSync(resolve(root, 'public', '.' + url.pathname)), url.pathname);
  }
  const config = readFileSync(resolve(root, 'next.config.ts'), 'utf8');
  assert.match(config, /source: "\/Games", destination: "\/Games\/index.html"/);
  assert.match(config, /source: "\/Games\/star-factory", destination: "\/Games\/star-factory\/index.html"/);
  assert.match(config, /source: "\/SBF_site"/);
});

test('cover, fonts and all twelve game illustrations are packaged', () => {
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"?]+)/g)) assert.ok(existsSync(resolve(folder, match[1])), match[1]);
  for (const filename of ['cairo-arabic-700.woff2','cairo-latin-700.woff2','Cairo-OFL.txt']) assert.ok(existsSync(resolve(folder, 'assets', filename)));
  const assets = readdirSync(resolve(folder, 'star-factory/assets'));
  assert.equal(assets.filter(name => name.endsWith('.png')).length, 12);
  assert.equal(assets.filter(name => name.endsWith('.md')).length, 0);
  assert.ok(!assets.some(name => /secret|credential|\.env|\.map$/.test(name)));
});

test('the published game entry includes bounded automatic image retries', () => {
  const gameHtml = readFileSync(resolve(folder, 'star-factory/index.html'), 'utf8');
  const entry = gameHtml.match(/src="\.\/(assets\/[^"?]+\.js)"/)[1];
  const code = readFileSync(resolve(folder, 'star-factory', entry), 'utf8');
  assert.match(code, /_imageRetry/);
  assert.match(code, /Image load timed out/);
  assert.match(code, /naturalWidth/);
});

function browser(saved, blocked = false) {
  const nodes = new Map();
  for (const [attr, field] of [['copy','textContent'],['label','aria-label'],['alt','alt']]) {
    for (const match of html.matchAll(new RegExp(`data-${attr}="([^"]+)"`, 'g'))) {
      const node = { dataset: { [attr]: match[1] }, setAttribute(key,value) { this[key] = value; } };
      nodes.set(`${attr}:${match[1]}`, node);
    }
  }
  const buttons = ['ar','ary','en'].map(lang => ({ dataset: { lang }, setAttribute(key,value) { this[key] = value; }, addEventListener(_event, handler) { this.click = handler; } }));
  const document = { documentElement: {}, title:'', querySelectorAll(selector) { if (selector === '[data-lang]') return buttons; const key = selector.slice(6,-1); return [...nodes.values()].filter(node => Object.hasOwn(node.dataset,key)); } };
  const writes = [];
  const localStorage = { getItem() { if (blocked) throw new Error('storage blocked'); return saved; }, setItem(key,value) { if (blocked) throw new Error('storage blocked'); writes.push([key,value]); } };
  runInNewContext(script, { document, localStorage });
  return { document, nodes, buttons, writes };
}
test('all language choices update visible copy, labels, direction and the shared game preference', () => {
  const app = browser(null);
  assert.equal(app.document.documentElement.dir, 'rtl');
  for (const locale of ['en','ary','ar']) {
    app.buttons.find(button => button.dataset.lang === locale).click();
    assert.equal(app.document.documentElement.dir, locale === 'en' ? 'ltr' : 'rtl');
    for (const node of app.nodes.values()) assert.ok((node.textContent || node['aria-label'] || node.alt)?.length > 0);
    assert.deepEqual(app.writes.at(-1), ['axi-bip-language',locale]);
    assert.equal(app.buttons.filter(button => button['aria-pressed'] === 'true').length, 1);
  }
});
test('missing, invalid or blocked storage never prevents opening the game', () => {
  for (const saved of [null,'invalid','__proto__']) assert.equal(browser(saved).document.documentElement.lang, 'ar');
  const app = browser(null, true); app.buttons[2].click();
  assert.equal(app.document.documentElement.lang, 'en');
  assert.equal(app.document.documentElement.dir, 'ltr');
});
test('catalogue has no tracking, no artificial voice promise and no child-name collection', () => {
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|sendBeacon|childName|nickname|speechSynthesis/);
  assert.match(script, /Natural voice narration will be added later/);
  assert.match(readFileSync(resolve(folder, 'assets/games.css'), 'utf8'), /prefers-reduced-motion/);
});
