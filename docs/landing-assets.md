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

**There is no grille render.** `fableTasks.md` §3.2 lists one; it does not
exist. The hero's body/front chapters compose from the ten files above only —
do not reserve a slot for a part that was never generated.

**The vehicle is a classic fastback coupe, not a domestic sedan.** Owner-known
and owner-decided (`fableTasks.md` §7.2): launch ships this set as workshop
atmosphere, and a later batch regenerates `car` / `door` / `hood` / `fender`
plus the plates and clips as a brand-free sedan nearer the Saipa / Iran Khodro
fleet. The names above make that a drop-in swap — no code changes, same paths.

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

## Tooling status

`sharp` (manifest-approved, §4) installs at P9.S3 and handles every image
operation. **`ffmpeg` is not installed on the dev machine** (verified
2026-08-20) — it is a local tool, not a repo dependency, and the video posters,
mirrored variants and re-encodes need it. The image pipeline does not depend on
it, so S3's image work proceeds either way; the video half waits for the owner
to install it or is deferred with the video beats.
