import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run after building the standalone game. Only public runtime artifacts are
// copied: never its source tree, personal QA files, environment files or secrets.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const game = resolve(process.argv[2] || join(root, '../../60-FABRIQUE-DES-ETOILES'));
const source = join(game, 'dist/client');
const target = join(root, 'public/Games/star-factory');
const extensions = new Set(['.html', '.css', '.js', '.png', '.jpg', '.webp', '.svg', '.woff', '.woff2', '.json', '.mp3', '.ogg', '.wav', '.ico']);
if (!existsSync(join(source, 'index.html'))) throw new Error('Build Star Factory before preparing Games.');
if (existsSync(join(target, 'index.html'))) throw new Error('Game already packaged; use a fresh staging directory for an update.');
let files = 0, bytes = 0;
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const sourceFile = join(from, entry.name), destination = join(to, entry.name);
    if (entry.isDirectory()) copyTree(sourceFile, destination);
    else if (extensions.has(extname(entry.name))) { copyFileSync(sourceFile, destination); files++; bytes += statSync(sourceFile).size; }
  }
}
copyTree(source, target);
const htmlPath = join(target, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
if (/<base\s/i.test(html)) throw new Error('Unexpected base URL in original game build.');
writeFileSync(htmlPath, html.replace('<head>', '<head>\n    <base href="/Games/star-factory/">\n    <link rel="canonical" href="https://yassirai.com/Games/star-factory">'), 'utf8');
const hubAssets = join(root, 'public/Games/assets');
mkdirSync(hubAssets, { recursive: true });
copyFileSync(join(game, 'qa/welcome-laptop-ar-final.jpg'), join(hubAssets, 'star-factory-cover.jpg'));
for (const script of ['arabic', 'latin']) copyFileSync(join(game, `node_modules/@fontsource/cairo/files/cairo-${script}-700-normal.woff2`), join(hubAssets, `cairo-${script}-700.woff2`));
copyFileSync(join(game, 'node_modules/@fontsource/cairo/LICENSE'), join(hubAssets, 'Cairo-OFL.txt'));
console.log(`Prepared ${files} runtime files (${(bytes / 1024 / 1024).toFixed(1)} MiB) for ${basename(target)}; no game source, recordings or profile data copied.`);
