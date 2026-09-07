const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin)) throw new Error('Provide the site origin to validate.');
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
  ['/Games/star-factory/assets/welcome-axi.png', 200, 'image/png'],
  ['/Games/star-factory/assets/welcome-bip.png', 200, 'image/png'],
  ['/Games/star-factory/assets/index-C0A-1ref.js', 200, 'javascript'],
  ['/Games/star-factory/assets/index-CHHWckfE.css', 200, 'text/css'],
  ['/Games/assets/not-a-real-file.png', 404, null],
  ['/fr', 200, 'text/html'],
  ['/SBF_site', 200, 'text/html'],
];
let failed = false;
for (const [path, expectedStatus, expectedType] of checks) {
  const response = await fetch(new URL(path, origin), { method: 'HEAD', signal: AbortSignal.timeout(45000) });
  const type = response.headers.get('content-type') || '';
  const passed = response.status === expectedStatus && (!expectedType || type.includes(expectedType));
  failed ||= !passed;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${response.status} ${path} (${type})`);
}
if (failed) process.exitCode = 1;
