# PERF — Sprint P0 : allègement yassirai.com

> Mesures mobile, page d'accueil `/fr`. Lighthouse local (headless Chrome) car PageSpeed API en quota 429.
> Next 16 `next build` n'affiche plus le tableau "First Load JS" → le JS est mesuré en **transfert réel compressé** (ce que l'utilisateur télécharge).

## Baseline — prod (2026-06-10, commit a4058af)

| Métrique (mobile) | Baseline | Cible |
|---|---|---|
| Lighthouse Performance | **73** | ≥ 90 |
| FCP | 1,5 s | — |
| **LCP** | **5,1 s** 🔴 | ≤ 2,5 s |
| TBT | 220 ms | ≤ 200 ms |
| CLS | **0** ✅ | ≤ 0,05 |
| Speed Index | 5,1 s | — |
| Poids total chargé (Lighthouse) | **8 036 Kio** | — |
| Transfert initial (HTML+JS+CSS, compressé) | ~285 Ko | ≤ 1,5 Mo |
| JS transféré (compressé, 12 chunks) | **254 Ko** | ≤ 150 Ko (First Load) |
| CSS transféré (compressé) | 13 Ko | — |
| HTML (compressé) | 18 Ko | — |
| Octets vidéo avant LCP | **~4,4–7,4 Mo** 🔴 | 0 |

## Top postes de poids (chiffres réels)

1. **Vidéo hero** — `public/videos` / R2 : cars **7,4 Mo**, gladiator **5,6 Mo**, action **4,4 Mo**.
   La slide active télécharge la vidéo entière **avant** d'afficher quoi que ce soit (pas de `poster`,
   `autoPlay` sans `preload` maîtrisé) → c'est le **LCP à 5,1 s** et l'essentiel des 8 Mo.
2. **JavaScript** — 254 Ko compressé (plus gros chunk ~227 Ko brut = Framer Motion).
3. **Images** — marquee dupliqué ×2 (20 vignettes) + grille (10), en `<img>` brut (pas `next/image`).

### Poids mort / repo (impacte build + déploiement, pas le LCP)
- `public/videos/*.mp4` = **~19 Mo** committés mais **non servis** au runtime (le hero charge depuis R2). → suppression possible.
- `public/weaver/` = **~48 Mo** (118 templates). → plan de déport R2 en P0.6.

## Journal des correctifs (avant → après)

### P0.1 — Hero vidéo (commit suivant)
**Changements** : poster local webp (≤44 Ko, généré via ffmpeg) en `<img>` direct (pas d'optimiseur) = LCP instantané ; `preload="none"` + vidéo **chargée en différé sur desktop uniquement** ; **mobile + reduced-motion = poster seul (0 vidéo)** ; hero sorti de Framer Motion (média + contenu en HTML statique, crossfade en CSS appliqué seulement aux changements de slide → la slide 0 n'est jamais gated).

**Mesures mobile (⚠️ throttling RÉEL/devtools — le *simulé* gonfle artificiellement le LCP ici : 4,4 s simulé alors que toutes les ressources finissent < 900 ms) :**

| Métrique | Baseline | Après P0.1 |
|---|---|---|
| LCP (réel) | 5,1 s | **2,4 s** ✅ |
| Poids total mobile | 8 036 Kio | **801 Kio** ✅ |
| Requêtes vidéo (mobile) | 1 × ~7,3 Mo | **0** ✅ |
| TBT | 220 ms | 290 ms (réel) → cible via P0.3 |
| CLS | 0 | 0 ✅ |

**Compression vidéo** : appliquée — R2 `videos/{action,cars,gladiator}.mp4` remplacés par les versions 720p H.264 (cars 7,4→2,5 Mo, action 4,6→2,0, gladiator 6,1→1,6). Originaux conservés en local (`public/videos/`).

### ✅ RÉSULTAT PROD validé (déployé, commit 23fc91a, Lighthouse mobile simulé = même méthode que la baseline)

| Métrique (mobile) | Baseline | Prod après P0.1 | Cible | OK |
|---|---|---|---|---|
| Performance | 73 | **95** | ≥ 90 | ✅ |
| LCP | 5,1 s | **2,4 s** | ≤ 2,5 s | ✅ |
| FCP | 1,5 s | 1,8 s | — | — |
| TBT | 220 ms | **160 ms** | ≤ 200 ms | ✅ |
| CLS | 0 | **0** | ≤ 0,05 | ✅ |
| Poids total | 8 036 Kio | **795 Kio** | — | ✅ |
| Requêtes vidéo mobile | 1 (~7 Mo) | **0** | 0 | ✅ |

➡️ **Tous les critères « terminé » du sprint sont atteints dès P0.1.** P0.2→P0.5 deviennent du polish (images marketplace, réduction JS desktop, fondations) — optionnel.

_NB : le LCP « 4,4 s » observé en local (next start standalone) était un artefact d'environnement ; la prod confirme 2,4 s._

### P0.6 — Déport public/weaver → R2 CDN ✅ (déployé, commit 0c8186f)
- **875 fichiers (~48 Mo)** uploadés sur R2 (bucket `personal-os-files`, préfixe `weaver/`) avec Content-Type corrects (text/html, image/webp, video/mp4…) + `Cache-Control: immutable`.
- URLs des templates (preview + thumbnail) basculées en base : `yassirai.com/weaver/*` → `pub-9c404a6a….r2.dev/weaver/*` (11 visibles + 107 masqués). Les chemins relatifs internes des templates (`../../../assets/`) résolvent correctement sous le même préfixe.
- R2 vérifié : HTML rendu, **iframe-able** (pas de X-Frame-Options), assets + vidéos OK.
- **`public/weaver` supprimé du repo** → repo + contexte de build Docker allégés de ~48 Mo. `yassirai.com/weaver` renvoie 404 (plus rien ne le référence). Homepage + previews OK depuis R2.
- Seeds/manifeste (personal-os-v2) alignés sur R2 pour les futurs re-seeds.

## Bilan sprint P0
Cibles **toutes atteintes** (mobile : 95/100, LCP 2,4 s, 0 vidéo, 0,8 Mo) + repo allégé de 48 Mo. Restant optionnel : P0.2 (next/image marketplace), P0.3 (LazyMotion/dynamic — TBT desktop), P0.4/P0.5.
