# Speed: what we measure, what was slow, and what changed

- **Date:** 12 October 2026
- **Branch:** `perf/silky`
- **Why:** Meet found the site slow to load, laggy between sections and unreliable to
  scroll, and asked for a full list of the metrics that describe that, the causes,
  and fixes until it feels instant.

All numbers are from Meet's laptop (AMD Radeon integrated graphics, a 144 Hz screen,
1440 × 900 window), on a local production build (`next build` + `next start`), in
Chrome 155, with the machine otherwise quiet. With other apps busy, frame rates ran
10–40% lower, and lower still on the phone emulation. "Phone" is the same machine
emulating a 390 × 844 phone at 3× density, with the CPU slowed 4×. A frame at 144 Hz has 6.9 ms; at 60 Hz, 16.7 ms.

## The metrics

### Loading

| Metric               | What it is                                                    | Target               | Before                             | Now                                   |
| -------------------- | ------------------------------------------------------------- | -------------------- | ---------------------------------- | ------------------------------------- |
| TTFB                 | First byte of the HTML                                        | < 200 ms             | 6–15 ms                            | same                                  |
| FCP                  | First text or image on screen                                 | < 1.0 s              | 0.34 s                             | 0.15–0.17 s                           |
| LCP, first visit     | Largest element painted                                       | < 2.5 s              | 3.8–3.9 s                          | 3.7–3.9 s (the opening, by design)    |
| LCP, returning visit | Same, for someone who has seen the opening                    | < 1.0 s              | 3.9 s                              | **0.15–0.3 s**                        |
| Time to usable hero  | Until the hero can be read and scrolled (`data-intro="done"`) | < 1 s returning      | 8.2 s every visit                  | 8 s first visit, **0.3–0.6 s** after  |
| CLS                  | Layout shift on load                                          | < 0.1                | 0.02–0.06                          | 0–0.03                                |
| Bytes on first load  | Everything fetched while the opening plays                    | as small as possible | 4.0 MB (3.5 MB of it music)        | ~0.5 MB; the music only after a press |
| Initial JS           | Scripts the home page needs, compressed                       | < 250 KB             | 265 KB (304 with legacy polyfills) | **214 KB** (254)                      |
| DOM size             | Elements on the home page                                     | < 1,500              | 1,111                              | 1,113                                 |

### Smoothness

| Metric                | What it is                                             | Target                | Before                                               | Now                                                     |
| --------------------- | ------------------------------------------------------ | --------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Hero at rest          | Frame rate with nothing moving but the sky             | screen rate           | 48 fps, p95 42 ms                                    | **144 fps, p95 7 ms**                                   |
| Scroll, warm          | A steady scroll through every chapter, after the first | screen rate           | 23 fps, p95 104 ms, worst 605 ms                     | **132–137 fps, p95 7–14 ms**, worst 28–49 ms            |
| Scroll, first time    | The same, the first time through                       | > 90 fps              | 23 fps                                               | 106–111 fps, worst ~230 ms (shader compiles, see below) |
| Wheel                 | Real wheel notches, 36 in 2.5 s                        | screen rate, no drift | 29 fps; the page kept moving after the wheel stopped | 122 fps; the page stops when the wheel does             |
| Index jump            | Gliding from Earth to a far chapter                    | screen rate           | 47 fps                                               | 92–122 fps                                              |
| Each piece at rest    | Frame rate holding each of the 14 pieces               | screen rate           | 37–128 fps                                           | 133–144 fps                                             |
| Long animation frames | Frames over 50 ms during a scroll                      | 0 warm                | 25 a pass, 1.2 s blocked                             | 0–1 a pass warm                                         |
| Phone, warm scroll    | Phone emulation, 4× slower CPU                         | ≥ 60 fps              | not measured                                         | 63 fps, p95 28 ms                                       |
| Phone, hero at rest   | Same                                                   | ≥ 60 fps              | not measured                                         | 95–106 fps                                              |

### Work per frame (what the frame rate is made of)

| Metric                            | Before                                                  | Now                                             |
| --------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| Text draws (`fillText`) per frame | 3,800–11,000 while scrolling, 7,800 every 50 ms at rest | 0–9                                             |
| Deep sky, per moving frame        | 6.5 ms mean, 11 ms p95                                  | 1.5 ms mean, 2.8 ms p95                         |
| Work bodies, per moving frame     | 4.2 ms mean, 12.5 ms p95                                | 1.7 ms mean, 7.7 ms p95                         |
| Main-thread busy, warm scroll     | ~90%                                                    | ~46%                                            |
| Page repaints during a scroll     | the whole document on nearly every frame                | only what changed                               |
| Layout invalidations, one scroll  | 1,652 (one button) + 590                                | under 100                                       |
| JS heap after a full pass         | 108 MB                                                  | 15–20 MB live after GC (no leak across reloads) |

## What was slow, and why

1. **Every body was thousands of separate text draws.** Earth, the deep sky and each
   piece of work are set in characters, drawn one `fillText` at a time: 8,000 of them
   took 16 ms on this machine. Moving the camera redrew all of it on every frame, so
   a scroll cost 30–100 ms a frame. At rest, Earth was redrawn 20 times a second,
   which held the hero at 48 fps.
2. **The wheel was taken over by JavaScript.** Each notch moved a target, and every
   frame the page was eased towards it with `scrollTo`. The page could only move when
   a frame finished, so slow frames made it stand still and then jump, and it kept
   gliding after the wheel stopped. This was the "unreliable scrolling".
3. **The 3D splats were built in the middle of a scroll.** three.js and Spark compile
   their shaders and resize synchronously, which blocked the page for 0.6–1.2 s just
   as the Carnegie Mellon chapter came into view. Each splat file is also 16.5 MB.
4. **The page re-laid itself out on every frame.** The chapter index's dash animated
   its `width`, which is a layout property, and it changes every time a chapter does.
   "Back to Earth" read the page's height on every scroll event. The music button's
   SVG bars animated a transform that only the main thread can run. Together they
   repainted and re-layered the whole document nearly every frame.
5. **The animated figures drew at 144 fps.** Each figure redraws its whole SVG, and
   the page under it, every frame. That held the figure chapters at 41–56 fps even
   when nothing was scrolling.
6. **Smaller costs:**
   - Each chapter change re-rendered the whole page in React.
   - The deep sky's light (212,000 texels of noise) was measured on the main thread,
     and finished by the frames if you scrolled before it was done (one 209 ms frame).
   - Each spoken title made a new `AudioContext` (about 70 ms).
   - The 3.5 MB music file downloaded on every visit, even though it could not play
     before a press.
   - The 8 s opening replayed on every visit and every reload.

## What changed

- **Characters on the GPU** (`glyph-gl.ts`). Each character is drawn once into an
  atlas. A layer's characters are gathered and drawn by WebGL2 in one instanced call,
  then copied into the 2D canvas where they belong, so the drawing order is kept.
  New characters upload only their own few pixels. `fillGlyphs` serves every glyph
  layer, and `dot()` serves the 900 background stars.
- **The deep sky's glow on the GPU** (`dither-gl.ts`). A fragment shader does the
  same work as the old JavaScript loop over ~150,000 dots: the bilinear light, the
  Bayer threshold, the breath, the integer-hash sparkle and the pointer's stir. It
  matches the old output to within 0.6/255 on average.
- **Bodies carried, not recomputed** (`render.ts`, `BodyCache`). While the camera
  moves, each body's cells are moved with it and reshaded only at the rate they
  change anyway (every 72–92 ms, staggered). The pointer's scanner still answers on
  every frame.
- **The sky measured in a worker** (`cosmos.worker.ts`, `cosmos-off-thread.ts`), and
  its GPU upload warmed in a quiet moment.
- **Native scrolling** (`smooth-scroll.ts`). The wheel, trackpad and touch are the
  browser's own again, on the compositor. The keys and the menus still glide a
  chapter at a time, and any wheel or touch cancels a glide.
- **No layout on every frame:**
  - The index's dash grows with `scale` and its label slides with `translate`, to the
    same final geometry as before.
  - "Back to Earth" watches a 1 px mark instead of measuring the page.
  - The music bars are now boxes, whose animation runs on the compositor.
  - The current chapter comes from an `IntersectionObserver`.
  - The canvas writes its cursor style only when it changes.
- **The current chapter lives in the index** (`ChapterIndex`), so a chapter going by
  re-renders the index, not the page.
- **Splats on intent** (`splat.ts`). The photograph shows until a pointer or focus
  reaches it, which is pixel for pixel what the splat shows at rest. The file is
  fetched in the background once the chapter has held the screen for 1.2 s.
- **Figures paced** (`pale-blue-dot-figures/anatomy/common.mjs`, `paced`). They draw
  at most 30 times a second (as their preview loops do, so they move at the same
  speed) and hold still while the page scrolls.
- **The opening once a month** (`visit.ts`). A visitor who has seen it in the last
  30 days lands on the hero, and Earth grows in. An inline script marks `<html>`
  before the first paint, so the black never shows.
- **Smaller changes:**
  - The music file is fetched only once it can play.
  - Google Analytics loads when the page is idle.
  - One audio device is shared by every spoken line, and is suspended between them.
  - The canvas is opaque.

- **Other browsers** (`copy-gauge.ts`, and a CPU path in `glyph-gl.ts`). Copying
  a WebGL canvas into a 2D canvas is free in Chrome but a GPU readback in Firefox
  (13 ms a copy, much of it deferred where it can't be timed). With the GPU layers,
  Firefox ran slower than with plain `fillText`. So Firefox draws the characters on
  the CPU instead: each character's coverage is kept as a mask, a layer is
  composited into pixels and put into the canvas in one go. The deep sky uses its
  old CPU dither there. Elsewhere the GPU layers time their first copies and step
  aside if those turn out to be readbacks (Chrome without hardware acceleration,
  for instance). Where WebGL2 is missing or lost, the CPU path draws.
- **Icons without `motion`** (`site/icons.tsx`, `icons.module.css`). The Animate UI
  icons brought the whole of `motion` and `tailwind-merge` onto every page for a
  nudge, a turn and a wiggle. The same motions are now CSS, on the control marked
  `data-animate-icon`, and still under reduced motion. `animate-ui/`, `lib/utils.ts`,
  `components.json`, and the `motion`, `clsx` and `tailwind-merge` dependencies are
  gone. The home page's scripts went from 304 to 254 KB compressed (39 KB of that is
  the legacy polyfills, which current browsers never fetch).
- **Lighter shading at rest.**
  - The constellation skips its star and line tests for cells outside the figure's
    reach, and the Milky Way's noise where no density could show a cell.
  - The planet works its moons out once a frame instead of once a cell, and no
    longer makes two closures for every cell.

  The results are the same to the bit. The constellation's cost halved (309 → 152 ms
  in 2 s), the planet's fell by a quarter, and every piece now holds 133–144 fps at
  rest.

`?glyphs=text` draws the old way (fillText and the CPU dither) and `?glyphs=cpu` with
the CPU path, so each can be compared side by side.

### Other browsers

Measured on the same machine, with Playwright's builds.

|                                     | Before       | Now                                         |
| ----------------------------------- | ------------ | ------------------------------------------- |
| Firefox, hero at rest               | 13–14 fps    | 60–72 fps                                   |
| Firefox, warm scroll                | 7–11 fps     | 35–36 fps                                   |
| WebKit (Windows build), warm scroll | not measured | 10 fps with the GPU layers, 6–8 fps without |

Firefox is still well behind Chrome. Its 2D canvas spends 0.4 ms on each gradient
fill and 0.8 ms on each full-screen layer copy, against a fraction of that in Chrome.
Playwright's WebKit on Windows renders in software, so it says nothing about Safari
on a Mac beyond "no errors". Safari on a Mac draws its canvases on the GPU, so it
should behave like Chrome, but it hasn't been measured.

### The first scroll of a first visit

The first scroll of a browser's first ever visit still has two or three stalls of
200–450 ms. Each is Chrome compiling GPU shaders the first time a kind of drawing
appears: an SVG figure's first paint, a body's first glow. Hidden, a stall moves on
to the next new drawing. Chrome keeps compiled shaders in the visitor's profile. In
a second launch on the same profile, the first scroll ran at 126–130 fps with no
stall over 97 ms.

## Left to do

- **Google Analytics:** its scroll tracking cost up to 0.4 s of main thread per
  scroll pass when it loaded early (now it loads when the page is idle). Turning off
  "Scrolls" in the data stream's Enhanced measurement settings would remove it.
- **Safari on a Mac and real phones** need measuring on the devices themselves.
- **Firefox** could go further by drawing the deep sky's glow and the bodies' haze
  with less canvas work: fewer gradient fills, and fewer full-screen layer copies.

## How to measure again

The scripts live outside the repo, in `../.perf/`. Build and serve the site on :3100
first, then run `node run.mjs <script> --headed` (add `--firefox` or `--webkit` for
the other engines; their builds are in `../.perf/pw-browsers`, so set
`PLAYWRIGHT_BROWSERS_PATH` to it):

- `bench.js` runs everything in the tables above.
- `mobile.js` runs the phone emulation.
- `sweep2.js` does three scroll passes, with a breakdown of every long frame.
- `xbrowser.js` compares the drawing paths in any engine, and `persist.mjs` scrolls a
  first visit three times on one profile.
- `trace-warm.js` and `trace-inval.js` record a Chrome trace of a scroll, and
  `tracesum.mjs` totals it by thread and event.
- `analyze.mjs` and `mapsrc.mjs` map CPU profiles back to source lines. They need a
  build with source maps (`productionBrowserSourceMaps: true`).

All the scripts block Google Analytics' collection, so test runs never reach the
property.
