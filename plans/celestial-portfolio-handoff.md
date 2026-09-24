# The Pale Blue Dot — Celestial Portfolio: Handoff Spec

- **Written:** 24 September 2026
- **For:** the next agent building Meet Bhatt's portfolio website
- **Status:** planning complete; implementation not started. Nothing below has been built
  except the rough concept prototypes described in §3.
- **Reference prototype:** `src/app/play/constellations/` on the `play` branch (route
  `/play/constellations`). See
  [§3, "Where to find the Constellations reference"](#where-to-find-the-constellations-reference).
- **Owner:** Meet Bhatt (the user). Every decision marked **DECIDED** came from him
  directly. Anything marked **PROPOSED** is a recommendation still waiting for his sign-off.
  Anything marked **OPEN** needs his answer before it can be built.

Read this whole document before writing code. It records the conversation's decisions,
the reasons behind them, the content, the visual system, the technical plan and the traps
already found.

---

## Contents

1. [What this is](#1-what-this-is)
2. [Repository, branches and the play worktree](#2-repository-branches-and-the-play-worktree)
3. [What was explored, and what was chosen](#3-what-was-explored-and-what-was-chosen)
4. [Who Meet is: the content source of truth](#4-who-meet-is-the-content-source-of-truth)
5. [The experience: the full flow](#5-the-experience-the-full-flow)
6. [Opening: the recreated photograph](#6-opening-the-recreated-photograph)
7. [The map: the dot and his impact on it](#7-the-map-the-dot-and-his-impact-on-it)
8. [The journey: stops, groups and priority](#8-the-journey-stops-groups-and-priority)
9. [The ending](#9-the-ending)
10. [Navigation and the category filter](#10-navigation-and-the-category-filter)
11. [Types of object: telling categories apart](#11-types-of-object-telling-categories-apart)
12. [Every object and what it does](#12-every-object-and-what-it-does)
13. [Case panels and per-item pages](#13-case-panels-and-per-item-pages)
14. [Visual direction: "magical"](#14-visual-direction-magical)
15. [Technical architecture](#15-technical-architecture)
16. [Tooling the agent needs](#16-tooling-the-agent-needs)
17. [Build phases and acceptance criteria](#17-build-phases-and-acceptance-criteria)
18. [Quality floor: accessibility, performance, SEO, mobile](#18-quality-floor-accessibility-performance-seo-mobile)
19. [Known traps and lessons from the prototypes](#19-known-traps-and-lessons-from-the-prototypes)
20. [Open questions for Meet](#20-open-questions-for-meet)
21. [Appendix A: content data (draft)](#appendix-a-content-data-draft)
22. [Appendix B: the rest of Meet's GitHub](#appendix-b-the-rest-of-meets-github)
23. [Appendix C: decision log](#appendix-c-decision-log)

---

## 1. What this is

The Pale Blue Dot (`meetbhatt.com`, repo `github.com/Meet2304/pale-blue-dot`) is Meet
Bhatt's personal portfolio. The name comes from Voyager 1's 1990 photograph of Earth
from about 6 billion km away, where the whole planet is a single point of light
smaller than a pixel.

**The site's thesis** (from `plans/pale-blue-dot-concept.md`, which the agent should
read in full):

- Everything that has ever mattered happened on that dot. Meet doesn't claim to know
  his purpose yet, but he wants to add something to that point of light before he's
  gone. The site is that attempt, one piece at a time.
- **The throughline:** across his work, he chooses to own the whole thing instead of
  taking the piece he's handed. Examples: leading Serin end to end, taking on Project
  Phoenix without being assigned it, turning down a ready-made path (Astar) for one he'd
  have to build himself. The site should _demonstrate_ this rather than state it.
- **Hero line:** "What's missing, I make."
- **Design principle:** majesty through restraint, not accumulation. One dominant
  gesture, done with total control, beats several good ones stacked together. Every
  element has to earn its place. Care in the execution is evidence of the same care
  applied to everything else.
- **Evidence over claims:** show the decision and the trade-off inside each piece of
  work, not a list of outcomes.

**Why this redesign exists:** Meet built a first hero (a night-sea horizon with a warp
into the stars) and doesn't like it. His complaint: the landing page is one line that
doesn't represent who he is. He wants a site that has a vision and a story, where
the story is felt in every component, and that still does the basic job: a visitor
should quickly understand **who he is as a person, what skills he has, and what he's
doing in his life.** The theme is space, but the storyline matters more than the
theme.

**His own words, for tone:**

- "simple, wonderful and mind blowing"
- "I want the website to have a story line and this should be felt in the components,
  in the elements of the design and everything"
- On the celestial objects: "I don't just want them to be regular celestial bodies. I
  want them to represent some aspect of what that project aimed at doing in a simple,
  creative and artistic minimal manner."
- "make the visual style more magical and eye catching"
- On the ending: showing "my impact on the dot by zooming out … it matches the story."
- On quality: "this is something that I am very concerned about … absolutely beautiful
  and magical components."

---

## 2. Repository, branches and the play worktree

### Layout on disk

```
D:\Projects_Ad Astra\Project_22_The Pale Blue Dot\
├── pale-blue-dot\              main checkout (branch fix/nav-and-footer-polish, has local changes: DO NOT TOUCH)
├── pale-blue-dot-coming-soon\  worktree, branch feat/coming-soon-gate
├── pale-blue-dot-readme\       worktree, branch docs/readme
├── pale-blue-dot-story\        worktree, branch feat/story-page (has untracked files)
└── pale-blue-dot-play\         worktree, branch `play`  ← THE TESTING GROUND
```

All five folders are worktrees of **one** git repository (`Meet2304/pale-blue-dot`).
The top-level folder is not itself a git repository.

### The `play` worktree

- Created from `origin/main` at commit `83530d7` ("feat(site): launch coming soon
  experience"). The upstream was unset so it doesn't track main.
- Meet's instruction: it's "a testing ground and should not have any impact on the
  main project". Keep experimental work here until Meet says otherwise.
- **Committed on `play`** (one commit on top of `83530d7`, not pushed):
  - `src/app/play/**`: the five concept prototypes (see §3) and shared files.
  - `src/components/site/site-chrome.tsx` and `site-footer.tsx`: each returns `null`
    when `pathname.startsWith("/play")`, so the site's nav, star field, edge blurs and
    footer stand down on play routes. These two small edits are the only changes
    outside `src/app/play`.
  - `plans/celestial-portfolio-handoff.md`: this file.
- Ask Meet before committing, pushing or opening PRs. If he asks for commits, end the
  message with the attribution line given in the session's instructions.

### Stack (from `package.json`)

- **Next.js 16.3.1** (App Router), **React 19.2.8**, TypeScript 5, Tailwind CSS v4 (set up,
  but components mostly style inline against design tokens or with CSS modules),
  `motion` 13 (Framer Motion), `clsx`, `tailwind-merge`. Node ≥ 20.9 (`.nvmrc` = 20).
- **`AGENTS.md` warning:** "This is NOT the Next.js you know." APIs and conventions may
  differ from your training data. Read the relevant guide in
  `node_modules/next/dist/docs/` before writing Next-specific code. Examples:
  `LayoutProps<"/route">` and `PageProps<"/route">` are global type helpers; `next dev`
  rewrites `AGENTS.md`.
- **CI** (`.github/workflows`): `npm run ci` = `format:check` (Prettier with the
  Tailwind plugin), `lint --max-warnings=0` (ESLint 9 with `eslint-config-next`, which
  includes the **React Compiler rules**; see §19), `typecheck` (`next typegen && tsc
--noEmit`), and `build`. Keep all four green.
- **Conventions:** comment density is high and explanatory (the _why_, in prose).
  Match it. Notable changes get a dated note in `documentation/` (see its README,
  newest first). Specs live in `plans/`.

### The live site today

- `/` is a **coming-soon page** (`src/app/page.tsx`, styles in
  `src/styles/horizon/launch.css`). `/about`, `/work`, `/contact`, `/changelog` and
  `/resume` redirect to `/` (`next.config.ts` → `redirects()`) and are disallowed in
  `src/app/robots.ts`. `/story` is public.
- **`/story`, "The Note"**, is the one page that explains the vision in plain words.
  Meet is happy with it and **it stays**. Files: `src/app/story/page.tsx`,
  `src/components/site/the-note.tsx`, `the-photograph.tsx`, `src/styles/horizon/note.css`.
  The new site should link to it ("Read the note") from the dot and from the ending.
- **Horizon design system:** `src/styles/horizon/*.css`. It defines the palette (pure
  black night, ultramarine `#0d7bff` accent, aqua-cast ink greys), type scale, spacing,
  effects and motion tokens (`--ease-out-soft: cubic-bezier(0.16,1,0.3,1)`, etc.).
  Fonts are in `src/app/fonts.ts`: Marcellus (display), Hanken Grotesk (text), and
  Archivo and Anton (old hero only). The new work may introduce its own look (see §14),
  but reuse tokens where they fit.
- **Existing assets:** `public/pale-blue-dot.jpg` (the real photograph, 1024×768; **the
  dot is at pixel (609, 404)**, i.e. 59.47% / 52.60%), `public/assets/pale-blue-dot-header.png`,
  and social SVGs.
- **`src/lib/socials.ts`** links LinkedIn as `meet-bhatt-655a89250`, but the resume says
  `linkedin.com/in/meet-bhatt2304`. **OPEN: confirm which is current.**

### Running the play ground

```bash
cd "D:/Projects_Ad Astra/Project_22_The Pale Blue Dot/pale-blue-dot-play"
npm install      # already done once
npx next dev -p 3107
# open http://localhost:3107/play
```

---

## 3. What was explored, and what was chosen

Five concepts were built as rough, working prototypes under `/play`. They all share one
content file (`src/app/play/content.ts`, now outdated: its placeholders were written
before Meet shared his resume), so they could be compared on design alone.

| #   | Route                  | Concept                                                                                                                                                                                                                                                                                                             | Outcome    |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | `/play/voyager`        | The page is a flight outward. A telemetry readout (distance from Earth, how long a message home takes) climbs with scroll; projects are planetary flybys; the ending turns the camera round to find the dot in the sunlight. Jost + Newsreader.                                                                     | Not chosen |
| 2   | `/play/orrery`         | One screen: a working model of his life, on an engraved indigo-and-brass plate. The thesis is engraved round the sun; bodies orbit at Kepler speeds; decisions are a comet; click a body to read it. EB Garamond.                                                                                                   | Not chosen |
| 3   | `/play/constellations` | **Chosen as the starting point.** "Every point here is something I did." Scattered stars; scrolling tours the sky and each group joins into a named figure built from facts; then an overview of all figures; then everything collapses into a single pale blue dot. Instrument Serif + Instrument Sans, 2D canvas. | **Chosen** |
| 4   | `/play/record`         | The site as a Voyager Golden Record: a sleeve of pictograms slides away, the needle drops, words play one at a time with a waveform, the record flips for side B. Bodoni Moda + Familjen Grotesk.                                                                                                                   | Not chosen |
| 5   | `/play/dot`            | Powers of Ten into the photo: dot → Earth's night side → city lights → a city → one window → a desk → a laptop screen showing the photo again. Fraunces.                                                                                                                                                            | Not chosen |

`/play` is an index of the five. Shared helpers: `src/app/play/sky.tsx` (simple twinkling
canvas star field), `layout.tsx` (an "All concepts" pill, top left), `play.module.css`.

**Meet's reaction:** "I absolutely loveeee the idea behind the constellation design. It
is still very rough and needs to be refined. I want to use it as a starting point for
my final portfolio website."

### Where to find the Constellations reference

The chosen prototype is the reference implementation. Study it before building.

- **Branch:** `play` (local to Meet's machine unless it has been pushed; check with
  `git branch -a`). The commit that adds this document also adds the prototype.
- **Worktree folder:**
  `D:\Projects_Ad Astra\Project_22_The Pale Blue Dot\pale-blue-dot-play\`. If you're
  in another checkout of the repo, get the files with `git switch play` or
  `git worktree add ../pale-blue-dot-play play`.
- **Files:**
  - `src/app/play/constellations/constellations.tsx`: the whole experience. The figure
    data (`FIGURES`), the camera keyframes (`keyframe()`), the scroll-to-step model, the
    canvas draw loop (dust, formation, edge-by-edge lines, labels, halos, the collapse
    into the dot) and the DOM chapter panels.
  - `src/app/play/constellations/constellations.module.css`: the layout (every section
    100svh), the panel scrim and the type.
  - `src/app/play/constellations/page.tsx`: fonts (Instrument Serif and Instrument Sans
    via `next/font`, exposed as `--cn-serif` and `--cn-sans`) and metadata.
  - `src/app/play/content.ts`: the shared placeholder content. **Outdated; don't reuse
    its text** (see §19.9).
  - `src/app/play/layout.tsx` and `play.module.css`: the play index and the
    "All concepts" pill.
  - The other four prototypes sit next to it (`voyager/`, `orrery/`, `record/`, `dot/`).
    `dot/` has a useful example of placing layers around the real photo's dot
    coordinates, and scroll-driven zoom.
- **See it running:** `npx next dev -p 3107` in the worktree, then open
  `http://localhost:3107/play/constellations` and scroll all the way down. There are 10
  one-screen steps: hero, seven figures, the overview, then the collapse into the dot.

**What to keep from the Constellations prototype**
(`src/app/play/constellations/constellations.tsx`):

- One fixed canvas, one camera `{x, y, zoom, anchorX, anchorY}`, and keyframes per scroll
  step, with zoom interpolated **in log space** (it reads as one continuous camera move).
  Camera smoothing: `smooth += (target - smooth) * 0.12` per frame.
- Stars that have a meaning glide from a scattered position into formation, and each
  figure's lines draw edge by edge.
- The **consolidation into one blue dot**, which Meet explicitly loves, and the
  whole-map overview.
- A figure's stars are facts about it (a project's stars are its name plus its story
  beats), so the shape itself is the content.

**What changes** (all decided in the rest of this doc): 2D canvas → WebGL; constellations
only → many kinds of celestial object; the order of the flow (the dot and the map come
_first_, see §5); categories and a filter nav; real content; links out to project sites;
much richer, more "magical" rendering.

---

## 4. Who Meet is: the content source of truth

Sources: his resume (`Resume_Meet Bhatt_Sept26_v2.pdf`, shared in the conversation) and
his GitHub (`github.com/Meet2304`, 38 repos; README highlights below). **Use real
facts only.** Where a number or detail is missing, leave a visible `TODO(meet)` and don't
invent one.

### Identity

- **Meet Bhatt.** Contact: `mbbhatt@andrew.cmu.edu`, `github.com/Meet2304`,
  `linkedin.com/in/meet-bhatt2304` (per the resume), X `@Meet2304`. The resume also lists a phone
  number; don't publish it on the site unless Meet asks.
- **Education:**
  - **Carnegie Mellon University**, Pittsburgh: MS in Artificial Intelligence
    Engineering and Technology Innovation Management, expected **Dec 2027** (current).
  - **Pandit Deendayal Energy University (PDEU)**, Gujarat, India: B.Tech in Computer
    Engineering, Minor in IoT, **June 2026**, GPA 9.55/10.
- **Honor:** J N Tata Scholar (J N Tata Scholarship).
- **GitHub profile summary:** "I build practical systems at the intersection of machine
  learning, computer vision, and human-centered software."
- **Skills (resume):**
  - AI/ML: RLHF, supervised fine-tuning, language-model agents, model visualization
    tools, CNNs for image processing, time-series forecasting, Random Forest, XGBoost
  - Cloud & backend: Google Cloud Platform, Kubernetes, Supabase, Firebase, LiveKit,
    GitHub Actions
  - Full-stack: TypeScript, Next.js, React, Tailwind CSS, Python
  - Embedded: C, Teensy 4.0 and ESP32-S3, PCB design, motion-sensor integration, wired
    sensor communication
  - (GitHub also lists PyTorch, scikit-learn, OpenCV, Arduino, Raspberry Pi, Docker,
    Vercel.)

### A pattern worth using

Almost every project is **named after a myth**, and the READMEs open with that myth:
Phoenix (rebirth), Icarus (flight, "this time Icarus doesn't crash — he calculates"),
Talaria (Hermes' winged sandals), Aether (pure light, clarity), Helion (the solar centre
and its Hill sphere), Nemesis (balance and justice), Vigil (the sentinel), Monarch
(command). Helion's README is written in orbital mechanics. **So the celestial language
fits his work rather than being laid on top of it.** Each object's idea can draw on
its myth as well as its function.

### Items (full detail in Appendix A)

**Professional experience**

1. **Corporate Startup Lab, Bosch Mobility** (Aug 2026 – Dec 2026, current). 6-person
   team: market research, customer discovery, strategic-fit analysis to help Bosch
   Mobility expand its low-voltage actuator lineup into new segments.
2. **Blink Analytics** (Aug 2024 – Jun 2026). RLHF Contributor → RLHF Team Lead → Lead
   Product Development Intern.
   - Led development of **Serin**, an AI interview and hiring platform. Designed its
     real-time communication, language-model and cloud infrastructure, and its
     candidate evaluation framework.
   - Directed a summer intern team on RLHF fine-tuning and internal performance
     tracking, driving a **222% increase in project revenue in two months**.
   - Went from annotating data and evaluating models to leading human-feedback training
     teams and product development.
   - Related repos (likely part of Serin's platform; **OPEN: confirm**):
     `Project-Helion` ("Recruitment Management System based on OpenEdX and Safe Exam
     Browser", project-helion.vercel.app), `Serin_Helion_Browser` (C#, safe browser for
     Windows), `serin-education-frontend`.
3. **Astar Technologies** (Dec 2023 – Jan 2024). Lead Business and Data Analysis
   Intern. Found top-selling sweets by region and season to guide production and
   marketing; cleaned sales data; modelled regional and seasonal demand with time-series
   forecasting, Random Forest and XGBoost. The concept doc says he **turned down Astar,
   a ready-made path, for one he'd have to build**. **OPEN: what exactly was turned
   down** (a return offer? a full-time role?).

**Research** 4. **Project Phoenix: explainable cervical cancer classification** (Jul 2025 – May 2026).
`phoenix.meetbhatt.com`, manuscript in preparation. Enhanced contrast and reduced
noise in the SipakMed and Herlev cervical-cell datasets while keeping diagnostic
features; CNNs plus visualization tools to show which image regions drive
predictions. The site runs inference in the browser. Classifies 5 diagnostic
categories. Myth: rebirth through fire, "every early diagnosis is a chance to rise
again". **TODO(meet): accuracy and metrics.** 5. **Malicious prompt classifier, "Project Vigil"** (Jul 2025 – Oct 2025). Paper
submitted to a conference. A probabilistic detector for malicious LLM prompts using
Markov-chain transitions, with an explanation module that highlights high-risk
patterns. **90.79% accuracy, 98.84% precision, 82.54% recall, F1 89.96%.** The repo adds
a novel **Leave-One-Out Deletion (LOD)** technique that removes the dangerous fragment
while keeping the user's intent. Myth: the sentinel who never sleeps.

**Projects** 6. **Linea: desktop music lyrics overlay** (Apr 2026 – present). `linea.meetbhatt.com`,
open source. An Electron app for Windows (legacy Mac build 0.1.6): transparent,
always-on-top, click-through; follows local Windows media sessions (no Spotify login);
synced lyrics via LRCLIB with a NetEase fallback; offline cache; **per-track cymatic
artwork**; auto-updates; local storage only. Current release 0.2.0.
**TODO(meet): downloads and users.** 7. **Project Icarus: custom drone** (Jul 2024 – Jun 2026). Designed, built and flew a
custom drone; self-built Teensy 4.0 flight controller, custom PCB, motion and pressure
sensors; full flight-control system in C that fuses sensor readings to stabilize
orientation. Modular, built for fast manufacturing. Myth: "Icarus doesn't crash — he
calculates. And he lands exactly where he means to." **TODO(meet): results.** 8. **Project Talaria: wearable heart and gait monitor** (Jul 2025 – Nov 2025).
`talaria.meetbhatt.com` ("Integrated footwear system for concurrent cardiovascular and
gait analysis"). An ESP32 smart-shoe module (MPU6050 motion, MAX30102 heart
rate/SpO₂) streaming to a cloud pipeline; an RNN forecasts **15 physiological and
motion features 50 steps ahead, R² = 0.97, MAE 0.103, trained on 50,000+ sequences.**
Myth: Hermes' winged sandals, "every step into insight".

**Leadership** 9. **Mind Ripple, the quizzing club of PDEU** (Nov 2022 – Apr 2026). Subcommittee
Member → Head of Graphic Design → President → Advisor. Led a **30-member team**; grew
the flagship event, **Matrix Breakout (an escape room), to 300+ participants**,
with earnings up **10% year over year**. 10. **Interact Club of Baroda Sayajinagari**, Charter President, Rotary-affiliated (Jul
2021 – Jun 2022). **Founded** it and led **32 teenagers under 19** in service projects
with nonprofits, including the Pratibha Foundation.

**Archive** (from GitHub, not on the resume; see Appendix B): Converge (hackathon team
formation, `converge.meetbhatt.com`), Loom (visa-interview intelligence), Aether (computer
vision for skateboarding judging), Nemesis (Gujarat courts), Monarch (product financial
forecasting), Vita (household health monitoring), Codex (an earlier personal "living
manuscript" site), Ditherly, Hyperion, plus coursework repos.

---

## 5. The experience: the full flow

**DECIDED** (Meet changed the order during the conversation, and this is the final
version):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. THE DOT       Recreated Voyager frame, drawn in real time. Name + line. │
│        │  scroll                                                          │
│        ▼                                                                  │
│ 2. THE MAP       Camera pulls back from the dot. All his work appears     │
│                  around it. Threads of light connect each object to the  │
│                  dot, which brightens: his impact on it. Nav appears.     │
│        │  scroll (or use the nav filter first)                            │
│        ▼                                                                  │
│ 3. THE JOURNEY   One stop at a time, NEWEST → OLDEST. The camera moves    │
│                  OUTWARD from the dot (farther = further back in time).   │
│                  Each stop is a group of objects; each object performs    │
│                  its idea; a panel shows Goal / What I owned / Impact /   │
│                  Visit the site.                                          │
│        │  scroll                                                          │
│        ▼                                                                  │
│ 4. THE ENDING    The edge: the oldest light. Contact, Resume, Read the    │
│                  note, and "Back to the dot".                             │
└──────────────────────────────────────────────────────────────────────────┘
```

Why this order (Meet's reasoning, and it's sound): the strongest image comes first.
A visitor who leaves after 10 seconds has still seen the dot, the full map of his work,
and his impact. Scrolling on gives the details.

An earlier version put the journey first and the consolidation into the dot at the end.
**That is superseded.** The "everything becomes the dot" moment is now part of step 2,
played in reverse: the camera pulls back from the dot to show what surrounds it,
and threads of light run from each object back into the dot.

**The time metaphor (DECIDED in spirit, keep it):** in real astronomy, looking farther
away means looking further back in time, because the light has been travelling longer.
So **distance from the dot = how long ago.** Recent work sits close to the dot and older
work farther out. Faint concentric **year rings** (like the grid on a star chart) label
2026 … 2021. The journey from newest to oldest is therefore physically a move outward.

---

## 6. Opening: the recreated photograph

**DECIDED:** "Don't open on the real photo, recreate it. I want the transition to be
smooth." The opening frame must be **drawn by the same WebGL renderer as the rest of the
sky**, so pulling back from the dot to the map is one continuous camera move with no
hand-off between an `<img>` and the scene.

### What the real frame is made of (reproduce each part)

Reference: `public/pale-blue-dot.jpg`, dot at (609, 404) of 1024×768.

1. **Background:** a dusty blue-grey gradient, darker and cooler at the top right
   (≈ `#0e1726`), lighter and slightly violet toward the bottom (≈ `#5b6680`–`#7a809a`).
   It has heavy fine grain (film or CCD noise) with low-frequency mottling.
2. **The sunbeams:** broad, soft, **nearly vertical bands tilted a few degrees**, the
   main one passing right through the dot and slightly left of it. They're lighter, and
   slightly warm or pink-lavender. These are **scattered sunlight inside Voyager's
   camera optics**, not objects in space. The main band narrows toward the top. Fainter
   secondary bands sit on the left.
3. **The dot:** tiny (in the original, Earth is **0.12 of a pixel**), pale blue-white,
   with a very slight bloom. On screen, draw it at ~2–3 CSS px with a soft halo so it
   stays visible and meaningful.

### Recreation method (PROPOSED)

- A full-screen fragment shader: gradient + fbm noise for mottling + high-frequency
  hashed grain (re-seeded slowly or per frame at low amplitude for "film") + 2–3 gaussian
  bands (`exp(-((x - center(y))² / width²))`, with center(y) linear for the tilt and width
  shrinking toward the top) tinted warm-lavender + the dot as a sprite (or as part of the
  starfield) with bloom.
- Use **lygia** for noise (`lygia/generative/fbm`, `snoise`).
- **Build a comparison toggle** (debug only, e.g. `?compare=1`) that swaps between the
  real JPEG and the recreation at identical framing, or shows a split slider. Match the
  real frame closely.

### The opening screen's content

- Top: the nav is hidden or very quiet at this point (PROPOSED; it fades in at the map).
- Beside the dot, left-aligned, generous space:
  - `Meet Bhatt`
  - **"What's missing, I make."** (hero line, the largest type on the page)
  - One line on who he is now, e.g. _"AI engineer and product builder. MS in AI
    Engineering at Carnegie Mellon."_ (wording **PROPOSED**; confirm with Meet)
  - A quiet cue to scroll.
- The dot itself links to `/story` (hover or focus: "Read the note"). **PROPOSED.**
- Load sequence: **one orchestrated moment only.** For example: black → grain fades up →
  sunbeam bands bloom in → the dot ignites last → type rises. Nothing else animates on
  its own.

### The transition from dot to map (the key moment)

Driven by scroll, reversible, and continuous:

1. The camera pulls back (log-space zoom) while staying locked on the dot.
2. The sunbeam bands fade: "we turn away from the Sun". They're a camera artifact, so
   they belong only to the Voyager framing.
3. The blue-grey haze and grain dissolve into black space; the grain's brightest
   specks resolve into the star field (continuity trick: spawn stars where grain peaks
   were).
4. The objects of his work fade in at their positions around the dot. The threads of
   light draw from each object into the dot (see §7).
5. The nav fades in.

---

## 7. The map: the dot and his impact on it

The map is the **home screen** of the site: the view the nav returns to, and where
filtering happens.

### Layout

- **The dot is the fixed centre.**
- Objects are placed by **time**: radius from the dot = how long ago (use each item's
  start date, or its midpoint; **PROPOSED:** start date, to match the journey order).
  Angle is free: choose it so objects don't collide and the composition is balanced.
  An outward spiral (angle increasing with age) reads well and gives the journey a
  natural path.
- Faint **year rings** at each year's radius, labelled small (2026, 2025, … 2021).
- **Priority** (§8) controls each object's size and brightness on the map. **Serin must be
  the brightest object on the map** (it's his strongest ownership story, and the
  concept doc says the strongest ownership arc should land first; the journey order
  can't do that, so the map does).
- Archive items (priority 3) are faint points: present, hoverable, clickable, never
  loud.

### Impact on the dot

- As the map forms, **each object sends a thread of light into the dot**, and the dot
  brightens as the threads arrive. This is the payoff Meet wants: his work visibly adds
  light to the point where everything happened.
- **Impact figures appear along or near the threads, one at a time**, using real
  numbers only:
  - 300+ participants in Matrix Breakout (Mind Ripple)
  - 32 teenagers led in service projects (Interact Club)
  - 222% increase in project revenue in two months (Blink Analytics)
  - 90.79% accuracy / 98.84% precision catching malicious prompts (Vigil)
  - R² = 0.97 forecasting 15 health and motion signals (Talaria)
  - Open-source software on people's desktops (Linea; **TODO(meet): download count**)
  - Phoenix: **TODO(meet)**
- A closing line near the dot. **PROPOSED** copy: _"It's still a small dot. It's a
  little brighter than it was."_ (Reword so it doesn't imply a "before" the visitor
  never saw. The dot was dimmer in the opening frame, so the brightening happens on
  screen and the line is earned.)
- After this beat, the nav is live and the visitor can filter (§10) or keep scrolling
  into the journey.

---

## 8. The journey: stops, groups and priority

### Order

**DECIDED:** newest → oldest (camera moves outward). **Stops are groups of objects**
(DECIDED: "I agree to make the stops collection of celestial bodies. I will simply have
more emphasis on the ones that matter more and prioritize them.").

### Priority system (DECIDED in principle; Meet assigns the actual values)

Every item gets `priority: 1 | 2 | 3`:

| Priority         | On the map                             | In the journey                                                                     |
| ---------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| **1** (flagship) | Large and bright; visible from the map | Its own full stop, a long scroll, its full animated idea, the full case panel      |
| **2**            | Medium; part of a group                | Shares a stop with its group; shorter scroll; short animated idea; condensed panel |
| **3** (archive)  | A faint point                          | Named in its group's panel with a link; no animation of its own                    |

**PROPOSED defaults** (Meet must confirm): priority 1 = Serin (inside Blink), Phoenix,
Linea, Talaria; priority 2 = Vigil, Icarus, Mind Ripple, Interact Club, Astar, Bosch;
priority 3 = archive repos.

Scroll length per stop is proportional to its weight (e.g. priority 1 ≈ 150–200vh,
priority 2 ≈ 80–100vh, a group ≈ the sum with a cap).

### Stops (PROPOSED grouping; the order is by start date, newest first)

| #   | Stop (group)        | Members                                             | Category              | Notes                                                                                                              |
| --- | ------------------- | --------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | **Now**             | Bosch Mobility (p2), CMU (context only), Linea (p1) | Experience + Project  | Fixes the weak-first-stop problem (Bosch alone is in progress and thin). Linea is the priority-1 object inside it. |
| 2   | **Research, 2025**  | Phoenix (p1), Vigil (p2)                            | Research              | Both started Jul 2025.                                                                                             |
| 3   | **Talaria**         | Talaria (p1)                                        | Project               | Jul 2025.                                                                                                          |
| 4   | **Blink Analytics** | Blink (p2 system) with Serin (p1) inside            | Experience            | Aug 2024 – Jun 2026. The strongest ownership story.                                                                |
| 5   | **Icarus**          | Icarus (p2)                                         | Project               | Jul 2024.                                                                                                          |
| 6   | **Astar**           | Astar (p2) + the "turned it down" comet             | Experience + Decision | Dec 2023.                                                                                                          |
| 7   | **Mind Ripple**     | Mind Ripple (p2)                                    | Leadership            | Nov 2022.                                                                                                          |
| 8   | **Interact Club**   | Interact Club (p2)                                  | Leadership            | Jul 2021, the oldest light.                                                                                        |
| —   | Archive             | Converge, Loom, Aether, Nemesis, Monarch, Vita…     | Mixed                 | Placed by date on the map as p3 points; attached to the nearest stop's panel as "Also from this time".             |

Rationale for keeping chronological order even though Serin lands 4th: the metaphor
(outward = back in time) depends on it. Serin's prominence is handled by its brightness
on the map, its priority-1 treatment, and the fact that the filter nav lets people jump
straight to it.

### Behaviour at each stop

1. The camera eases to the group, framing it off-centre so the panel has room (the
   prototype anchored the figure at 66% of the width on desktop, and at the top third on
   mobile).
2. The group's objects brighten; others dim slightly.
3. Each priority-1 object **performs its idea** (§12) once as you arrive, then settles
   into a calm idle loop. The performance is scrubbed by scroll (reversible), not a timer.
4. The case panel appears (§13).
5. Clicking an object on the map, or in any stop, jumps the journey to its stop.
6. A small year marker (2026 … 2021) shows where you are.

---

## 9. The ending

The journey ends at the oldest light (Interact Club, 2021), at the edge of the map.
**PROPOSED** (not yet confirmed by Meet):

- The camera settles past the last stop, looking outward into darkness, with the map
  and the dot visible behind it.
- Copy (PROPOSED): _"This is the oldest light I've got. Past it, it's still dark. The next
  thing is what I'm making now."_
- Links: **Contact** (email and socials), **Resume**, **Read the note** (`/story`), and a
  **"Back to the dot"** button that animates the camera back to the map (scroll to top
  plus a camera ease).

---

## 10. Navigation and the category filter

**DECIDED:** a central navigation bar at the top. Clicking a category (for example
Projects) **highlights that category's objects and hides the rest**, like a filter. If
the visitor ignores the nav and keeps scrolling, they get the full journey from newest to
oldest.

### Layout (PROPOSED)

```
        ●  All   Experience   Projects   Research   Leadership        Story  Resume
```

- **● (a small pale blue dot)** always returns the camera to the map view and clears
  nothing else.
- **Category items sit in the centre.** Current category shows as active.
- **Site links** (Story, Resume) are smaller, on the right.
- The nav is hidden or quiet on the opening frame and fades in as the map forms.
- **Research as its own category is PROPOSED** (the resume has a separate "Research
  Experience" section: Phoenix and the prompt classifier). **OPEN** for Meet. If he
  declines, fold Research into Projects.

### Filter behaviour (PROPOSED details)

- Clicking a category while mid-journey → camera returns to the map, then applies the
  filter.
- Matching objects stay (and slightly intensify); non-matching objects **fade to faint
  ghosts that can't be clicked** (PROPOSED) rather than disappearing. That keeps the
  map's shape and the dot's threads readable. Meet said "hide". Offer fully hidden as a
  one-line setting and confirm (**OPEN**).
- Threads to the dot: only matching threads stay lit, and the impact figures shown
  change to match the category.
- **The journey follows the filter.** With "Experience" active, scrolling tours only
  Bosch → Blink/Serin → Astar. This turns the filter into a set of focused tours, which is
  ideal for recruiters. Page scroll length is recalculated for the filtered stop list, and
  scroll resets to the map.
- **URL state:** `/?view=projects` (and `?stop=serin` for deep links). The page restores
  from the URL on load.
- **Keyboard:** the nav is a real `<nav>` of buttons or links with visible focus; the
  filter is `aria-pressed` or a radio group; objects on the map are focusable (Tab),
  Enter opens a stop, and Esc closes panels.
- **List view toggle** (PROPOSED): a plain, fast list of the same content (grouped by
  category, newest first), for recruiters and for accessibility. The same data, rendered
  as HTML.

---

## 11. Types of object: telling categories apart

**DECIDED direction:** different kinds of work look different. Each category gets its own
**kind of object, colour temperature and motion**, so it reads before any label:

| Category                    | Object type                          | Look                                                   | Why it fits                                                                                                    |
| --------------------------- | ------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Projects**                | **Nebulae** (where stars form)       | Soft, glowing clouds; cool violet and blue             | Things he created                                                                                              |
| **Research** (if separate)  | **Nebulae with a sharp bright core** | Cooler and more precise; defined structure             | Like projects, but centred on a finding                                                                        |
| **Professional experience** | **Star systems**                     | A hard point of light with orbits; warm gold and white | He worked inside something bigger; his roles and wins orbit it                                                 |
| **Leadership**              | **Constellations**                   | Fine silver lines joining stars                        | Leading means joining separate people into one shape. Keeps the original constellation idea where it fits best |
| **Decisions**               | **Comets**                           | A streak with a tail                                   | They pass through and change direction (e.g. Astar)                                                            |

A small **legend** (a star-chart key) in a corner explains the types, and clicking a legend
entry acts as the same filter as the nav.

**The core rule for every object:** the object _type_ comes from the category, and its
_behaviour_ comes from what that project was trying to do. One idea per object, drawn
simply, **played once when you arrive**, then a quiet idle. Minimal and artistic, not a
literal illustration.

---

## 12. Every object and what it does

These are **PROPOSED** designs grounded in the real content. Tune them in the lab (§15)
with Meet. Each object needs: an **arrival performance** (scroll-scrubbed, ~1 screen of
scroll), an **idle** state (subtle, low cost), a **map** appearance (small and cheap), and
a **reduced-motion still**.

### Bosch Mobility (Experience, now): a disk where planets are still forming

- Idea: work in progress. A warm, young star with a dusty disk; clumps just beginning to
  gather. Unfinished on purpose.
- Arrival: dust settles into a disk; a couple of faint clumps brighten, as if a scan is
  picking out opportunities ("customer discovery").
- Content hook: 6-person team, new segments for low-voltage actuators.

### Linea (Project, p1): a vibrating ring nebula with one line of light

- Idea: lyrics that float above your work; a single "current line"; Linea already makes
  **per-track cymatic artwork**.
- Arrival: a ring nebula whose rim vibrates in cymatic (Chladni-like) patterns, as if
  driven by sound; one luminous horizontal line of light sits across it: the current
  lyric. Optionally, a few real words drift along the line (the site's own words, not
  song lyrics).
- Idle: slow shimmer; the line gently pulses.
- Link: linea.meetbhatt.com.

### Project Phoenix (Research, p1): a planetary nebula shaped like a cell, reborn

- Idea: cervical-cell classification + explainability + rebirth (the myth).
- Look: a **planetary nebula**, which naturally resembles a cell: a round shell (the
  cytoplasm) with a bright core (the nucleus).
- Arrival: (1) the shell forms; (2) **an explainability sweep**, a saliency-style glow,
  passes over the nebula and lights up the regions that "drive the prediction"; (3) the
  shell expands outward like a gentle supernova remnant and **a new star ignites at the
  centre**: rebirth.
- Link: phoenix.meetbhatt.com.

### Vigil / malicious prompt classifier (Research, p2): a magnetosphere

- Idea: detect and remove harmful prompts without breaking the conversation (Leave-One-
  Out Deletion); the sentinel.
- Look: a small protected body with a magnetosphere (field lines like Earth's shield
  against the solar wind).
- Arrival: a steady stream of particles (prompts) flows in; most pass through the field
  unchanged; a few tinted particles are **caught at the field line and plucked out**,
  while the stream behind them carries on unbroken.
- Stats: 90.79% accuracy, 98.84% precision.

### Project Talaria (Project, p1): a pulsar

- Idea: heart rate + gait + forecasting ahead.
- Look: a pulsar whose beam sweeps like a stride, and which **beats like a heart**.
- Arrival: it starts beating; then faint **"ghost pulses" run ahead** of the real ones,
  the 50-step forecast. The real pulses land on the ghosts (R² = 0.97).
- Optional nod to the myth: two faint wing-like beams (Hermes' sandals).
- Link: talaria.meetbhatt.com.

### Blink Analytics (Experience, p2 system) with Serin (p1): a growing star and a binary

- Blink idea: growth from contributor to team lead to product lead, and the 222% revenue
  jump.
- Look: a star system. Arrival: the star **grows in three stages** (each stage labelled
  with the role); its light swells by about 3.2× (the 222% increase).
- **Serin**, nested inside the system: an AI interview and hiring platform with real-time
  communication (LiveKit), an LLM and an evaluation framework. Look: **a binary star, two
  bodies trading light in real time** (the AI interviewer and the candidate); a faint
  measuring ring around them (the evaluation framework).
- Moving in from Blink reveals Serin. Serin is the brightest object on the whole map.
- If Helion is part of Serin (**OPEN**): a protective sphere (the Hill sphere from its
  own README) around the binary, for the secure assessment environment.

### Project Icarus (Project, p2): a sun-grazer that doesn't burn

- Idea: a self-built flight controller stabilizing a drone. "This time Icarus doesn't
  crash — he calculates."
- Arrival: a small body approaches a star, **wobbles** (a damped oscillation, like a PID
  loop settling), corrects itself and **settles into a stable orbit**. The wobble decaying
  is the whole story.

### Astar (Experience, p2) + the decision (a comet)

- Astar idea: seasonal and regional demand forecasting for sweets.
- Look: a small star system whose planets **brighten and dim with the seasons** as they
  orbit.
- **The decision:** a comet leaves the system on its own trajectory: turning down the
  ready-made path. The comet's path should visibly head toward the newer work (inward on
  the map), tying the decision to everything after it.

### Mind Ripple (Leadership, p2): a maze constellation with ripples

- Idea: quizzing club, the Matrix Breakout escape room, 300+ participants, a 30-member
  team, and Meet's arc from subcommittee member to advisor.
- Arrival: 30 stars join into a **maze-like constellation**; one star **escapes** the maze;
  **ripples** (the club's name) spread outward and light up 300+ specks of dust (the
  participants).
- Optional: Meet's own star moves from the edge to the centre, then steps aside
  (member → president → advisor).

### Interact Club (Leadership, p2): 32 stars around a founding star

- Idea: founded the club; 32 teenagers under 19; service with nonprofits.
- Arrival: **one founding star lights first**, then 32 small stars gather around it and join
  into a constellation; together they **lend light to a dim neighbouring star** (the
  nonprofit work, e.g. the Pratibha Foundation).
- It's the oldest light on the map, and the ending (§9) sits just beyond it.

### Archive items (p3)

Faint points on the map, placed by date. Hover or focus shows the name and a one-line
description; click opens a small card with the link. Optional tiny identifying touches
(PROPOSED): Converge = a few specks that drift together into pairs; Loom = one thread;
Aether = a clear lens; Nemesis = a balanced pair; Monarch = a crown-shaped trio.

---

## 13. Case panels and per-item pages

**DECIDED:** every item links to its own website if it has one. The site's job is to
explain **the goal and vision, what Meet contributed, and what impact it made.**

### Panel structure (in the journey)

1. **Title + category + dates.** Short.
2. **Goal:** the problem and the vision, in one or two sentences.
3. **What I owned:** his decisions and contributions, not the team's output. Follow the
   concept doc's four-part shape where it fits: the situation before, what he chose to
   take on, the trade-off (where he could have stayed in his lane and didn't), and what
   it changed about how he works now.
4. **Impact:** real numbers or a real change. Never invented.
5. **Visit the site** (only when a site exists) + optional "Source code" link.

Priority-2 items get a condensed panel (goal + owned + impact in 3 lines). Priority-3
items are listed at the bottom of their group's panel ("Also from this time").

### Worked example: Phoenix

- **Goal:** catch the earliest cell changes in cervical cancer, and show _why_ the model
  decided, not just how confident it is.
- **What I owned:** image cleanup on the SipakMed and Herlev datasets that keeps diagnostic
  features intact; the CNN models; the visual explanations; a browser-based inference site.
- **Impact:** manuscript in preparation; the model runs live in the browser.
  **TODO(meet): accuracy and metrics.**
- **Visit:** phoenix.meetbhatt.com · Source: github.com/Meet2304/Project-Phoenix

### Per-item pages (PROPOSED)

- `/work/[slug]` (e.g. `/work/serin`). A shareable page that **opens with the camera
  already on that object**, with the fuller case below it in normal HTML (good for SEO
  and for sending to someone). **OPEN (Meet):** panel only, full page only, or both.
  Recommended: both. The panel in the sky links to "Read more" → `/work/[slug]`.
- Note the current `next.config.ts` redirects `/work` to `/` for the coming-soon gate;
  change that deliberately when the new site launches.

### Links (DECIDED to link; OPEN which ones)

- Clear: `phoenix.meetbhatt.com`, `linea.meetbhatt.com`, `talaria.meetbhatt.com`,
  `converge.meetbhatt.com`.
- **OPEN:** whether to link the `*.vercel.app` sites (Loom, Aether, Helion, Nemesis,
  Monarch, Codex) and GitHub repos.

---

## 14. Visual direction: "magical"

Meet wants the style "more magical and eye catching", and says he's "very concerned"
about getting "absolutely beautiful and magical components". The prototype (2D
dots and lines) is too plain. Direction:

- **Rendering:** WebGL with custom shaders; volumetric-looking nebulae (layered fbm
  noise, soft additive blending); **bloom** on everything bright (this is most of what
  separates "glowing" from "dots on black"); subtle film grain everywhere (it also ties
  the whole sky to the recreated photo's grain); very slight chromatic aberration at the
  frame edges at most.
- **Palette (PROPOSED starting point):** true black space (`#000`, as in Horizon); the
  dot's pale blue (≈ `#9cc8ff`–`#bcdcff`); **cool nebula violets and blues** for projects
  and research; **warm gold and white** for experience stars; **silver** for
  constellation lines; the sunbeams' warm lavender only in the opening. The Horizon
  ultramarine (`#0d7bff`) can be the interactive accent (focus rings, the active nav item).
- **Type:** the prototype used Instrument Serif (display, italic for names) + Instrument
  Sans (text), which Meet liked in context. Keep, or re-choose deliberately. One display
  face and one text face; a clear scale; sentence case.
- **Motion:** one orchestrated load moment; everything else responds to scroll or input.
  Arrival performances are scroll-scrubbed and reversible. Idle loops are slow and quiet.
  Use Horizon's easing tokens.
- **Restraint (from the concept doc):** one dominant gesture per screen. If removing an
  effect loses nothing real, remove it.
- **Avoid generic tells** (from the `frontend-design` skill guidance): all-caps tracked
  eyebrow labels over every heading; "A · B · C" metadata joined with middle dots; `→`
  appended to every link; identical rounded cards with the same shadow; gradient washes as
  decoration; one italic or coloured word accented in a headline. Numbered markers only
  where the content really is a sequence (the journey and year markers are real
  sequences).
- **Getting the look right:** ask Meet for **3–5 visual references** (sites like Lusion,
  Active Theory, igloo.inc, JWST imagery, film stills). This hadn't been answered yet;
  ask early. Then tune in the lab with him (§15).

---

## 15. Technical architecture

### Libraries (PROPOSED; all npm, add when implementation starts)

| Package                                            | Purpose                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `three`, `@react-three/fiber`, `@react-three/drei` | WebGL inside React. Check R3F compatibility with React 19.2 and Next 16 (use Context7 docs) |
| `@react-three/postprocessing` (+ `postprocessing`) | Bloom, noise/grain, vignette, subtle chromatic aberration                                   |
| `lygia`                                            | Shader noise and utility functions (fbm, simplex, etc.)                                     |
| `leva`                                             | Live tuning sliders in the lab (dev only; strip from production)                            |
| `gsap` (+ ScrollTrigger)                           | Scroll-driven camera and timeline choreography. GSAP is free, including plugins             |
| `lenis`                                            | Smooth scrolling (check it works with ScrollTrigger and sticky sections)                    |
| `motion` (already installed)                       | DOM and UI animation (panels, nav)                                                          |
| Optional: `@theatre/core` + studio                 | Visually choreographing camera paths, if the camera moves get complex                       |

### Structure (PROPOSED)

```
src/
  app/
    page.tsx                 the sky (dot → map → journey → ending); server component shell
    work/[slug]/page.tsx     per-item pages (HTML case + camera deep link)
    play/lab/page.tsx        the lab: one object at a time + leva
  content/
    cosmos.ts                ALL content + object config (Appendix A shape)
  components/cosmos/
    Scene.tsx                <Canvas>, camera rig, postprocessing, frame loop
    CameraRig.tsx            keyframes (dot, map, each stop, ending), log-space zoom, filter-aware
    VoyagerFrame.tsx         recreated photo shader (grain, bands, dot) + fade-out
    Starfield.tsx            background stars (spawned from grain peaks for continuity)
    Dot.tsx                  the pale blue dot + brightness uniform driven by impact threads
    Threads.tsx              light threads from objects to the dot
    YearRings.tsx
    bodies/                  one component per object type/idea:
      Nebula.tsx, PlanetaryNebula.tsx (Phoenix), RingNebula.tsx (Linea), Pulsar.tsx (Talaria),
      StarSystem.tsx (Blink/Astar/Bosch), Binary.tsx (Serin), Magnetosphere.tsx (Vigil),
      Grazer.tsx (Icarus), Constellation.tsx (leadership), Comet.tsx (decisions), Faint.tsx (archive)
    ui/
      Nav.tsx, Legend.tsx, CasePanel.tsx, YearMarker.tsx, ListView.tsx, Ending.tsx
  lib/cosmos/
    scroll.ts                scroll → continuous "step" value, filtered stop list
    debug.ts                 ?t= / ?scroll= / ?compare= / ?still= hooks
```

**Shared object interface (PROPOSED):**

```ts
type BodyProps = {
  /** 0 = on the map (small, cheap), 1 = the camera has arrived. */
  focus: number;
  /** 0..1: arrival performance, scrubbed by scroll. */
  perform: number;
  /** false when filtered out: fade to ghost, stop responding to pointer. */
  visible: boolean;
  priority: 1 | 2 | 3;
  reducedMotion: boolean;
  quality: "high" | "low"; // phone and low-power path
};
```

### Scroll model

- The prototype mapped `scrollY / innerHeight` to a continuous `step` (0 = hero, then
  1 step per stop), with every section exactly 100svh. The new model has variable stop
  lengths (priority-weighted), so compute stop boundaries from the filtered stop list and
  map scroll → `(stopIndex, localProgress)`. Use ScrollTrigger or one custom rAF loop;
  don't mix several competing scroll listeners.
- Everything (camera, `perform`, panel visibility) derives from that one value, so the
  whole experience is deterministic and reversible, and screenshots are reproducible.

### Content in HTML, sky as enhancement

- All text (names, panels, impact, links, nav) is **real DOM**, overlaid on or next to the
  canvas. The canvas is `aria-hidden`. Search engines and screen readers get the full
  content without WebGL.
- `/work/[slug]` pages are server-rendered HTML with metadata.

### The lab (`/play/lab`, PROPOSED, and the most important working tool)

- One object on screen at a time, a picker for which, `leva` sliders for colour, density,
  speed, glow, noise scale, and a `perform` slider to scrub the arrival.
- Workflow with Meet: **the agent makes each object work and perform well; Meet judges
  when it's beautiful.** He tunes the sliders, sends the values (leva can copy them), and
  the agent locks them in as defaults in `cosmos.ts`.
- **Suggested first three objects:** Phoenix (a nebula), Talaria (a pulsar), and
  Blink/Serin (a star system + binary): one from each main category.

---

## 16. Tooling the agent needs

Meet asked directly what tools are needed for "absolutely beautiful and magical
components". The answer given, ranked by impact:

1. **A way to see motion (the biggest gap).** Judging from still screenshots misses how
   things move, and that's most of what makes this beautiful.
   - **Playwright MCP**: screenshots and recordings at exact moments, taken by the agent
     itself. Install: `claude mcp add playwright -- npx @playwright/mcp@latest`
   - **Chrome DevTools MCP**: performance traces (frame rate, GPU cost, dropped frames).
     Install: `claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest`
   - (Meet was asked to install both. Check whether they're available in your session;
     if not, ask him.)
   - **Build a debug hook into the site** (`src/lib/cosmos/debug.ts`), dev only:
     `?scroll=0.35` (freeze scroll progress), `?t=2.4` (freeze the clock), `?still=1`
     (reduced-motion render), `?compare=1` (real photo vs recreation). With these, any
     frame of any transition can be captured as a sequence of stills and compared
     before and after.
   - Fallback used in this session (the T3 preview panel's screenshot tool failed with
     `PreviewAutomationExecutionError`): a Playwright script outside the repo, at
     `C:\Users\meetb\AppData\Local\Temp\shot\shot.mjs` (`playwright-core`, headed
     Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`). Usage:
     `node shot.mjs <url> <outPrefix> stops=0,50%,900 w=1440 h=900 wait=2500 settle=1200 click="<selector>"`.
     It captures the page at each scroll stop and prints console errors. Note: headless
     WebGL may use software rendering (SwiftShader), so it's slow and can look different.
     Prefer the GPU or headed mode for visual checks.
2. **Docs:** **Context7** is connected. Use it for current three.js, R3F, drei,
   postprocessing, GSAP and Lenis APIs, and the Next 16 docs in `node_modules/next/dist/docs/`.
3. **Meet's eye:** his 3–5 references, lab tuning sessions, and a **real phone** for testing
   (T3 Code device tools, `device_list` / `device_screenshot`, if he connects one).
4. **A project skill** (PROPOSED): use `skill-creator` to write a "Pale Blue Dot visual
   system" skill (palette, how the glow works, motion timing, shader conventions,
   category-to-object rules, the "avoid" list), so every future session builds in the
   same visual language instead of drifting.
5. Useful existing skills: `frontend-design` (visual direction), `design:design-critique`
   (structured review), `design:accessibility-review` (before launch).

**Not recommended:** Figma (the figma plugin needs authentication and isn't useful for
code-drawn visuals), Spline, generic component generators (e.g. 21st.dev Magic); they pull
the look toward templates.

---

## 17. Build phases and acceptance criteria

Build in the `play` worktree first (e.g. `/play/cosmos` and `/play/lab`), and move to `/`
only when Meet approves.

### Phase 0: content

- Create `src/content/cosmos.ts` from Appendix A. Mark every missing fact
  `TODO(meet)`. Get Meet to fill in priorities, the missing numbers, the Astar decision, and
  the link list.
- **Done when:** every item has category, dates, priority, goal, owned, impact (or
  TODO), link(s), and object type.

### Phase 1: the opening (build this first; it's what everyone sees)

- WebGL setup, the debug hooks, the recreated Voyager frame with the comparison toggle,
  the load sequence, the scroll-driven pull-back to a map of **simple placeholder
  objects**, year rings, threads to the dot, the dot brightening, and the impact lines.
- **Done when:** the recreation is hard to tell from the real photo at the same
  framing; the dot → map transition is continuous, reversible and runs at ~60fps on a
  laptop; reduced motion shows a composed still sequence; Meet approves the moment.

### Phase 2: navigation and filter

- Nav, legend, filter (ghost vs hidden setting), URL state, "back to the dot",
  filter-aware stop list, list view.
- **Done when:** every category filters correctly on the map; scrolling after a filter
  tours only that category; URLs deep-link; everything works by keyboard.

### Phase 3: the lab and the objects

- `/play/lab`, then objects one by one: Phoenix, Talaria, Blink/Serin first, then the rest.
  Each has map, idle, arrival (scrubbable) and still states, plus a low-quality path.
- **Done when:** Meet has tuned and approved each priority-1 object.

### Phase 4: the journey

- Camera stops, panels, year marker, priority-weighted scroll lengths, archive listings,
  the ending.
- **Done when:** the full scroll from the dot to the ending works in both directions,
  with the full stop list and with every filter.

### Phase 5: pages and polish

- `/work/[slug]` pages, metadata, OG images (optionally rendered from each object), phone
  performance tiers, accessibility audit, `npm run ci` green, a dated note in
  `documentation/`, then plan the swap from coming-soon to live (redirects, `robots.ts`).

---

## 18. Quality floor: accessibility, performance, SEO, mobile

- **Reduced motion:** `prefers-reduced-motion` → no scroll-scrubbed motion or looping
  shaders; show composed stills per stop, with crossfades at most.
- **Keyboard and screen readers:** real `<nav>`, buttons and links; visible focus;
  the canvas is `aria-hidden`; all content is in DOM; panels are announced in order;
  a skip link. The Horizon base has an `.hz-skip` pattern.
- **Contrast:** text over glowing areas needs a scrim or placement that keeps it
  readable (the prototype used a radial dark wash behind panels).
- **Performance budgets (PROPOSED):** 60fps on a recent laptop; ≥30fps on a mid-range
  phone. Tiers: device pixel ratio capped (≤2 desktop, ≤1.5 mobile), fewer particles,
  cheaper bloom, lower-resolution nebulae on `quality: "low"`. Pause rendering when the
  tab is hidden or the canvas is offscreen. Don't load the WebGL bundle for crawlers or
  the list view.
- **Mobile layout:** panels at the bottom, objects framed in the top third (as in the
  prototype); a nav that fits at 320px width (segmented control or scrollable); safe-area
  insets (Horizon already uses `viewport-fit=cover`).
- **SEO:** the home page and `/work/[slug]` have real text, titles and descriptions; the
  current site is `robots`-gated for some routes, so update it on launch.
- **Fallback:** if WebGL is unavailable, render the list view with a static image of the
  map.

---

## 19. Known traps and lessons from the prototypes

1. **Hydration mismatches from floating-point maths.** Server and client produced
   slightly different `Math.sin` results for procedurally placed SVG circles (Into the
   Dot). Fix: a deterministic seeded `rand()` **and** rounding to 3–4 decimals before
   rendering to markup. Better: generate procedural geometry only on the client (inside
   the canvas or effects).
2. **React Compiler lint rules** in this repo's ESLint (`--max-warnings=0` in CI):
   - `react-hooks/refs`: don't pass or assign refs inside functions called during render
     (a ref-callback factory tripped it). Use `data-*` attributes plus a query inside the
     effect, or stable refs.
   - `react-hooks/set-state-in-effect`: don't call `setState` synchronously in an effect
     body. Derive state instead (e.g. the Golden Record's `spinning` was derived rather
     than stored).
   - Unused `eslint-disable` comments are warnings, which fail CI.
3. **next/font variables in canvas.** Canvas `ctx.font` can't read `var()`. Read the
   font-family string from the CSS custom property that next/font sets (e.g.
   `getComputedStyle(el).getPropertyValue("--cn-serif")`) and use it directly. For WebGL
   text (troika/drei `Text`), load the font file explicitly.
4. **Global heading styles.** `src/styles/horizon/base.css` sets `h1`–`h3` to
   `--font-display` (Marcellus). A route that wants its own face must set `font-family`
   explicitly on its headings.
5. **SVG dashes and `vector-effect: non-scaling-stroke`:** in Chrome, dash lengths are
   measured in screen space under non-scaling-stroke, so `getTotalLength()`-based dash
   animation breaks. Use `pathLength={1}` with `stroke-dasharray: 1 1` and no
   non-scaling-stroke.
6. **Next's dev indicator** sits bottom-left. Keep fixed UI away from that corner (the
   play pill moved to the top left).
7. **The site chrome** (`SiteChrome`: star field, nav, blur ramps, skip link;
   `SiteFooter`) renders on every route from the root layout. The play branch opts out
   by pathname. The new home page will need its own decision: reuse, replace, or opt out.
8. **Constellations prototype details** worth reusing or knowing: log-space zoom
   interpolation between keyframes; a smoothing factor of 0.12; figure scale 230 world
   units; a world of 2700×1800; the desktop anchor at 66% of the width, the mobile anchor at
   34% of the height; lines drawn edge by edge with `reveal * edges.length - edgeIndex`; a
   halo sprite on meaningful stars so they read before they join.
9. **The play content file is outdated.** `src/app/play/content.ts` holds placeholders
   written before the resume was shared (e.g. invented years and "Scoping from zero"
   skills). Don't reuse its text; use Appendix A.
10. **Windows environment:** the shell is PowerShell by default, with Git Bash available.
    Paths contain spaces (`Projects_Ad Astra`), so quote them.

---

## 20. Open questions for Meet

Ask these early, ideally in one message, and don't block Phase 1 on them (use TODOs).

1. **Priorities:** confirm or assign priority 1/2/3 for every item (proposed defaults in
   §8).
2. **The stop lineup and grouping** in §8. Is a combined **"Now"** first stop (Bosch + CMU +
   Linea) OK?
3. **Serin and Helion:** is Helion (and `Serin_Helion_Browser`, `serin-education-frontend`)
   part of Serin? Does Serin have a public site or anything that can be linked?
4. **Astar:** what exactly did he turn down (a return offer, a full-time role)? The comet
   depends on it.
5. **Missing impact numbers:** Phoenix accuracy and metrics; Linea downloads and users;
   Icarus results (flight time, stability); anything measurable from Serin (candidates,
   companies, interviews); Talaria users, if any.
6. **Research as its own nav category**, or folded into Projects?
7. **Filter:** fade non-matching objects to ghosts (proposed) or fully hide them?
8. **Case detail:** panel in the sky, full `/work/[slug]` page, or both (proposed: both)?
9. **Which sites to link:** the `meetbhatt.com` subdomains are clear. What about the
   `*.vercel.app` projects and GitHub repos?
10. **LinkedIn URL:** `meet-bhatt2304` (resume) vs `meet-bhatt-655a89250` (site). Which
    is current?
11. **Visual references:** 3–5 sites or images he finds magical.
12. **The one-line identity** under the hero line, and the ending copy (§9). Approve or
    rewrite.
13. **Which archive projects** should appear at all (Converge, Loom, Aether, Nemesis,
    Monarch, Vita, Codex, Ditherly…)?
14. **Resume link:** is there a hosted PDF to link? (`/resume` currently redirects.)

---

## Appendix A: content data (draft)

A suggested shape for `src/content/cosmos.ts`. Values are drawn from the resume and GitHub.
`priority` values are PROPOSED; `TODO(meet)` marks missing facts. Copy should be tightened
with Meet. Keep his voice: plain, first person, concrete, no hype.

```ts
export type Category =
  "experience" | "project" | "research" | "leadership" | "decision";

export type Item = {
  slug: string;
  name: string;
  category: Category;
  /** ISO month strings. `end: null` means ongoing. */
  start: string;
  end: string | null;
  priority: 1 | 2 | 3;
  /** Which object type and idea renders it (see §12). */
  body:
    | "forming-disk"
    | "ring-nebula"
    | "planetary-nebula"
    | "magnetosphere"
    | "pulsar"
    | "star-system"
    | "binary"
    | "grazer"
    | "seasonal-system"
    | "comet"
    | "maze-constellation"
    | "charter-constellation"
    | "faint";
  /** Group id for the journey stop. */
  stop: string;
  parent?: string; // e.g. serin → blink
  role?: string;
  goal: string;
  owned: string[];
  impact: string[]; // real numbers only
  links: { site?: string; source?: string; paper?: string };
};
```

| slug             | name                                        | category                   | start → end                    | priority* | body                  | stop          | role                                                                | links                                                                   |
| ---------------- | ------------------------------------------- | -------------------------- | ------------------------------ | --------- | --------------------- | ------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `bosch`          | Corporate Startup Lab, Bosch Mobility       | experience                 | 2026-08 → 2026-12              | 2         | forming-disk          | now           | Team member (6-person team)                                         | TODO(meet)                                                              |
| `linea`          | Linea                                       | project                    | 2026-04 → ongoing              | 1         | ring-nebula           | now           | Builder                                                             | site linea.meetbhatt.com · source github.com/Meet2304/Project-Linea     |
| `phoenix`        | Project Phoenix                             | research                   | 2025-07 → 2026-05              | 1         | planetary-nebula      | research-2025 | Researcher                                                          | site phoenix.meetbhatt.com · source github.com/Meet2304/Project-Phoenix |
| `vigil`          | Malicious Prompt Classifier (Project Vigil) | research                   | 2025-07 → 2025-10              | 2         | magnetosphere         | research-2025 | Researcher                                                          | source github.com/Meet2304/Project-Vigil · paper: submitted             |
| `talaria`        | Project Talaria                             | project                    | 2025-07 → 2025-11              | 1         | pulsar                | talaria       | Builder                                                             | site talaria.meetbhatt.com · source github.com/Meet2304/Project-Talaria |
| `blink`          | Blink Analytics                             | experience                 | 2024-08 → 2026-06              | 2         | star-system           | blink         | RLHF Contributor → RLHF Team Lead → Lead Product Development Intern | TODO(meet)                                                              |
| `serin`          | Serin                                       | experience (parent: blink) | 2024-08? → 2026-06? TODO(meet) | 1         | binary                | blink         | Led development                                                     | TODO(meet)                                                              |
| `icarus`         | Project Icarus                              | project                    | 2024-07 → 2026-06              | 2         | grazer                | icarus        | Builder                                                             | source github.com/Meet2304/Project-Icarus                               |
| `astar`          | Astar Technologies                          | experience                 | 2023-12 → 2024-01              | 2         | seasonal-system       | astar         | Lead Business and Data Analysis Intern                              | —                                                                       |
| `astar-decision` | Turning down Astar                          | decision                   | TODO(meet)                     | 2         | comet                 | astar         | —                                                                   | —                                                                       |
| `mind-ripple`    | Mind Ripple, the quizzing club of PDEU      | leadership                 | 2022-11 → 2026-04              | 2         | maze-constellation    | mind-ripple   | Subcommittee Member → Head of Graphic Design → President → Advisor  | —                                                                       |
| `interact`       | Interact Club of Baroda Sayajinagari        | leadership                 | 2021-07 → 2022-06              | 2         | charter-constellation | interact      | Charter President (founder)                                         | —                                                                       |

\* PROPOSED; Meet to confirm.

**Goal / owned / impact drafts** (tighten with Meet):

- **Bosch**: Goal: help Bosch Mobility find new segments for its low-voltage actuator
  lineup. Owned: market research, customer discovery, strategic-fit analysis in a
  6-person team. Impact: in progress, TODO(meet).
- **Linea**: Goal: lyrics that follow your music without interrupting whatever else
  you're doing. Owned: the whole app: Electron overlay (transparent, always on top,
  click-through), following Windows media sessions without a Spotify login, lyric
  retrieval with a fallback source and offline cache, per-track cymatic artwork,
  auto-updates. Impact: free and open source, v0.2.0 released; TODO(meet): downloads.
- **Phoenix**: see the §13 worked example.
- **Vigil**: Goal: catch malicious LLM prompts before they reach the model, and explain
  why they were flagged. Owned: a Markov-chain transition detector, an explanation module
  highlighting high-risk patterns, and Leave-One-Out Deletion to remove the harmful
  fragment while keeping the user's intent. Impact: 90.79% accuracy, 98.84% precision,
  82.54% recall, F1 89.96%; paper submitted to a conference.
- **Talaria**: Goal: turn every step into health insight: heart rate, blood oxygen and
  gait from a shoe. Owned: the ESP32 wearable (MPU6050, MAX30102), the streaming cloud
  pipeline, and an RNN forecasting 15 features 50 steps ahead. Impact: R² = 0.97, MAE
  0.103, trained on 50,000+ sequences.
- **Blink Analytics**: Goal (the company's work he joined): human-feedback training for
  AI models. Owned: grew from annotating data and evaluating models to leading RLHF
  teams and product development; directed a summer intern team on fine-tuning and
  performance tracking. Impact: **222% increase in project revenue in two months.**
- **Serin**: Goal: AI-powered interviewing and hiring. Owned: **led development**;
  designed the real-time communication, language-model and cloud infrastructure, and the
  candidate evaluation framework. Impact: TODO(meet). (Stack hints from the resume:
  LiveKit, GCP, Kubernetes, Supabase/Firebase.)
- **Icarus**: Goal: a drone that flies stably on a controller he built himself. Owned:
  a custom Teensy 4.0 flight controller, a custom PCB, sensor integration (motion,
  pressure), and a flight-control system in C that fuses sensor readings to stabilize
  orientation. Impact: stable flight achieved; TODO(meet): numbers.
- **Astar**: Goal: know which sweets sell where and when, to guide production and
  marketing. Owned: cleaned and standardized raw sales data; modelled regional and
  seasonal demand with time-series forecasting, Random Forest and XGBoost. Impact:
  identified top sellers by region and season; TODO(meet).
  **Decision:** turned down Astar, a ready-made path, for one he'd have to build
  (TODO(meet): specifics).
- **Mind Ripple**: Goal: grow the university's quizzing club and its events. Owned: rose
  from subcommittee member to head of graphic design to president to advisor; led a
  30-member team; grew Matrix Breakout, the escape room. Impact: **300+ participants;
  earnings up 10% year over year.**
- **Interact Club**: Goal: give teenagers a way to serve. Owned: **founded** the club as
  charter president; led 32 members under 19 in service projects with nonprofits.
  Impact: service projects with nonprofits including the Pratibha Foundation.

**Hero and site-wide copy (PROPOSED):**

- Name: Meet Bhatt · Hero line: "What's missing, I make." (DECIDED, from the concept doc)
- Identity line: "AI engineer and product builder. MS in AI Engineering at Carnegie
  Mellon." (TODO(meet): approve)
- Ending: see §9. The Note stays at `/story`.

---

## Appendix B: the rest of Meet's GitHub

From `gh repo list Meet2304` (38 repos, none forked). Candidates for the archive (p3):

| Repo                                | What it is                                                                                                                                                                                               | Link                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `converge`                          | Hackathon team formation: join with a light profile, match before the event, find each other on a live map on the day. Next.js, Auth0 next.                                                              | converge.meetbhatt.com           |
| `Loom`                              | Turns scattered visa-interview experiences (e.g. WhatsApp groups) into structured, embassy-specific insight. Landing page stage.                                                                         | loooom.vercel.app                |
| `Project-Aether`                    | Computer vision for fair skateboarding judging; trick-recorder PWA + YOLO11 pose skeleton processing.                                                                                                    | project-aether-blue.vercel.app   |
| `Project-Helion`                    | Recruitment management system on OpenEdX + Safe Exam Browser (likely Serin-related).                                                                                                                     | project-helion.vercel.app        |
| `Serin_Helion_Browser`              | Safe exam browser for Windows (C#).                                                                                                                                                                      | —                                |
| `serin-education-frontend`          | (no description)                                                                                                                                                                                         | —                                |
| `Project-Nemesis`                   | Making Gujarat's court processes streamlined and transparent; team project.                                                                                                                              | project-nemesis-kohl.vercel.app  |
| `Project-Monarch`                   | Product financial forecasting: projects, scenarios, components (incl. per-token API costs).                                                                                                              | project-monarch-rouge.vercel.app |
| `project-vita`                      | Household blood glucose and blood pressure monitoring; caregivers + PIN-based members; PWA push.                                                                                                         | —                                |
| `Project-Codex`                     | An earlier personal site: "my living manuscript… not a portfolio, but a story in progress".                                                                                                              | project-codexx.vercel.app        |
| `Ditherly`                          | A playground for learning ASCII and dither filters.                                                                                                                                                      | —                                |
| `Project-Hyperion`                  | Algorithms, data structures, competitive programming.                                                                                                                                                    | —                                |
| `i-have-skills`                     | A collection of AI-agent skills for coding tools.                                                                                                                                                        | —                                |
| `GandhiFoundation`, `Flora-Website` | Websites (no descriptions).                                                                                                                                                                              | —                                |
| Coursework and notes                | Computer-Vision, Machine-Learning, Pattern-Recognition, IoT-Programs, ML/DL notes, language exercise repos, Predictive-Maintenance_Testing, RocketLifespan, agriculture and penguin clustering projects. | —                                |

---

## Appendix C: decision log

| #   | Decision                                                                                                                                             | Status                                                 | Source                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| 1   | Replace the current landing page, which is one line and not representative                                                                           | DECIDED                                                | Meet                                     |
| 2   | Keep the Story / Note page (`/story`) as it is                                                                                                       | DECIDED                                                | Meet ("pretty happy with the story")     |
| 3   | Theme: space, with a storyline felt in every component                                                                                               | DECIDED                                                | Meet                                     |
| 4   | Of five concepts, build on **Constellations**                                                                                                        | DECIDED                                                | Meet                                     |
| 5   | Broaden from constellations to many kinds of celestial object (nebulae, etc.), each expressing what its project aimed to do, simply and artistically | DECIDED                                                | Meet                                     |
| 6   | Link every item to its own website where one exists; explain goal and vision, contribution, impact                                                   | DECIDED                                                | Meet                                     |
| 7   | Tell projects, experience and leadership apart visually                                                                                              | DECIDED (requested) → object types per category in §11 | Meet asked; proposal accepted implicitly |
| 8   | A more magical, eye-catching style                                                                                                                   | DECIDED                                                | Meet                                     |
| 9   | Flow: **dot → zoom out to the map + impact → journey newest→oldest** (the consolidation moved to second, not last)                                   | DECIDED                                                | Meet                                     |
| 10  | A central top nav acting as a **category filter** (highlight the category, hide the others); scrolling without the nav = the full journey            | DECIDED                                                | Meet                                     |
| 11  | **Recreate the Voyager photo procedurally**, not the real JPEG, so the transition is seamless                                                        | DECIDED                                                | Meet                                     |
| 12  | **Stops are groups of objects**, with emphasis by priority, which Meet will assign                                                                   | DECIDED                                                | Meet                                     |
| 13  | Distance from the dot = time; year rings                                                                                                             | PROPOSED (well received)                               | Agent                                    |
| 14  | A combined "Now" first stop; Serin is the brightest object on the map                                                                                | PROPOSED                                               | Agent                                    |
| 15  | Research as its own category                                                                                                                         | PROPOSED / OPEN                                        | Agent                                    |
| 16  | Filtered-out objects fade to ghosts vs hidden                                                                                                        | PROPOSED / OPEN                                        | Agent vs Meet's "hide"                   |
| 17  | The filter shapes the journey (focused tours); URL state; list view                                                                                  | PROPOSED                                               | Agent                                    |
| 18  | Panel + `/work/[slug]` page per item                                                                                                                 | PROPOSED / OPEN                                        | Agent                                    |
| 19  | WebGL stack (R3F, postprocessing, lygia, leva, GSAP, Lenis) + the lab workflow                                                                       | PROPOSED                                               | Agent                                    |
| 20  | Playwright MCP + Chrome DevTools MCP + debug hooks + a project visual-system skill                                                                   | PROPOSED; Meet asked what tools are needed             | Agent                                    |
| 21  | Build order: the opening first, then nav, the lab and objects, the journey, polish                                                                   | PROPOSED                                               | Agent                                    |
| 22  | The handoff: Meet does **not** want the current agent to implement. A new agent takes over with this document                                        | DECIDED                                                | Meet                                     |
