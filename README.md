# pale-blue-dot

A personal portfolio and digital space built around curiosity, creation, and the
journey from a single point of light to something larger.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**, bridged to the design system's tokens
- **shadcn/ui** primitives, remapped onto those tokens
- **Prettier** (with `prettier-plugin-tailwindcss`) for formatting

## Scripts

| Command                | What it does                        |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Dev server on http://localhost:3000 |
| `npm run build`        | Production build                    |
| `npm run lint`         | ESLint                              |
| `npm run typecheck`    | `tsc --noEmit`                      |
| `npm run format`       | Prettier, write                     |
| `npm run format:check` | Prettier, check only                |
| `npm run ci`           | Format, lint, typecheck, then build |

## CI

Pull requests and pushes to `main` run format, lint, typecheck, and a
production build via GitHub Actions (`.github/workflows/ci.yml`). The same
sequence is `npm run ci` locally. Dated notes live in
[`documentation/`](./documentation/README.md).

## Design system

Built on **Horizon** (claude.ai design project `93bdc0a9`) — dark, minimal,
majestic. Tokens are ported into `src/styles/horizon/` and imported by
`src/app/globals.css`:

- **Colour** — night black plus one accent, ultramarine `#0d7bff`. Exactly four
  text levels. The only gradient in the system is the horizon itself.
- **Type** — Marcellus (display), Hanken Grotesk (text), Space Mono (mono),
  self-hosted through `next/font` rather than the CDN `@import`.
- **Space** — 4px scale, 144px section rhythm, 1120px container.
- **Motion** — 80 / 140 / 220 / 420ms plus 1100ms cinematic. Nothing loops on
  its own except the scene.
- **Texture** — one noise: fractal turbulence at 11% in `soft-light`. Bloom
  belongs to the horizon alone, never to a control.

Tailwind utilities are bridged to these tokens (`text-strong`, `bg-night-900`,
`font-display`, …), and shadcn's primitives are remapped onto them so anything
dropped in later inherits the system instead of neutral greys.

## The loader, the hero and the warp

```
src/
  styles/horizon/          Ported design tokens
  components/horizon/
    night-horizon.tsx      The scene: sky, stars, reflection, loader line, warp
  components/site/
    hero-warp.tsx          Sticky stage + scroll runway; drives reveal and warp
    arrival.tsx            Where the flight lands
```

**The loader is the horizon.** A 1px ultramarine hairline draws outward from the
centre of the screen — that width is the progress bar. When it completes it
descends to 62% and the sky, stars and water resolve around it. The line is
never removed and never replaced; it just stops being a loader, so there is no
handoff where a seam could appear.

**The warp is scrubbed, not triggered.** Scroll position drives it directly, so
the user flies the ship rather than watching a cutscene. Past a short dead zone
the stars stretch into radial streaks away from one chosen star — picked at
resize for being bright, high in the sky and near centre — the horizon slides
out of frame as the camera pitches up, and the target star grows until its light
takes the screen. It hands over to black on the last 7% so the section below
arrives out of the dark rather than out of a white flash.

**Zero renders.** `reveal` and `warp` live in a ref the canvas loop reads each
frame. A full load and a complete scroll-through cost no React re-renders.

**Interruptible and accessible.** Any wheel, tap, click or key during the load
snaps to the formed hero. `prefers-reduced-motion` opens on the finished scene,
stills the twinkle and the ripple, and zeroes every entrance.

Navigation, contact and project content remain out of scope — the arrival
section is deliberately a landing, not a page.
