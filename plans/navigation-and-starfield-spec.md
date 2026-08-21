# Site navigation + the quiet side of the warp

## Context

The site currently has exactly two things: `HeroWarp` (a 240svh scroll runway that
warps into the night sky) and `Arrival` (a near-empty landing section that proves the
transition has a destination). There is no navigation, no second route, and nothing
past the warp except one paragraph of placeholder copy.

This change builds the _other side_ of the warp: a fixed navigation bar that stays out
of the way during the flight and fades in once the user lands, a persistent minimal
starfield behind everything below the hero, and four coming-soon routes so the nav
links go somewhere real. The user will design each of those pages individually later —
this pass only builds the shell and the way in.

Confirmed with the user:

- Nav labels are **single words**: About · Work · Contact · Story, plus a Resume control.
- Nav is **fixed, hidden during the warp, fades in when the warp completes**.
- Post-warp aesthetic is a **darker, quieter shift** — same fonts, same grain, but the
  blue goes away and the light drops.
- Icons come from **Animate UI** for real (installing `motion` + a `cn` helper is
  accepted), animating on hover of the **whole control**, not just the icon.
- Mobile uses a **menu button → full-screen overlay**.
- **Footer is out of scope** this pass.

Note on "darker": `--bg-page` is already `#000000`. The shift can't be a darker hex —
it has to be _less light_. Concretely that means no bloom below the hero, blue only on
hover/focus, body copy resting at `--text-muted`, and a star field noticeably dimmer
than the hero's (alpha ceiling 0.42 vs the hero's 0.62, twinkle rate roughly halved).

---

## Design constraints this repo already imposes

Read these before writing anything; new code that ignores them will look foreign:

- Filenames kebab-case, components PascalCase **named** exports (never default except
  route files). `"use client"` on anything with refs or effects.
- Styling is **inline `style={{}}` against CSS custom properties**, not Tailwind
  utilities. Custom properties passed through `style` with an `as React.CSSProperties`
  cast. Tailwind v4 is wired via `@theme inline` in `src/app/globals.css` but unused.
- Animation is **hand-rolled rAF + refs**; React state is avoided in hot paths.
  `src/components/site/hero-warp.tsx` treats "a full scroll-through costs no renders"
  as a requirement.
- `prefers-reduced-motion` is handled in **both** CSS and JS in every animated
  component. `src/styles/horizon/motion.css` already zeroes every `--dur-*` under
  reduced motion, so anything transitioning on a token gets this for free.
- Comments explain _why_ a value was chosen and what failed before. Match that register.
- `npm run ci` (format:check → lint `--max-warnings=0` → typegen+tsc → build) must pass.
- Tokens live in `src/styles/horizon/*.css`. **Exactly four text levels**
  (`--text-strong/body/muted/faint`) — that is a stated rule. `--bloom-*` "belongs to
  the horizon alone — never to a button, card or icon" (`effects.css:6`). Respect both.

---

## 1. Dependencies — install Animate UI without letting shadcn rewrite the design system

`npx shadcn@latest init` on a Tailwind v4 project writes its own token system
(`--background`, `--foreground`, `--primary`, a `.dark` block, its own `@theme inline`)
into `src/app/globals.css`. That would sit on top of Horizon and collide with it.

**So skip `init` entirely.** Hand-author the two files it would have made:

- `components.json` (repo root) — `"tailwind": { "config": "", "css":
"src/app/globals.css", "baseColor": "neutral", "cssVariables": true }`, `"rsc": true`,
  `"tsx": true`, aliases `@/components`, `@/lib/utils`, and a registry entry
  `"@animate-ui": "https://animate-ui.com/r/{name}.json"`.
- `src/lib/utils.ts` — the standard `cn` (`clsx` + `twMerge`). First file in `src/lib/`.

Then install by hand and add icons:

```
npm i motion clsx tailwind-merge
npx shadcn@latest add @animate-ui/icons-icon      # the AnimateIcon wrapper
npx shadcn@latest add @animate-ui/icons-<each>    # see icon list below
```

Files land in `src/components/animate-ui/icons/`. **After every `add`, run
`git diff src/app/globals.css` and revert any token block the CLI slipped in.** Then
`npm run format` over the generated files (they will not match printWidth 88) and
`npm run ci`.

Icon slugs to verify against `animate-ui.com/docs/icons` at implementation time (they
track lucide names, but confirm before running): `user`, `layers`, `mail`, `book-open`,
`download`, `menu`, `x`.

Animate UI's own troubleshooting page warns that **the CLI does not always respect
`components.json` aliases** and recommends manual installation. If `add` writes to the
wrong path, the fallback is to copy each icon's source from its docs page into
`src/components/animate-ui/icons/` by hand and fix the `@/lib/utils` import — the files
are self-contained `motion` SVG components, so this is mechanical, not a rewrite.

Confirmed API (this is the whole reason for the dependency):

```tsx
<AnimateIcon animateOnHover>
  <Download />
</AnimateIcon>
```

`AnimateIcon` passes the trigger down to any icon in its subtree, so wrapping the entire
`<Link>` / `<a>` makes the icon animate on hover of **any part of the control** — which
is exactly the requirement.

**Cost, stated plainly:** this is the repo's first runtime dependency beyond
next/react/react-dom, and `motion` is ~35kb gzip. It only ever gets imported by the nav's
client components, so the hero's canvas path stays untouched — but it will be in the
shared client bundle on every route. Accepted by the user.

---

## 2. Where the nav lives

`SiteNav` renders in `src/app/layout.tsx`, as a client child of the server layout, above
`{children}`. That puts it on every route.

Visibility is decided **without a scroll listener**:

```tsx
const isHome = usePathname() === "/";
const [revealed, setRevealed] = useState(!isHome);
```

Starting from `!isHome` means subroutes render the nav visible on the server — no
hydration flash — while `/` starts hidden. On `/` only, an `IntersectionObserver`
(no `disconnect`, so scrolling back up re-hides it) watches a sentinel.

**The sentinel:** a 1px, `aria-hidden`, absolutely-positioned div at `bottom: 0` of the
runway in `src/components/site/hero-warp.tsx`, tagged `data-nav-gate`. The arithmetic
works out exactly: the runway is 240svh and the sticky stage 100svh, so
`rect.bottom === viewportHeight` precisely when the warp's own `scrolled` hits 1.0. The
sentinel entering the viewport _is_ the warp completing — no magic numbers, no
`rootMargin` tuning, and it costs two state flips over an entire scroll rather than one
per frame.

`SiteNav` finds it with `document.querySelector("[data-nav-gate]")` inside the effect.
If it is absent (any non-home route), the nav is already visible and no observer is made.

Rejected: passing a prop from `page.tsx` (nav would have to move out of layout, breaking
subroutes); context (a provider for one boolean); reading `HeroWarp`'s driver ref (couples
the nav to the hero's internals and needs a per-frame read).

---

## 3. `src/components/site/site-nav.tsx`

Structure — a fixed bar, `--nav-h` tall, inner container clamped to `--container-max`
with `--gutter` padding:

- **Left:** wordmark linking to `/` — a 5px `--blue-400` dot (flat, **no bloom**) beside
  "The Pale Blue Dot" in `--font-display` at `--text-body-m`, `--text-body` colour.
- **Right:** About · Work · Contact · Story in `--font-text` at `--text-body-s`, each with
  its Animate UI icon at 14px to the left of the label. At rest icons sit at
  `--text-faint` with reduced opacity, so **the bar reads as text at rest** and the icons
  only assert themselves on hover — that is how "icons on everything" stays minimal.
  Then the Resume control.
- Active route gets `aria-current="page"`, styled as `--text-strong` + a 1px
  `--line-soft` underline.

Chrome: `background: rgba(6, 6, 7, 0.72)` (that is `--night-900` with alpha),
`backdrop-filter: blur(14px) saturate(120%)`, `border-bottom: 1px solid
var(--line-hairline)`. No shadow — `--shadow-panel` would announce a floating card, which
is the opposite of the brief.

Reveal mechanics, mirroring the existing `hz-arrive` pattern in `globals.css`:

- `data-revealed={revealed ? "true" : "false"}` on the `<nav>`.
- CSS transitions `opacity` and `transform: translateY(-8px)` over `--dur-slow`
  `--ease-out-soft`. `motion.css` zeroes `--dur-slow` under reduced motion, but
  `globals.css:85` shows the house style still writes an **explicit**
  `@media (prefers-reduced-motion: reduce)` override for every animated class — do the
  same in `nav.css` rather than relying on the token alone.
- While hidden: `pointer-events: none` **and** React 19's `inert` prop, so the links are
  genuinely out of the tab order rather than invisible-but-focusable.

Accessibility: `<nav aria-label="Primary">`, focus-visible inherits the global
`outline: 1px solid var(--blue-400)` from `base.css`, and nav anchors must reset the
global `a { border-bottom: 1px solid var(--line-soft) }` from `base.css:61`.

---

## 4. Nav stylesheet — `src/styles/horizon/nav.css`

The nav needs media queries, `:hover`, `[data-revealed]` and `[aria-current]` selectors —
none of which inline styles can express. So it gets a real stylesheet, imported from
`globals.css` after `base.css`, using `hz-nav-*` class names. **This is a deliberate
departure from the repo's inline-style convention**; note the reason in a comment at the
top of the file so the next reader doesn't think it was an accident.

Also add `--nav-h: 64px` to `src/styles/horizon/spacing.css` beside the existing
`--control-h-*`, and `html { scroll-padding-top: var(--nav-h); }` in `base.css`.
No new colour tokens — the existing aliases cover everything.

---

## 5. Mobile — menu button → full-screen overlay

Below `720px` (`nav.css` media query): the four links and the Resume control hide; a
single icon button appears on the right using the Animate UI `Menu` icon.

The panel: `position: fixed; inset: 0`, `background: rgba(0, 0, 0, 0.94)` +
`backdrop-filter: blur(20px)` — translucent enough that the fixed starfield still shows
faintly through it. Links stack at `--text-title-l` in `--font-display`, entering with
the existing `.hz-rise` class and per-item `--hz-delay` of 0/60/120/180ms. Resume control
sits last.

Behaviour: `X` icon closes; `Escape` closes; a `usePathname()` effect closes on route
change; `document.body.style.overflow = "hidden"` while open (restored on close).
`role="dialog" aria-modal="true"`, focus moves to the close button on open and returns to
the menu button on close, with Tab cycling kept inside the panel (~15 lines, worth it).

---

## 6. Resume control

An `<a href="/resume.pdf" download>` — a real anchor, not a button, so it behaves
correctly on middle-click and long-press. Styled as a control: `--control-h-sm` tall,
`--radius-sm`, `1px solid var(--line-soft)`, `--text-body`; on hover the border goes
`--blue-400` and the background `--accent-wash`, and the `Download` icon animates because
the whole anchor is wrapped in `<AnimateIcon animateOnHover>`.

Today `/resume.pdf` does not exist, so the link 404s. That is the agreed placeholder
state — dropping the real PDF at `public/resume.pdf` later makes it work with no code
change. (Note: `public/` is currently untracked in git and holds only the header image.)

---

## 7. Starfield — `src/components/horizon/star-field.tsx`

A new, deliberately thin sibling to `night-horizon.tsx`. It **mines** that file rather
than importing it: the `Star` type and generator (`night-horizon.tsx:438`), the twinkle
expression (`:926`), `clamp01`, and the DPR-aware `resize()` + `ResizeObserver` +
`lowPower` approach. It drops the horizon, glow, sea, warp, pointer reactivity and the
3D value-noise grain engine — none of which this layer needs.

**Placement:** one `position: fixed; inset: 0; z-index: 0; pointer-events: none` layer
rendered in `layout.tsx` behind `{children}`. One canvas, one rAF for the whole site, and
because the root layout persists across navigation the sky doesn't restart when the user
moves between routes — which per-section absolute canvases could not give.

This requires content above it to stop painting black over it:

- `HeroWarp`'s runway **keeps** `background: var(--night-1000)` — opaque, so no stars leak
  into the warp.
- `Arrival` changes `background: var(--bg-page)` → transparent (`arrival.tsx:43`).
- Coming-soon pages are transparent.

Parameters, tuned for "minimal, not obtrusive" and for the quieter post-warp key:

|               | value                                                   | vs. hero                             |
| ------------- | ------------------------------------------------------- | ------------------------------------ |
| count         | `clamp(40, round(w*h / 26000), 110)`, ×0.62 under 640px | density-based, not fixed             |
| radius        | 90% at 0.35–0.9px, 10% at 1.0–1.6px                     | slightly smaller                     |
| alpha ceiling | 0.42                                                    | hero is 0.62                         |
| twinkle rate  | 0.25–1.1 rad/s                                          | hero is 0.5–2.4                      |
| amp           | `0.12 + pow(random(), 2.4) * 0.5`                       | most barely move                     |
| colour        | 14% `rgba(198,205,255,1)`, rest `#fff`                  | same as hero, for family resemblance |

Plus: a very faint top-down vignette so stars thin out under the nav bar and keep it
legible; frame throttled to ~30fps (the twinkle is slow enough that 60 buys nothing);
rAF paused on `document.visibilityState === "hidden"`.

Reduced motion: paint **one** static frame with `tw = 0.72` — the same constant
`night-horizon.tsx:927` uses — and never start the loop.

Grain: a `<div className="hz-noise" style={{ opacity: 0.05 }} />` inside the same fixed
layer, so the texture established in the hero carries through the whole site. (The
current branch is `feat/grain-everpresent`; this is that idea finished.)

---

## 8. Routes and the coming-soon page

Four routes, each a server component with its own `metadata`:

```
src/app/about/page.tsx     → <ComingSoon eyebrow="About"   title="…" />
src/app/work/page.tsx      → <ComingSoon eyebrow="Work"    … />
src/app/contact/page.tsx   → <ComingSoon eyebrow="Contact" … />
src/app/story/page.tsx     → <ComingSoon eyebrow="Story"   … />
```

No route group and no nested layout — four flat siblings, and the nav already lives in
the root layout.

`src/components/site/coming-soon.tsx` — props `{ eyebrow, title, blurb }`. Server
component (nothing interactive). Full-height centred block at `--container-narrow`, with
`paddingTop: "calc(var(--nav-h) + var(--space-8))"` to clear the fixed bar. Uses the
existing vocabulary: `.hz-eyebrow`, an `<h1>` (picks up `--font-display` and the blue
`<em>` treatment from `base.css`), `.hz-rule`, one `--text-muted` line, and a "Back"
link. Entrance uses `.hz-rise` with staggered `--hz-delay` — the site's only entrance,
already reduced-motion-safe.

`/story` is the personal-note page. `plans/pale-blue-dot-concept.md:80` already has the
short draft written; the coming-soon blurb should gesture at it without spending it.

---

## Files

**New**

- `components.json`, `src/lib/utils.ts`
- `src/components/animate-ui/icons/*` (CLI-generated)
- `src/components/site/site-nav.tsx`
- `src/components/site/coming-soon.tsx`
- `src/components/horizon/star-field.tsx`
- `src/styles/horizon/nav.css`
- `src/app/{about,work,contact,story}/page.tsx`

**Modified**

- `src/app/layout.tsx` — mount `<StarField />` then `<SiteNav />` around `{children}`
- `src/app/globals.css` — `@import "../styles/horizon/nav.css"`
- `src/styles/horizon/spacing.css` — `--nav-h`
- `src/styles/horizon/base.css` — `scroll-padding-top`
- `src/components/site/hero-warp.tsx` — the `data-nav-gate` sentinel
- `src/components/site/arrival.tsx` — transparent background
- `package.json` / lockfile

---

## Verification

1. `npm run dev`, load `/`. Nav must be **absent** through the entire warp — check the
   black curtain frames specifically — and fade in as the Arrival section lands. Scroll
   back up: it fades out again.
2. Tab from the very top of `/` before scrolling. Focus must **never** land on a nav link
   while the bar is hidden (this is what `inert` is for).
3. Hover each nav item anywhere on the control — not the icon — and confirm the icon
   animates. Same for the Resume control. This is the acceptance test for the `AnimateIcon`
   wrapper placement.
4. Navigate to `/about`. Nav is visible immediately with no flash, `aria-current` is on
   About, and the starfield **does not restart** — watch a bright star through the
   transition.
5. Narrow to 360px: menu button only. Open it — Escape closes, tabbing stays inside,
   the page behind does not scroll, and picking a link closes the panel.
6. DevTools → Rendering → "Emulate prefers-reduced-motion": stars hold a static frame,
   nav appears without a transition, coming-soon copy appears without a rise.
7. Throttle CPU 6× and watch the Performance panel on `/about` — the star layer should
   sit near-idle at ~30fps with no layout thrash.
8. `git diff src/app/globals.css` — the only change may be the `nav.css` import line.
   No shadcn token block.
9. `npm run ci` clean.
