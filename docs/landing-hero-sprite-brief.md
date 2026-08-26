# Hero sprite batch — what to ask Fable 5 for

Companion to `fableTasks.md` §3.2 and `docs/landing-assets.md`. Written
2026-08-22 after the first docked-sprite batch came back unmatched.

## The problem in one line

The seven part sprites were generated as **standalone product shots** — each
part centred and filled to its own canvas, at whatever camera angle flattered
that part. The hero needs the opposite: each part **exactly where and how it
appears on the car**, so the base plus the sprites reassemble into the original
render.

Measured gap between the delivered sprites and their on-car footprints:

| Part | aspect on the car | aspect delivered | rotation CSS would have to invent |
|---|---|---|---|
| grille + bumper | 3.02 | 3.54 | ~0° — **already usable** |
| headlight | 0.75 | 0.89 | ~32° `rotateY` — workable |
| windshield | 3.01 | 1.96 | ~49° `rotateX` — marginal |
| hood | 4.73 | 2.21 | ~62° `rotateX` — **not usable** |

At 50–60° the panel's own baked shading fights the rotation: you stop seeing a
hood lying on a car and start seeing a photo of a hood being tilted. Door and
fender could not be measured reliably (the stripped car shows interior behind
them rather than a clean aperture), but both are dead-on side profiles against a
¾ body, so they are in the same bracket as the hood.

## The technique that actually fixes it

**Do not ask for parts to be generated.** Ask for them to be *isolated from the
car image that already exists.*

`car-stripped.png` was made by taking a car render and **removing** parts. The
sprites should be made from **the same source image** by the complementary
operation — **keeping** one part and clearing everything else. Two edits of the
same pixels stay registered to each other; two independent generations do not.
That is the whole difference, and it is why the current batch cannot be rescued
by asking more politely for "the same angle".

Verified on the current files: `car-stripped.png` and `cutouts/car.png` differ
in 56% of body pixels, yet their silhouettes agree to ~6px. So even a
generative erase holds *geometry* well while re-rendering *shading* — good
enough to compose, as long as every output descends from one source frame.

## The ask — paste this to Fable 5

> I need a **matched hero set** for a scroll animation where a car comes apart.
> Work from **one single source render** of the car and produce **eight outputs
> from it**. Do not generate any part from scratch, and do not re-render,
> re-light, re-pose, re-frame or "improve" the car between outputs.
>
> Output 1 — **the stripped car**: the car with front bumper, grille, both
> headlights, hood, driver-side door, driver-side front fender and windshield
> removed, exposing the engine bay and interior behind them. Transparent
> background.
>
> Outputs 2–8 — **one isolated part each**: bumper, grille, headlight, hood,
> door, fender, windshield. For each, keep **only that part exactly as it
> appears on the source car** and make every other pixel fully transparent.
>
> Hard requirements for outputs 2–8:
> - **Do not move, rotate, re-centre, re-scale or crop the part.** It must stay
>   at the same position and size within the frame that it occupies on the car.
>   I will composite these on top of the stripped car at 0,0 with no transform,
>   and they have to land in their holes.
> - **Same canvas size for all eight outputs.** 2048×2048 preferred.
> - Same camera, same focal length, same lighting, same paint and chrome.
> - Transparent background, no drop shadow and no ground-contact shadow baked
>   into the part cutouts.
>
> The acceptance test is: **stripped car + all seven parts, stacked at 0,0,
> must reconstruct the original render.** If it does not, the set is not usable.
>
> Please also send me **the source car render itself**, so I can check the
> reconstruction against it.

## Why the extra requirements are there

- **Same canvas, no crop.** Our pipeline trims each sprite to its bounding box
  and records the offset, so a full-frame input is what makes the dock position
  computable instead of hand-tuned. Cropped or centred inputs throw that away —
  that is exactly what happened this time (`sprite-door` came back 761×593 while
  the whole car is 823×367).
- **2048², not 1024².** The existing cutouts are 2048² and the width ladder is
  480/768/1024/1440. At 1024² source, after trimming, most layers can only serve
  480 plus their native width — the 1024 and 1440 rungs are unreachable without
  upscaling.
- **No baked shadow.** The parts sit on top of a base that already has its own
  contact shadow; a second one doubles up at the dock and smears when the part
  undocks.
- **Send the source render.** Without it there is no way to prove the set
  reconstructs — only to eyeball it.

## How the batch gets checked

`node scripts/check-hero-registration.mjs <source-render.png>` composites the
stripped base plus every sprite in `landing-src/hero/` and reports, per part,
whether it lands where the source says it should. Green means the set docks with
no calibration; anything else prints the per-part error so the next round is
specific rather than "still looks off".

## Batch 2 result — 2026-08-22, 3 of 7 dock

Checked with `pnpm check:hero landing-src/cutouts/car.png`. The technique
worked where it was applied: three parts came back as true in-place isolations
and need no calibration at all.

| Sprite | box in the 1024² frame | own-footprint agreement | verdict |
|---|---|---|---|
| `sprite-door` | 158×232 @642,351 | 52% → **97%** | docks |
| `sprite-fender` | 291×190 @363,438 | 55% → **92%** | docks |
| `sprite-bumper` | 374×100 @98,529 | 31% → **65%** | docks |
| `sprite-grille` | 242×77 @135,473 | 67% → 27% | not registered |
| `sprite-headlights` | 680×306 @171,359 | 49% → 50% | not registered |
| `sprite-hood` | 737×208 @142,412 | 57% → 54% | not registered |
| `sprite-windshield` | 762×345 @131,339 | 49% → 41% | not registered |

`headlights`, `hood` and `windshield` are visibly centred product shots — big,
frame-filling, at their own flattering angle — so they fail on inspection as
well as on the number. `grille` is the ambiguous one: it *looks* small and in
place, so its failure may be a position offset rather than a re-render.

**Two caveats on this run, both worth fixing before batch 3.**

1. **The complete-car master was not in the drop.** The file offered as the
   source render is the *stripped* car with an opaque background, not the
   pre-strip frame. So this check ran against `landing-src/cutouts/car.png`, the
   P9.S2 master, as a proxy. The three passing scores (97/92/65) say that proxy
   is close enough to trust for those parts; the `grille` verdict should be
   re-run against the real master before regenerating it.
2. **Still 1024², and that now matters more.** With in-place isolation each part
   occupies only its own share of the frame, so resolution per part drops. At a
   1440px stage the car renders 835 CSS px = 1670 device px at DPR 2, while a
   1024² master carries only 823 px of car — **exactly 2× short**. `sprite-door`
   is 158 px native against 321 needed. A 2048² master lands within 1.5% of
   ideal for every part, which is why the brief asks for it.

## If a matched batch is not possible

Fall back to CSS 3D calibration, which is the owner's standing decision for the
current files: keep `grille` and `bumper` as delivered, accept `headlight` at
~32° `rotateY`, and treat `hood`, `windshield`, `door` and `fender` as the four
that will read as tilted photographs rather than fitted panels. That is a real
quality ceiling, not a temporary one — worth one more generation round to avoid.
