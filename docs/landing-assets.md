# Landing render assets — inventory and provenance

Companion to `masterPlan.md` PHASE 9 and `fableTasks.md` §3. Records what the
owner supplied for the P9 landing rebuild, what each file actually contains
(verified by opening it, not by trusting its filename), and where it lives.

Written at **P9.S2**, 2026-08-20.

## Where the files are

| Location | Contents | Tracked? |
|---|---|---|
| `landing-src/` (repo root) | the 28 masters below, 113MB | **No** — git-ignored |
| `apps/web/public/landing/` | optimized AVIF/WebP/MP4 emitted by `scripts/optimize-landing.mjs` | Yes, created at **P9.S3** |

Masters stay off git deliberately: 113MB of 2048² PNG in history would outweigh
the entire rest of the repo, and every byte of it is regenerable output from the
owner's generation pipeline. They live on the owner's disk; **if that disk is
the only copy, back it up** — nothing in this repo can restore them.

There is no `apps/web/public/Landing/` any more (capital L). It was renamed
because production URLs are case-sensitive even though Windows dev is not. No
code referenced the old path (grepped at S2), so nothing had to be updated.

## `landing-src/cutouts/` — 10 part renders

2048×2048 PNG, 8-bit **RGBA with real transparency** — verified by decoding the
alpha channel, not by trusting the color-type byte: 74–90% of pixels are fully
transparent, corner alpha is 0, the subject is opaque, and the ~15% partial band
is antialiased edge plus a retained soft contact shadow. These composite onto
any surface. 4.7–7.0MB each.

| File | Contents | Was |
|---|---|---|
| `car.png` | full vehicle, front ¾, steel-blue classic fastback coupe | `car.png` |
| `headlight.png` | chrome round sealed-beam headlight, wired | `lightning.png` |
| `bumper.png` | front chrome bumper | `bumper .png` (space in name) |
| `piston.png` | piston + connecting rod | `pistoncylinder.png` |
| `alternator.png` | alternator | unchanged |
| `air-filter.png` | round chrome air-cleaner assembly | `airFilter.png` |
| `door.png` | door panel | unchanged |
| `hood.png` | hood panel | unchanged |
| `fender.png` | front fender | unchanged |
| `windshield.png` | windshield glass | unchanged |

**There is no grille render _in this group_.** True as written at S2, and still
true of the ten standalone cutouts — but the P9.S5 hero batch below does supply
`sprite-grille.png`. These ten stay the un-trimmed, un-docked set: chip artwork,
category pages, and the three engine risers the hero floats out of the bay.

**The vehicle is a classic fastback coupe, not a domestic sedan.** Owner-known
and owner-decided (`fableTasks.md` §7.2): launch ships this set as workshop
atmosphere, and a later batch regenerates `car` / `door` / `hood` / `fender`
plus the plates and clips as a brand-free sedan nearer the Saipa / Iran Khodro
fleet. The names above make that a drop-in swap — no code changes, same paths.

## `landing-src/hero/` — 1 stripped base + 7 docked sprites (P9.S5)

Added 2026-08-22. The docked-sprite hero set (`fableTasks.md` §3.2): one car
with parts removed, plus a cutout of each removed part. At scroll 0 the sprites
sit docked in their home positions and the composite reads as a complete car;
on scroll they undock and leave real apertures.

1024×1024 PNG, 8-bit RGBA. Alpha is **binary** — ~83% of pixels fully
transparent, ~17% near-opaque, and under 0.2% in the semi-transparent band, so
the Higgsfield removal left clean hard mattes with no grey halo to composite
around. 1.1–1.4MB each. The owner dropped these into
`apps/web/public/landing/` by mistake; they were moved here and each rename was
verified by re-measuring its alpha bounding box, not by trusting the order.

| File | Contents | Was | Trimmed box in the 1024² master |
|---|---|---|---|
| `car-stripped.png` | the coupe with bumper, grille, headlights, hood, driver door, driver fender and windshield removed; engine bay and interior exposed | `incompleteCar.png` | 823×367 @ 103,333 |
| `sprite-hood.png` | hood panel | `hf_20260822_163517_5236f36e….png` | 841×380 @ 93,316 |
| `sprite-door.png` | driver door with glass and mirror | `hf_20260822_163520_d08f5557….png` | 761×593 @ 131,211 |
| `sprite-fender.png` | front fender | `hf_20260822_163523_10974f72….png` | 815×381 @ 103,328 |
| `sprite-bumper.png` | front chrome bumper bar | `hf_20260822_163526_dfbe5ba6….png` | 822×232 @ 102,413 |
| `sprite-grille.png` | chrome slatted grille | `hf_20260822_163532_40c7d0d2….png` | 786×249 @ 99,396 |
| `sprite-headlight.png` | round sealed-beam headlight | `hf_20260822_163536_7fb1b73f….png` | 510×575 @ 262,225 |
| `sprite-windshield.png` | windshield glass with wipers | `hf_20260822_163539_5281354c….png` | 864×440 @ 62,310 |

**`car-stripped.png` is not a mask of `cutouts/car.png`.** Measured at S5: a
per-pixel diff shows 56% of body pixels changed, spread across the whole car
rather than concentrated in the removed regions. They are independent
generations that happen to share framing (silhouette bounding boxes agree to
~6px). So dock coordinates cannot be derived by differencing the two, and the
sprites cannot be cut out of the complete car.

**The sprites are hero-framed product shots, not in-place renders.** Each is
centred and filled to its own canvas — `sprite-door` trims to 761×593 while the
entire car is 823×367 — so the trim offsets recorded in the manifest do **not**
give dock positions either. Docking is hand-calibrated in
`components/landing/HeroV2/heroLayout.ts`.

**Their camera angles are neutral, not matched to the base.** The base is a ¾
front-left view; `door` and `fender` are dead-on side profiles and `headlight`
is a face-on circle. Owner decision 2026-08-22: close the gap with CSS 3D
rotation per sprite rather than regenerate the batch — rotating a near-planar
panel under a shared stage perspective is the geometrically correct operation,
and turns the headlight circle into the ellipse its bucket needs.

## `landing-src/plates/` — 4 atmosphere plates

1376×768 PNG, RGB, no alpha, on a near-black ground (`graphite-950`-class).
0.7–1.6MB each. Renamed from `hf_20260819_174532_<uuid>.png`; each name below
was assigned after opening the file.

| File | Contents |
|---|---|
| `plate-overhead.png` | bird's-eye of the whole car, centered |
| `plate-front.png` | front ¾ close-up — grille, bumper, headlights |
| `plate-engine.png` | **open engine bay with piston, alternator and air filter floating out** — already an exploded composition |
| `plate-body.png` | rear ¾ with hood, door and fender detached and floating — the body-panel exploded composition |

`plate-engine` and `plate-body` are the strongest assets in the set: they are
literally the engine and body chapters of the Exploded View, pre-composed.

**All four are framed for LTR** — the subject occupies the two-thirds toward the
viewer's right, leaving an empty third on the left. Persian is RTL, where copy
starts on the right, so the shipped defaults are the **horizontally mirrored**
variants (`fableTasks.md` §3.3, owner-approved). Nothing in frame — no text, no
badge, no plate number — betrays the mirror.

## `landing-src/video/` — 4 clips

2560×1440 H.264 MP4, 5.2s each, 2.1–3.5MB. Renamed `section<n>.mp4` →
`chapter-<n>.mp4`. Same dark ground and LTR framing as the plates, so the same
mirroring rule applies.

Planned use (`fableTasks.md` §3.3): `chapter-2` stages the authenticity story,
`chapter-4` gives the closing beat its ambience, `chapter-1` and `chapter-3` are
not shipped on the route in v1. Desktop only (≥1024px), autoplay muted, looped,
`playsInline`, `preload="none"`, poster first. Mobile and
`prefers-reduced-motion` get the poster image and fetch zero video bytes.

## `landing-src/samples-opaque/` — superseded

The original opaque (RGB, no alpha) versions of all ten part renders, kept only
as reference for what the cutouts were cut from. Nothing should ship from here.

## Rules that govern how these may be used

From `apps/web/design-quality.md`, and binding:

> Generated brand artwork may establish atmosphere, but must never impersonate a
> product photo, certificate, supplier record, customer, or business result.

So: a render may headline a system, carry an editorial beat, or serve as the
Exploded View's own artwork. It may **not** sit inside a product card as though
it were the catalog photo of a real SKU, and it may **not** appear as
authenticity or inspection evidence. Product media comes from the catalog; a
missing image stays honestly missing.

## Optimized outputs — `apps/web/public/landing/` (P9.S3)

`pnpm optimize:landing` (→ `scripts/optimize-landing.mjs`) turns the masters
above into the committed, pre-optimized set. It is **run by hand**, not wired
into the build: CI stays fast and every shipped byte arrives as a reviewable
diff. Re-run it whenever a master changes; `--clean` wipes the output directory
first, `--skip-video` does images only.

| Group | Output | Widths | Notes |
|---|---|---|---|
| `cutouts/` | `<part>-<w>.avif` + `.webp` | 480 · 768 · 1024 · 1440 | alpha preserved, **not** mirrored, **not** trimmed |
| `hero/` | `<layer>-<w>.avif` + `.webp` | per asset: 480 + its own trimmed width | **trimmed** to the bounding box, alpha preserved, not mirrored |
| `plates/` | `<plate>-<w>.avif` + `.webp` | 480 · 768 · 1024 · 1376 | **mirrored** (RTL default); 1376 is the source width, never upscaled |
| `video/` | `chapter-<n>.mp4` | 1920×1080 | **mirrored**, audio stripped, H.264 high/CRF 25/preset slow, `+faststart` |
| `video/` | `chapter-<n>-poster-<w>.avif` + `.webp` | 768 · 1024 · 1440 | frame 1 of the *encoded* clip, so the poster is mirrored identically |

158 files, **6.08MB committed** (cutouts 2.05MB · hero 484KB · plates 487KB ·
video 3.07MB). Encoder settings: AVIF q55 effort 6, WebP q72 effort 5, metadata
stripped. Only `chapter-2` and `chapter-4` are encoded — 1 and 3 stay in
`landing-src/` as marketing material and never enter git.

**Trimming is opt-in per group and must stay that way.** `heroLayout.ts`
positions the cutouts by their centre inside a 2048² frame, so trimming that
group would silently move every part on the shipped hero. A test asserts the
cutouts are untrimmed and the hero layers are.

**The hero ladder is per asset.** `fableTasks.md` §3.2 asks for 480/768/1024/
1440, which these masters cannot deliver: they are 1024² and the widest layer
trims to 864px. Rather than upscale, each trimmed asset contributes its own
native width as the top rung, stock rungs within 10% of it are dropped as
redundant, and 480 stays for mobile. So `car-stripped` emits 480 + 823 and
`sprite-headlight` emits 510 alone. Dropping 768 is not lossy — `car-stripped`
measures 20.2KB at 768w against 19.9KB at its native 823w, so the resample costs
more bytes than the full-resolution crop.

`apps/web/lib/landing-assets.json` is the generated index: intrinsic size,
alpha, mirrored flag, trim box and per-width byte counts for every asset. It is
the machine-readable half of this table — regenerated by the same script, never
hand-edited. Since P9.S5 it is also **load-bearing**: `lib/landing-image.ts`
reads every `srcset` from it instead of declaring width ladders by hand, so a
`srcset` cannot name a file the pipeline did not write. Two consequences —
`pnpm optimize:landing` must be run and committed *before* code that references
a new asset will type-check, and a `--skip-video` run now carries the previous
run's video entries forward rather than emptying the group (don't combine it
with `--clean`, which deletes the files those entries name).

### Budget receipts (fableTasks §6)

| Budget | Ceiling | Measured |
|---|---|---|
| Hero LCP candidate (`car` AVIF, largest breakpoint) | ≤90KB | **30.0KB** |
| Docked-hero LCP candidate (`hero/car-stripped` AVIF, largest rung) | ≤90KB | **19.9KB** |
| Seven docked sprites combined, AVIF at largest rung | ≤120KB | **78.7KB** |
| Images fetched per view, desktop worst case | ≤1.2MB | **465KB** (all 10 cutouts @1440 + 4 plates @1376 + 2 posters @1440) |
| Images fetched per view, mobile | ≤1.2MB | **128KB** (480w set + 768w posters) |
| Two shipped clips, combined | ≤3MB | **2.74MB** (1.41 + 1.33) |
| Video bytes on mobile | 0 | 0 — below 1024px the slots render posters only |

CRF 25 is the tightest setting that keeps both clips under the 1.5MB-each
ceiling; CRF 23 produced 1.86MB / 1.75MB and blew the combined budget.

Verified rather than assumed, at S3: all four plates and both clips are
horizontally mirrored (per-pixel diff against `flop(source)` ≈1–2.5/255,
i.e. codec noise, versus 19–70 against the unflipped source); cutout AVIF and
WebP keep a real alpha channel (`car-1440`: 82% fully transparent, matching the
master); sharp introduces **no color drift** on the dark ground (source corner
`rgb(9,17,20)` → output `rgb(9,17,20)`, sitting just under
`--color-graphite-950` `#0e1418`); both MP4s carry one video stream, no audio,
`moov` inside the first 4KB.

## Tooling status

`sharp` (manifest-approved, §4) is installed at the workspace root and handles
every image operation.

**`ffmpeg` 9.0 is installed** (Gyan.FFmpeg via winget, 2026-08-20, owner-
approved). It is a **local tool, not a repo dependency** — nothing in the build
or test path touches it, and the pipeline degrades gracefully without it
(images still emit; the video half prints a skip notice). The script finds it
through `$FFMPEG_DIR`, then `PATH`, then the winget package directory, because
winget's shim folder is not on every shell's `PATH`.
