# Site navigation, star field and footer

- **Date:** 21 August 2026
- **Branch:** `feat/grain-everpresent`
- **Why:** The warp had no destination. There was one route, no navigation, and
  nothing past the hero but a placeholder paragraph. This builds the other side
  of the flight: a bar that stays out of the way during the warp, a sky that
  persists across every route, a footer, and five coming-soon pages so the links
  go somewhere real.

The pages themselves are deliberately unbuilt — each one gets designed on its
own. This is the shell and the way in.

## What changed

**Navigation.** A fixed bar in the root layout, hidden through the hero and
faded in when the warp completes. Four single-word links — About, Work, Story,
Contact — plus a resume control. Below 720px they collapse into a full-screen
menu. `src/styles/horizon/nav.css` is the first component stylesheet in the
project; the nav needs pseudo-classes, media queries and attribute selectors,
none of which the repo's inline-style convention can express.

**The gate.** `HeroWarp` renders a 1px `data-hero-end` marker at the bottom of
its scroll runway. `useHeroGate` observes it and answers one question — "are we
past the warp?" — for the bar, the star field and both edge ramps, so there is
one IntersectionObserver rather than four. No scroll listener, no rAF: the bar
re-renders twice per crossing.

**Star field.** `src/components/horizon/star-field.tsx` — one fixed canvas
behind the whole document, mined from `night-horizon.tsx` but stripped to stars.
Runs at 30fps, pauses while the hero covers it and while the tab is hidden, and
renders a single static frame under `prefers-reduced-motion`. Star positions are
normalised 0..1 rather than absolute: a full-viewport fixed canvas resizes every
time a mobile toolbar shows or hides, and the hero's regenerate-on-resize
approach would reshuffle the entire sky mid-scroll.

**Footer.** The dot field is the footer's ground rather than a band — absolutely
positioned across the whole block, solid at the bottom edge and fading out over
the top 62%. Links, icon row and small print sit on top of it, placed down that
fade so each has thin dots behind it. The name sits in the field itself at
`textY: 0.64`.

Sections below the hero (`arrival.tsx`, `coming-soon.tsx`) are transparent
rather than `--bg-page`, or they would paint black over the sky.

## The dependency decision

This repo had three runtime dependencies and hand-rolled every animation as rAF
plus refs. Animate UI's animated icons were an explicit product requirement —
icons that animate on hover of the whole control, not just the icon — and they
are built on Motion.

**Measured cost: client JS went from 174.8 kB to 233.4 kB gzip, +58.6 kB.** That
is on every route, because the nav lives in the root layout. The estimate before
measuring was ~35 kB; the real number is most of a Motion DOM engine plus the
icon controller, and it is worth knowing honestly.

`AnimateIcon`'s `asChild` prop is what makes the requirement work: it renders a
Slot that composes the pointer handlers onto the child, so the `<Link>` itself
becomes the hover target. Without it you get a wrapper span and only the icon's
own box responds. Animate UI ships `animateOnHover` / `Tap` / `View` but no
`animateOnFocus`, so every wrapper here drives `animate` from its own focus
state to give keyboard users parity.

**`npx shadcn@latest init` was deliberately not run.** Its base style writes a
competing token system into `globals.css` — `--background`, `--foreground`, a
`.dark` block, a second `@theme inline`, and `body { @apply bg-background
text-foreground }`, which would override `base.css` outright. Instead
`components.json` and `src/lib/utils.ts` were hand-authored and only the icon
registry items were pulled. `globals.css` gained exactly one line: the `nav.css`
import.

The generated files are quarantined. `eslint.config.mjs` turns off three React
Compiler hook rules for `src/components/animate-ui/**` and
`src/hooks/use-is-in-view.tsx` only — they trip those rules by construction, and
any fix applied in place would be lost on the next `shadcn add`. Nothing
hand-written imports `cn` or uses a Tailwind utility class outside
`src/components/ui/`.

One consequence worth recording: `npm run format` reformats the generated files
(single quotes to double, 88 columns) and `prettier-plugin-tailwindcss` reorders
their utility classes, so they are no longer byte-identical to the registry. A
future re-add will show a diff.

## Vendored components

Three came from outside and none survived unchanged.

**`FlickeringGrid`** (21st.dev) — the footer's dot matrix. The render path was
rebuilt because the original could not run at this size:

- The text mask was read back **once per cell, per frame**. `getImageData` ran
  for every square every frame — roughly 16,000 GPU readbacks a frame, each a
  pipeline stall. The mask only depends on size, text and font, so it is
  rasterised once into a `Uint8Array` of per-cell flags.
- Every frame repainted every cell. Only about a third of a percent of cells
  actually change on a given frame, so the loop now takes that count and picks
  exactly that many at random. Per-frame work is proportional to what visibly
  changed, not to the grid — which also removed 16,000 RNG calls per frame spent
  deciding.
- `fillStyle` was a fresh template string per cell. Opacity is quantised into
  `LEVELS` steps in a `Uint8Array` with the colour strings precomputed per step.
- `color-bits` was dropped (it appended a probe to `document.body` on every
  render to resolve a CSS variable), as was `@radix-ui/react-icons`. **The footer
  added no npm dependencies.**
- Added: `fitWidth` (measure the text and scale, instead of guessing a px size
  per breakpoint), `textY`, `textMaxOpacity`, and a reduced-motion static frame.

**`ProgressiveBlur`** (reference implementation) — the two edge ramps. Rendered
each layer as a `motion.div`; nothing animates, so they are plain divs now. Band
positions are shaped by a `curve` exponent below 1, because evenly spaced bands
are what make a ramp feel rigid — the strip spends as much length going from
clear to slightly blurred as from mostly to fully blurred, and the eye finds an
edge in the middle of it.

**`StarButton`** (21st.dev) — was going to be the resume control, and was
**removed**. Its `dark:` variants were the tell: this site is dark-only via
`color-scheme` with no `.dark` class, so Tailwind's `dark:` follows the operating
system and a visitor in light mode would have got the light treatment on a black
page. Once that and the travelling border light were gone there was nothing left
worth keeping, and the control is now pure CSS on `.hz-resume`.

## Five things that were not obvious

**`ctx.font` silently rejects any string containing `var()`.** The dot-matrix
band was handed `var(--font-anton), Impact, sans-serif` — a perfectly good CSS
font stack and a completely invalid canvas font string. The context kept its
`10px sans-serif` default and rasterised the name as a smudge. No warning, no
throw. Anything going into `ctx.font` has to be resolved through
`getComputedStyle` first, and `document.fonts.load()` has to be awaited before
rasterising, because on a route that does not otherwise set that face nothing
would have triggered the download.

**`backdrop-filter` needs a backdrop root, and opacity destroys it.** Any
ancestor at `opacity < 1` becomes the backdrop root, so a ramp that fades in has
nothing to sample for the whole length of its own fade — and browsers are
unreliable about re-establishing the backdrop once the value lands back on
exactly 1. This was diagnosed twice and fixed once: moving the ramp out of
`.hz-nav` only moved the opacity transition onto the new host. The working shape
is two elements — `.hz-edge-blur` carries the filter, is mounted only while it
should show and never animates; `.hz-edge-veil` is a plain gradient and does the
fading.

**A blur can only redistribute what is behind it.** Over a black page with 1px
stars there is nothing to smear — blurring a 1px dot spreads it to invisibility
rather than into a streak. The ramps carry a light tint for exactly this reason:
it holds contrast under the links where a bright star drifts past. The blur is
only visible where real content passes under the bar.

**The star field's reveal was a geometry problem, not a timing one.** The hero's
runway is opaque and the canvas is fixed behind everything, so mid-transition the
runway covers the top of the viewport and the sky shows through the bottom — and
any difference in brightness across that boundary draws a line, however slowly
the brightness got there. A global ramp cannot fix it: it changes the value on
both sides equally. Fading each star by its own distance below the edge does,
because it makes the two sides meet at the same value. `REVEAL_MS` then handles
the "over time" half.

**The overscroll strip is painted from the root element.** Nothing inside the
footer can reach the band revealed by bouncing past the end of the document.
`html` now carries a dot-pattern background at the footer field's exact pitch and
colour; giving it a background stops `body`'s from propagating to the canvas, so
`body` paints only its own box and the pattern shows through precisely where the
document ends. It cannot flicker — it is a background image, not the canvas — but
it is only ever visible for the length of a rubber-band.

## Gotcha

Adding a new `@import` to `globals.css` does not invalidate the Turbopack dev
cache. `next dev` kept reporting `Can't resolve '../styles/horizon/nav.css'` for
a file that existed and that `next build` compiled fine, across two server
restarts. `rm -rf .next` fixed it.

## Files

**New:** `components.json`, `src/lib/utils.ts`, `src/components/animate-ui/**`,
`src/hooks/use-is-in-view.tsx`,
`src/components/site/{site-nav,site-chrome,site-footer,coming-soon}.tsx`,
`src/components/site/use-hero-gate.ts`,
`src/components/horizon/star-field.tsx`,
`src/components/ui/{flickering-grid,progressive-blur}.tsx`,
`src/styles/horizon/nav.css`,
`src/app/{about,work,story,contact,resume}/page.tsx`.

**Changed:** `src/app/{layout,page}.tsx` (chrome mounted, title template, skip
target), `src/app/globals.css` (one import),
`src/styles/horizon/{colors,spacing,base,motion}.css` (`--surface-glass`,
`--nav-h`, `--dur-arrive`, `scroll-padding-top`, the root overscroll pattern),
`src/components/site/hero-warp.tsx` (the marker),
`src/components/site/arrival.tsx` (transparent, clears the bar),
`eslint.config.mjs`.

Spec: [`plans/navigation-and-starfield-spec.md`](../plans/navigation-and-starfield-spec.md).

## Still open

- Both 21st.dev registry URLs return HTTP 403 without credentials, so those
  components were pasted in by hand rather than pulled by the CLI. There is no
  `shadcn add` path to re-sync them.
- The footer's GitHub and LinkedIn hrefs are placeholders.
- `/resume` is a real coming-soon route, not a download. When the PDF lands at
  `public/resume.pdf`, flip `RESUME_READY` in `site-nav.tsx` and delete
  `src/app/resume/page.tsx`; nothing else changes.
- Whether `motion` earns its 58.6 kB, or whether the icons should be hand-rolled
  as CSS-animated SVG to get back to zero runtime dependencies.
- None of this has been verified in a browser by the author of the code — every
  visual decision here was checked by the human, not by me.
