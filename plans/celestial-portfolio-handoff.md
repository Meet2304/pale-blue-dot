# The Pale Blue Dot: Universe — Handoff Spec (v2)

- **Written:** 28 September 2026. **Supersedes** v1 of this file (24 September 2026). v1's
  "Constellations + WebGL objects" plan is replaced by the concept and design system below.
  Where v1 and this document disagree, this document wins.
- **For:** the next agent building Meet Bhatt's portfolio site.
- **Owner:** Meet Bhatt. **DECIDED** marks his own decisions. **PROPOSED** marks a
  recommendation still waiting for his sign-off. **OPEN** needs his answer.
- **Status:** the whole concept exists as a working demo on the `play` branch. It is a
  prototype (plain 2D canvas, placeholder impact scores), not production code.

## Links

| What                       | Where                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch                     | `play` on `github.com/Meet2304/pale-blue-dot`: <https://github.com/Meet2304/pale-blue-dot/tree/play>                                                                                                                                                                                                              |
| **The demo (the concept)** | Route **`/play/universe`**. Locally: <http://localhost:3107/play/universe>                                                                                                                                                                                                                                        |
| **Live preview**           | <https://pale-blue-dot-git-play-meets-projects-ffe33866.vercel.app/play/universe>: the Vercel preview of the `play` branch, which follows the branch. It sits behind Vercel deployment protection, so sign in to Meet's Vercel team or ask him for a share link. Don't change protection settings without asking. |
| Body specimens             | Route **`/play/universe/bodies`**: each celestial body alone and large, with the scanner                                                                                                                                                                                                                          |
| Demo source                | `src/app/play/universe/`                                                                                                                                                                                                                                                                                          |
| Everything explored before | `/play` (five site concepts) and `/play/systems` (design-system explorations)                                                                                                                                                                                                                                     |

To run it:

```bash
git clone https://github.com/Meet2304/pale-blue-dot && cd pale-blue-dot
git switch play
npm install
npx next dev -p 3107
# open http://localhost:3107/play/universe
```

Read this whole document before writing code. Then open the demo and scroll all the way
through it: the demo is the spec, and this file explains it.

---

## Contents

1. [What the site is for](#1-what-the-site-is-for)
2. [Repository and branches](#2-repository-and-branches)
3. [How we got here](#3-how-we-got-here)
4. [The concept: one universe, one camera](#4-the-concept-one-universe-one-camera)
5. [The encoding: what everything means](#5-the-encoding-what-everything-means)
6. [The design system: Terminal](#6-the-design-system-terminal)
7. [The bodies](#7-the-bodies)
8. [Interaction](#8-interaction)
9. [Motion](#9-motion)
10. [The demo's architecture](#10-the-demos-architecture)
11. [Content](#11-content)
12. [Path to production](#12-path-to-production)
13. [Quality floor](#13-quality-floor)
14. [Known traps](#14-known-traps)
15. [Open questions for Meet](#15-open-questions-for-meet)
16. [Decision log](#16-decision-log)
17. [Appendix: Meet's background](#appendix-meets-background)

---

## 1. What the site is for

The Pale Blue Dot (`meetbhatt.com`) is Meet Bhatt's portfolio. The name is Voyager 1's 1990
photograph of Earth from about 6 billion km: the whole planet, a single point of light.

**Thesis** (from `plans/pale-blue-dot-concept.md`, read it in full): everything that has
ever mattered happened on that dot. Meet wants to add something to it. The site is that
attempt, one piece at a time. His throughline is choosing to own the whole thing instead of
the piece he's handed. The site should show this, not state it.

- **Hero line (DECIDED):** "What's missing, I make."
- **Design principle:** majesty through restraint. One dominant gesture, executed with total
  control. If removing something loses nothing real, remove it.
- **The job it must still do:** a visitor should quickly understand who Meet is, what he can
  do, and what he is doing now.
- **The Story page (`/story`, "The Note") stays as it is (DECIDED).** The universe links to it.

---

## 2. Repository and branches

- One git repository, `Meet2304/pale-blue-dot`, checked out as several worktrees on Meet's
  machine under `D:\Projects_Ad Astra\Project_22_The Pale Blue Dot\`. The `play` worktree is
  `pale-blue-dot-play`. Don't touch the others without asking.
- **`play`** is the testing ground (DECIDED: "should not have any impact on the main project").
  It branched from `main` at `83530d7` ("launch coming soon experience").
- **Production today:** `/` is a coming-soon page; `/story` is public; `/about`, `/work`,
  `/contact`, `/changelog`, `/resume` redirect to `/` (`next.config.ts`) and are disallowed in
  `src/app/robots.ts`.
- **Stack:** Next.js 16.3 (App Router), React 19.2, TypeScript, Tailwind v4 (barely used; pages
  style with CSS modules and tokens), `motion`. Node ≥ 20.9.
- **`AGENTS.md`:** "This is NOT the Next.js you know." Read `node_modules/next/dist/docs/` before
  Next-specific code. `LayoutProps<"/route">` and `PageProps<"/route">` are global types.
- **CI** (`npm run ci`): Prettier check, ESLint with `--max-warnings=0` (includes the React
  Compiler rules, see §14), `next typegen && tsc --noEmit`, `next build`. Keep it green.
- **On `play` routes the site chrome stands down:** `src/components/site/site-chrome.tsx` and
  `site-footer.tsx` return `null` when `pathname.startsWith("/play")`.
- Conventions: explanatory comments (the _why_, in prose); dated notes in `documentation/`;
  specs in `plans/`. Ask Meet before committing to `main`, pushing to `main`, or opening PRs.

---

## 3. How we got here

Short, so the next agent doesn't redo rejected work. Every item is still browsable on `play`.

1. **Five site concepts** (`/play/voyager`, `/orrery`, `/constellations`, `/record`, `/dot`).
   Meet picked **Constellations**: one camera touring figures that are made of facts, then
   everything collapsing into one dot.
2. **v1 of this spec** planned a WebGL site: dot → map → journey with celestial objects per
   category. Its flow and taxonomy survive (revised below). Its rendering plan (Three.js,
   bloom, shaders) is **no longer the plan**: the character grid replaced it.
3. **Five particle design systems** (`/play/systems/stardust`, `one-bit`, `halftone`, `glyph`,
   `murmuration`). Meet liked **Murmuration** (flow) and **Glyph** (ASCII texture). He asked
   for more varied glyphs; heavy glyphs like `@` read as noise.
4. **Current** (`/play/systems/current`): the two combined. Settled details: glyphs at **6.5 px,
   density 3×** (smaller glyphs must mean more of them), and category accents defined in
   **OKLCH at equal lightness** so swapping one never breaks the page.
5. **Five lab systems** (`/play/systems/lab/*`: Gravity, Prism, Terminal Earth, Nebula Ink, Deep
   Field). Meet loved **Terminal Earth**: a spinning Earth drawn only in characters, with
   orbits, that shrinks to the pale blue dot on scroll.
6. **Terminal** (`/play/systems/terminal`): Terminal Earth grown into a system with a
   neumorphic console. **Rejected (DECIDED):** "I hate the skeuomorphic design. I dig the
   terminal vibe." Also rejected: card layouts ("boring and AI generated"), the glyph rule
   between sections, and a cursor that pushes particles away.
7. **Universe** (`/play/universe`): **the chosen concept.** Built to Meet's brief (§4). Two
   more rounds of his feedback went into it: the map must feel like a majestic universe
   (bodies small at a distance), and everything must orbit the dot, never static. He also
   rejected a noisy Sun and a cluttered black hole; both were redrawn.

---

## 4. The concept: one universe, one camera

**DECIDED.** One pinned canvas, one camera, driven by scroll. The page is a single journey
from Earth, out to everything, and back into the details.

| Scroll step | Camera                                                                                                                                                                                    | Beside it (typographic column, left)                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0           | **Terminal Earth**, close, spinning, with three orbiting rings of particles                                                                                                               | "Meet Bhatt" / **What's missing, I make.** / one-line identity / "scroll to pull back"                |
| 1           | **Pull back.** Earth shrinks to the pale blue dot (the glyphs give way to a point of light); a galaxy fades in; every piece of work appears as a point of light, **all orbiting the dot** | "The map" / **Everything, around one point of light.** / the key (§5)                                 |
| 2–6         | **Zoom into one year at a time, newest to oldest**: Now (2026–27), 2025, 2024, 2022–23, 2021. The galaxy fades; the points resolve into their full bodies, each labelled                  | Year title, one-line note, and a row per unit: name, what it was, the result, the link                |
| 7           | Back out to the map, framed centrally                                                                                                                                                     | **All of it happened here.** / "It is a little brighter than it was." / Note, email, GitHub, LinkedIn |
| After       | Normal page                                                                                                                                                                               | **Index:** the same map as a plain table (when, name, kind, result)                                   |

Camera rules (see `universe-canvas.tsx`, `camAt`):

- Each step **holds still for ~22% of its scroll**, then moves, so the text can be read.
- Zoom interpolates **in log space**, so planet-to-pixel reads as one continuous move.
- Year steps **track their cluster as it orbits**, so the camera follows moving targets.
- Keyframe zoom for a year: `min(0.5w, 0.8h) / (2 · cluster reach) × 1.3` on desktop.

Things that stay true everywhere: the pale blue dot is the origin of the map; distance from
it is time; nothing on the map is static.

---

## 5. The encoding: what everything means

### Kinds of work → kinds of body

| Mark | Body                              | Kind                                                                                | Status         |
| ---- | --------------------------------- | ----------------------------------------------------------------------------------- | -------------- |
| `=`  | **Star** (drawn like the Sun)     | Professional experience                                                             | DECIDED (Meet) |
| `×`  | **Nebula**                        | Research                                                                            | DECIDED (Meet) |
| `+`  | **Planet** (banded, often ringed) | Projects                                                                            | PROPOSED       |
| `~`  | **Constellation**                 | Leadership                                                                          | PROPOSED       |
| `o`  | **Black hole**                    | Education (the deepest gravity, which pulled everything in and bent the path after) | PROPOSED       |

Meet set the first two. The last three are the agent's proposal, never rejected; confirm them
(§15). Each kind also has its glyph mark, so kinds never rely on colour alone.

### Other channels

- **Impact → brightness and size.** Every unit has `impact` 1–3 (PROPOSED values, `data.ts`).
  On the map it sets the glow radius and the core size; units at 2.3+ get **diffraction
  spikes**. Up close it sets the body's radius (`r = 0.55 + impact × 0.42` world units).
- **Time → distance from the dot.** Each year's cluster sits on its own orbit around Earth;
  newer is closer. Faint dotted orbit ellipses show the rings of time.
- **Orbital speed → distance.** Kepler-style: `ω = 0.03 · (14 / d)^1.5` rad/s, so outer, older
  years turn more slowly.
- **Filter (top row).** `all` or one kind. Non-matching bodies fade to 12%, never vanish, so
  the map keeps its shape. Clicking the active kind returns to `all`.
- **Earth is not at the galaxy's centre.** It sits out in an arm, where it actually is. The
  galaxy is the rest of the universe; only the lit points are Meet's work.

---

## 6. The design system: Terminal

**DECIDED direction: "the terminal vibe", minimal, subtle, not vibe-coded.**

### 6.1 The grid

Every celestial image is drawn **one monospaced character per cell**. Cells are **7×12 px** at
full size (6×10 on phones), shrinking to 2.4 px wide for distant bodies. Bodies drawn at the
same cell size share one lattice, like characters on a real terminal. The galaxy backdrop uses
6×10.

### 6.2 Glyph vocabulary

Light glyphs only. **Never `@ # % &` or letters in textures**; they read as noise (Meet's
feedback). Each material has its own glyphs, so texture shows what something is before
colour does:

| Material        | Glyphs                                       |
| --------------- | -------------------------------------------- |
| Ocean           | `· - ~ ≈`                                    |
| Land            | `. , : ; +` (cities at night: `* ·` in warm) |
| Cloud           | `' \` ° o`                                   |
| Gas (nebula)    | `. ' \`` → `: · ,`→`; ~ -`→`= + ≈`           |
| Star surface    | `· : + * *` by brightness; corona `· :`      |
| Accretion disk  | `= - ~ ·`                                    |
| Lensed halo     | `* + : ·`                                    |
| Lines and rays  | `- \ \| /`, chosen by angle                  |
| Scanner / waves | `: ; - = + × / \ \| ~ *`                     |

### 6.3 Colour

- **Space is true black `#000`.** No tinted near-black.
- **Neutrals:** fg `#e7eaef`, soft `#a3a9b4`, mute `#6a717d`, hairline `rgb(255 255 255 / 0.09)`.
- **Kinds** (OKLCH, equal-ish lightness so any can be swapped in; `data.ts` `KINDS`):
  experience amber (h 70), research teal (h 185), projects violet (h 300), leadership rose
  (h 15), education cool white-blue (h 225, low chroma). Earth is pale blue (h 245).
- Each kind expands to **seven colours** (`colorsOf`): a five-stop ramp (deep, dim, accent,
  soft, near-white), plus warm `#ffd08a` and white. Body renderers pick a tier 0–6.
- **Colour appears only where it means a kind of work.** The UI chrome is monochrome.

### 6.4 Type

- **IBM Plex Sans** (200–500) for voice: hero at weight 200, titles at 300, body 400.
- **IBM Plex Mono** (400) for every label, readout, kicker and the glyphs themselves.
- Sentence case. Negative tracking on large type (−0.045em on the hero).

### 6.5 UI

**No cards, no raised or inset surfaces, no shadows, no neumorphism, no glassmorphism (DECIDED
by rejection).** The UI is type and hairlines, like an instrument's readout:

- **Filter:** a row of mono words; the active one lights in its kind's colour, with a 1 px
  underline.
- **Chapter index:** right edge, a tick per chapter; the current tick is longer and labelled;
  hovering shows all labels; click to jump.
- **Unit rows:** hairline-separated rows. A mark, a name, the body type on the right, one line,
  the result in mono in the kind's soft colour, and an optional link. Hovering a row turns its
  top hairline the kind's colour and targets the body on the map.
- **Key and index:** real `<table>`s with hairline rows.
- **Canvas annotation:** like a technical drawing. A leader line (diagonal then horizontal),
  name in sans, "mark, body, dates" in mono; a four-tick reticle (no circles) on the targeted
  body.
- **Links:** underline in the mute colour, turning fg on hover.
- **Avoid:** all-caps tracked eyebrows, "A · B · C" meta strings, `→` on links, identical
  rounded cards, gradient washes as decoration, one accented word in a headline.

---

## 7. The bodies

All renderers are in `src/app/play/universe/bodies.ts`. A renderer maps a cell's position in
body units (radius 1, y down) to `{glyph, colour tier, alpha}`. Every body is **animated** and
answers the **scanner** (§8) by showing its hidden structure. See each one at
`/play/universe/bodies`.

| Body                           | Look                                                                                                                                                                                                                                                                          | Motion                                                                                 | Scanner shows                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| **Earth**                      | Lit from the upper left; ocean, land, drifting clouds, city lights on the night side, atmosphere rim; **three tilted rings of orbiting particle streaks**                                                                                                                     | Spins (drag to spin, with inertia); clouds drift; cities twinkle; orbits flow          | Latitude and longitude lines          |
| **Star** (experience)          | A sphere of light: white-hot centre cooling to gold at the limb (limb darkening), a clean round edge with a bright rim, slow granulation, an even corona with faint streamers. **A warm radial glow is painted underneath**; the glow is what makes it read as a star         | Granulation boils and rotates; corona breathes                                         | Isotherm contours; corona field lines |
| **Nebula** (research)          | Turbulent gas from fractal noise, with a slow central swirl and embedded newborn stars                                                                                                                                                                                        | Gas drifts and swirls; new stars twinkle                                               | Density contour lines                 |
| **Planet** (projects)          | Banded sphere lit from the same sun, 70% have tilted rings passing behind at the top and in front at the bottom                                                                                                                                                               | Rotates                                                                                | Latitude bands                        |
| **Constellation** (leadership) | A figure unique to each unit (seeded): stars with glows, the brightest with diffraction spikes; lines always drawn; a Milky Way band behind                                                                                                                                   | A light pulse travels each line; ripples spread from the brightest star; stars twinkle | Hidden member stars                   |
| **Black hole** (education)     | A true black shadow; a thin **photon ring drawn as light** (stroked circle with bloom); a smooth **lensed halo** hugging the shadow, fuller over the top; the near side of the accretion disk as a thin bright band crossing in front, brighter on the side turning toward us | Disk bands flow; halo shimmers                                                         | Gravity-well rings                    |

Earlier versions that Meet rejected: a Sun made of streak noise with dark holes ("doesn't look
like a star at all"), and a black hole with jets and diagonal-slash halos (cluttered). Don't
bring those back.

**At a distance** (map), a body is **only a point of light**: a coloured glow, a white core,
and spikes at high impact, twinkling. It **resolves into its full body** as its on-screen
radius grows from 26 px to 70 px (smoothstep cross-fade). This is DECIDED: "It is ok if each
and every contribution is not visible completely."

**The galaxy backdrop** (`galaxy.ts`): rendered once per resize into an offscreen canvas at
the map's zoom. A warm core with a radial glow, two logarithmic spiral arms seen at an angle,
dust lanes on their inner edges, pink star-forming knots, and a deep field. It turns slowly
about its centre (0.006 rad/s). It is full at the map and fades out over a 3× zoom-in.

---

## 8. Interaction

- **Scroll** drives the camera (§4). This is the main interaction.
- **Scanner:** hovering a large body (Earth in the hero, any resolved body in a year view)
  reveals its structure inside a radius of 0.42–0.45 body units. Only the canvas scans, not
  the text over it (`e.target === canvas`).
- **Drag** spins Earth, with inertia, while it is big enough to grab.
- **Hover a point on the map:** a reticle, a label, and **one dotted thread back to Earth**.
  Only the hovered point gets a thread; lines from every body were rejected as clutter.
- **Hover a row** in a chapter: the same targeting on the map.
- **Click a body:** flies to its year's chapter (smooth scroll).
- **Filter** and **chapter index:** §6.5.
- **Stars everywhere twinkle**; the deep field drifts slightly with the camera for depth.

---

## 9. Motion

**DECIDED:** the map is never static.

| Motion                  | Value                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Orbits around the dot   | `ω = 0.03 · (14/d)^1.5` rad/s; clusters rotate about Earth on ellipses flattened to 0.72 |
| Galaxy rotation         | 0.006 rad/s about its centre                                                             |
| Earth spin              | 0.12 rad/s; drag sets velocity, which eases back                                         |
| Earth's particle orbits | 0.22, −0.14, 0.09 rad/s on three tilted rings                                            |
| Camera                  | holds ~22% of each step, then eases (smoothstep) with log-space zoom                     |
| Point → body            | cross-fade over on-screen radius 26–70 px                                                |
| Galaxy fade             | full at map zoom, gone at 3×                                                             |
| Filter                  | 10% per frame toward 1 or 0.12                                                           |
| Chapter copy            | opacity plus an 8 px rise when ≥55% on screen (500 ms / 700 ms)                          |
| Orbit paths             | dotted, the dash offset drifting slowly                                                  |

Reduced motion (`prefers-reduced-motion`): no orbiting, spinning, twinkle or drift; scroll
still moves the camera. Keep it that way.

---

## 10. The demo's architecture

```
src/app/play/universe/
  page.tsx              fonts (IBM Plex Sans + Mono via next/font) and metadata
  universe.tsx          the DOM: pinned stage, filter, chapter index, chapters, index table
  universe.module.css   all UI styling (typographic, hairlines)
  universe-canvas.tsx   the camera, orbits, galaxy draw, points of light, bodies, labels, input
  bodies.ts             the six body renderers (earth, planet, sun, nebula, blackhole, constellation)
  render.ts             drawBody(): grid loop, bucketed fillText, glows, photon ring; makeFrame()
  galaxy.ts             renderGalaxy(): the offscreen backdrop
  data.ts               KINDS, colours, COLLECTIONS (all content), layout()
  bodies/page.tsx, bodies/specimen.tsx   the body specimen page
```

Shared helpers it uses from earlier explorations: `src/app/play/systems/engine.ts`
(`mulberry32`, `hexToRgb`), `src/app/play/systems/lab/noise.ts` (`fbm3`),
`src/app/play/systems/lab/live-palette.ts` (`fit`), `src/app/play/systems/current/color.ts`
(`oklch`). Move these next to the real code when productionising.

**Rendering:** Canvas 2D, one `fillText` per glyph, **bucketed by colour tier and alpha level**
so each `fillStyle` is set once per bucket. Glows and the photon ring are canvas gradients and
strokes under and over the glyphs. It runs at the display rate (144 fps measured on a laptop
GPU). Heavy bodies are only drawn when on screen.

**Scroll model:** the `[data-universe]` section is `CHAPTERS.length × 100svh` tall; a sticky
stage holds the canvas; `s = −sectionTop / innerHeight` is the continuous step.

**Why not WebGL (v1's plan):** the character grid is the identity now, and Canvas 2D carries
it at full frame rate. WebGL is an optional later optimisation (for example, a glyph atlas in
a shader), not a requirement. If adopted, keep every visual rule in §6–§9.

---

## 11. Content

- **All content lives in `src/app/play/universe/data.ts`** (`COLLECTIONS`): five collections,
  13 units, each with name, kind, dates, impact, one line, what he owned, the result, and an
  optional link. Facts come from Meet's resume (Sept 2026) and his GitHub (see Appendix).
- **Placeholders to confirm with Meet:** every `impact` score; the "Now" grouping; which
  archive projects appear (only Converge is in); the one-line identity ("AI engineer and product
  builder. MS in AI Engineering at Carnegie Mellon."); the closing copy.
- Real text lives in the DOM (chapters, index table), so search engines and screen readers get
  everything; the canvas is `aria-hidden`.

---

## 12. Path to production

Build it for real in the app (not under `/play`) when Meet approves. Suggested phases:

1. **Productionise the renderer.** Move `bodies.ts`, `render.ts`, `galaxy.ts` and the helpers
   into `src/components/universe/` (or similar). Add types, tests for the pure functions
   (layout, encoding, camera interpolation), and a quality tier (fewer cells and glyph sizes on
   low-power devices).
2. **Content.** Get Meet's answers (§15). Settle impact scores. Consider a content file shape
   that also feeds per-unit pages.
3. **Home page.** Replace the coming-soon `/` with the universe. Keep `/story`. Update
   `next.config.ts` redirects and `robots.ts` deliberately.
4. **Per-unit pages** (PROPOSED): `/work/[slug]` with the body large at the top (the specimen
   renderer) and the full case below: the situation, what he owned, the trade-off, the impact,
   links. The concept doc's four-part shape.
5. **Polish.** Mobile (below), accessibility, performance tiers, a dated note in
   `documentation/`, `npm run ci` green.

**Done when:** the full scroll works both ways at 60 fps on a mid-range laptop and ≥ 30 fps on
a mid-range phone; every unit is reachable by keyboard and listed in the index; reduced motion
is calm; Meet approves the Earth → map → years → home journey.

---

## 13. Quality floor

- **Reduced motion:** no autonomous motion; scroll-driven camera only.
- **Keyboard:** filter, chapter index, unit links and index links are real buttons and links
  with a visible focus outline. PROPOSED: arrow keys to step chapters.
- **Screen readers:** all content is DOM; the canvas is `aria-hidden`.
- **Mobile:** the demo stacks copy at the bottom with a fade and hides the chapter index. The
  body clusters still need a mobile framing pass (not verified in the last round).
- **Performance:** cap DPR at 2; skip off-screen bodies; pause when the canvas is off-screen
  (IntersectionObserver); consider a lower cell density tier.
- **SEO:** the index table and chapters carry real text; give `/work/[slug]` pages metadata.

---

## 14. Known traps

1. **React Compiler lint rules** (`--max-warnings=0`): don't read or write refs during render
   (event-handler factories that capture refs trip `react-hooks/refs`; use
   `e.currentTarget`); don't `setState` synchronously in an effect body; unused
   `eslint-disable` comments are warnings.
2. **Hydration:** procedural geometry rendered to markup must be deterministic _and_ rounded;
   better, keep procedural drawing on the canvas (client only).
3. **Fonts in canvas:** `ctx.font` can't read `var()`. Read the family string from the CSS
   custom property that `next/font` sets (`getComputedStyle(el).getPropertyValue("--uv-mono")`)
   **once per resize**, never per frame (it forces style recalculation).
4. **Global heading styles:** `src/styles/horizon/base.css` sets `h1`–`h3` to Marcellus. Reset
   with `:where(.root) :is(h1, h2, h3)` in the page's module.
5. **Faded trails** (`rgba(0,0,0,a)` over the last frame) leave ghost pixels at 2–3/255; use a
   full clear, or `filter: contrast(1.035)` on the canvas.
6. **next/font:** `axes` can't be combined with an explicit `weight` list.
7. **Load each Google font family once.** IBM Plex is declared once in
   `src/app/play/plex.ts` and imported everywhere. Declaring the same family in several files
   with different options broke Vercel's cold build ("next/font/google queries have exactly
   one entry"). Keep it that way in production (for example, one `fonts.ts`).
8. **Turbopack** occasionally serves a stale font-module error after new fonts are added;
   delete `.next` and restart.
9. **Windows paths** contain spaces (`Projects_Ad Astra`); Git Bash rewrites leading `/` in
   arguments into Windows paths.
10. **Next's dev indicator** sits bottom-left; keep fixed UI away from that corner.

---

## 15. Open questions for Meet

1. **Key:** confirm planet = projects, constellation = leadership, black hole = education.
2. **Impact scores** (1–3) for all 13 units, and whether "impact" should mean reach,
   ownership, or outcome.
3. **Which archive projects** appear (Converge is in; Loom, Aether, Nemesis, Monarch, Vita,
   Codex, Helion?), with years.
4. **Serin and Helion:** is Helion part of Serin? Is there anything public to link for Serin?
5. **Astar:** what exactly was turned down (a return offer, a full-time role)?
6. **Missing numbers:** Phoenix accuracy; Linea downloads or users; Icarus results.
7. **LinkedIn:** `linkedin.com/in/meet-bhatt2304` (resume, used in the demo) vs
   `meet-bhatt-655a89250` (current site). Which is current?
8. **Copy:** the identity line, the chapter notes, and the closing lines.
9. **Per-unit pages:** yes or no, and the case format.
10. **Resume:** a hosted PDF to link?

---

## 16. Decision log

| #   | Decision                                                                                           | Status                              |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Replace the one-line landing page with something that says who Meet is                             | DECIDED                             |
| 2   | Keep `/story` (The Note) as it is                                                                  | DECIDED                             |
| 3   | Space theme, with a storyline felt in every element                                                | DECIDED                             |
| 4   | Constellations chosen from five concepts; later superseded by Universe                             | DECIDED                             |
| 5   | Each unit of his life is a celestial body; kinds of work map to kinds of body                      | DECIDED                             |
| 6   | Nebula = research, star = professional experience                                                  | DECIDED                             |
| 7   | Planet = projects, constellation = leadership, black hole = education                              | PROPOSED                            |
| 8   | Begin on Terminal Earth (the pale blue dot, with its orbits)                                       | DECIDED                             |
| 9   | Scroll pulls back to show everything around the dot, then zooms into collections newest to oldest  | DECIDED                             |
| 10  | Encode by classification and by impact                                                             | DECIDED                             |
| 11  | Terminal vibe; character-grid rendering                                                            | DECIDED                             |
| 12  | No skeuomorphism or neumorphism, no cards; minimal, not vibe-coded                                 | DECIDED                             |
| 13  | Glyphs light and varied; no `@ # % &`                                                              | DECIDED                             |
| 14  | Category colours in OKLCH at equal lightness; identity must survive any accent                     | DECIDED                             |
| 15  | The map is a majestic universe; contributions are small points until zoomed                        | DECIDED                             |
| 16  | Everything orbits the pale blue dot; nothing static                                                | DECIDED                             |
| 17  | The Sun is a sphere of light with a corona; the black hole has a photon ring, lensed halo and disk | DECIDED (by feedback)               |
| 18  | Canvas 2D instead of WebGL                                                                         | PROPOSED (works at full frame rate) |
| 19  | Galaxy backdrop; Earth in an arm, not the centre                                                   | PROPOSED                            |
| 20  | Per-unit pages at `/work/[slug]`                                                                   | PROPOSED                            |
| 21  | Hand off via this document and the `play` branch on GitHub                                         | DECIDED                             |

---

## Appendix: Meet's background

From his resume (September 2026) and `github.com/Meet2304`. `data.ts` holds the site copy;
this is the fuller record.

- **Education:** Carnegie Mellon University, MS in Artificial Intelligence Engineering and
  Technology Innovation Management, expected Dec 2027 (current). Pandit Deendayal Energy
  University, B.Tech Computer Engineering, minor in IoT, June 2026, GPA 9.55/10.
  **J N Tata Scholar.**
- **Experience:**
  - Corporate Startup Lab, Bosch Mobility (Aug–Dec 2026): 6-person team; market research,
    customer discovery, strategic fit for low-voltage actuators in new segments.
  - Blink Analytics (Aug 2024 – Jun 2026): RLHF Contributor → RLHF Team Lead → Lead Product
    Development Intern. Led development of **Serin**, an AI interview and hiring platform
    (real-time communication, LLM and cloud infrastructure, candidate evaluation). Directed a
    summer intern team; **222% more project revenue in two months.**
  - Astar Technologies (Dec 2023 – Jan 2024): lead business and data analysis intern; seasonal
    and regional demand forecasting (time series, Random Forest, XGBoost). He later turned
    down the ready-made path it offered (details OPEN).
- **Research:**
  - **Project Phoenix** (Jul 2025 – May 2026): explainable cervical-cell classification on
    SipakMed and Herlev; CNNs plus visual explanations; runs in the browser;
    phoenix.meetbhatt.com; manuscript in preparation.
  - **Malicious prompt classifier / Project Vigil** (Jul–Oct 2025): Markov-chain detector plus
    an explanation module and Leave-One-Out Deletion; 90.79% accuracy, 98.84% precision,
    82.54% recall, F1 89.96%; paper submitted.
- **Projects:** **Linea** (2026, linea.meetbhatt.com, open-source Windows lyrics overlay,
  v0.2.0); **Project Talaria** (2025, talaria.meetbhatt.com, ESP32 smart shoe, RNN forecasting
  15 signals 50 steps ahead, R² 0.97, 50,000+ sequences); **Project Icarus** (2024–26, drone
  on a self-built Teensy 4.0 flight controller); **Converge** (2026, converge.meetbhatt.com,
  hackathon team formation). Archive on GitHub: Loom, Aether, Helion (likely Serin-related),
  Nemesis, Monarch, Vita, Codex, Ditherly, Hyperion.
- **Leadership:** **Mind Ripple**, PDEU's quizzing club (2022–26): member → head of graphic
  design → president → advisor; led 30; Matrix Breakout grew to 300+ participants, earnings
  up 10% a year. **Interact Club of Baroda Sayajinagari** (2021–22): founded it, charter
  president; 32 teenagers in service projects (Pratibha Foundation, among others).
- **Skills:** RLHF, fine-tuning, LLM agents, CNNs, time series, XGBoost; GCP, Kubernetes,
  Supabase, Firebase, LiveKit, GitHub Actions; TypeScript, Next.js, React, Tailwind, Python;
  C, Teensy 4.0, ESP32-S3, PCB design, sensor integration.
- **Contact:** mbbhatt@andrew.cmu.edu; github.com/Meet2304; X @Meet2304; LinkedIn (§15.7).
  Don't publish his phone number.
