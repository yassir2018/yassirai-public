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

**Compression vidéo (prête, swap R2 au déploiement avec GO)** : cars 8,1→2,5 Mo, + action/gladiator en 720p H.264 (`-crf 28 -preset slow -movflags +faststart -an`) + variantes WebM VP9. Stockées hors repo (`C:\tmp\hero-opt\`).
- _Reste_ : TBT/JS (P0.3), images marketplace (P0.2).
