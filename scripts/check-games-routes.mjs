import { readFileSync, readdirSync } from 'node:fs';

const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin)) throw new Error('Provide the site origin to validate.');
const gameFolder = new URL('../public/Games/star-factory/', import.meta.url);
const gameHtml = readFileSync(new URL('index.html', gameFolder), 'utf8');
const runtime = [...gameHtml.matchAll(/(?:src|href)="(\.\/assets\/[^"?]+\.(?:js|css))"/g)]
  .map(([, path]) => ['/Games/star-factory/' + path.slice(2), 200, path.endsWith('.js') ? 'javascript' : 'text/css']);
if (runtime.length !== 2) throw new Error('Expected one game script and one stylesheet.');
const illustrations = readdirSync(new URL('assets/', gameFolder)).filter(name => name.endsWith('.png'))
  .map(name => ['/Games/star-factory/assets/' + name, 200, 'image/png']);
const checks = [
  ['/Games', 200, 'text/html'],
  ['/Games/', 200, 'text/html'],
  ['/Games/index.html', 200, 'text/html'],
  ['/Games/star-factory', 200, 'text/html'],
  ['/Games/star-factory/', 200, 'text/html'],
  ['/Games/assets/games.js?v=20260907', 200, 'javascript'],
  ['/Games/assets/games.css?v=20260907', 200, 'text/css'],
  ['/Games/assets/star-factory-cover.jpg', 200, 'image/jpeg'],
  ['/Games/assets/cairo-arabic-700.woff2', 200, 'font/woff2'],
  ...illustrations,
  ...runtime,
  ['/Games/star-factory/assets/welcome-axi.png?_imageRetry=deployment-check', 200, 'image/png'],
  ['/Games/assets/not-a-real-file.png', 404, null],
  ['/fr', 200, 'text/html'],
  ['/SBF_site', 200, 'text/html'],
];
let failed = false;
for (const [path, expectedStatus, expectedType] of checks) {
  const isImage = expectedType === 'image/png';
  const response = await fetch(new URL(path, origin), { method: isImage ? 'GET' : 'HEAD', signal: AbortSignal.timeout(45000) });
  const type = response.headers.get('content-type') || '';
  const validImage = !isImage || Buffer.from(await response.arrayBuffer()).subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const passed = response.status === expectedStatus && (!expectedType || type.includes(expectedType)) && validImage;
  failed ||= !passed;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${response.status} ${path} (${type})`);
}
if (failed) process.exitCode = 1;
