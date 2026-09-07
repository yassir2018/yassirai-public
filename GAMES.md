# YassirAI Games

Public catalogue: `/Games` (also `/Games/` and `/Games/index.html`).
Star Factory: `/Games/star-factory` (also trailing slash / explicit index).

This is a standalone static section under `public/Games`, following the existing
SBF integration. Only two exact rewrites are added; the portfolio, its languages,
SBF, API, dependencies and other projects are unchanged.

Arabic is the fresh-visitor default. Arabic, Darija and English share only the
`axi-bip-language` device preference with the game. No accounts, tracking or
child-name persistence are added. Narration is explicitly deferred. There is
one educational game, with the existing three age paths, not additional levels.

The game is the validated static build of the local Star Factory project.
`scripts/prepare-games.mjs` packages that output into a fresh game directory,
excludes provenance/private development files, includes Cairo's font license,
and adds an explicit base URL so clean Next.js routes cannot break assets.
The cover is an existing screenshot with the name field empty; no personalized
QA data or video reference is published.

Validation: `node --test tests/games.test.mjs`, then the normal `npm run build`.
Runtime route checks should include the catalogue, game, JS, CSS, Cairo, artwork,
and the unchanged `/fr` and `/SBF_site` entry points.

Publish via the existing yassirai-public application on Coolify, using its
existing GitHub `master` workflow. No DNS changes, new service, database,
authentication changes or changes to another application are required.
