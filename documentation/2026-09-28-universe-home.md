# The universe replaces the coming-soon page

- **Date:** 28 September 2026
- **Branch:** `claude/eager-ramanujan-blh51w`
- **Why:** First draft of the redesign. The landing page now says who Meet is: the
  "Universe" concept from the `play` branch, built for real. The spec is
  `plans/celestial-portfolio-handoff.md` on `play`; the demo at `/play/universe` is the
  reference implementation.

## What moved where

- `src/components/universe/`: the renderer (`bodies.ts`, `render.ts`, `galaxy.ts`,
  `noise.ts`, `helpers.ts`), the encoding (`encoding.ts`: kinds, colours, layout), the
  scroll-driven page (`universe.tsx`, `universe-canvas.tsx`, `universe.module.css`) and
  `body-portrait.tsx` for the unit pages. The helpers that lived in `/play/systems/*`
  now sit in `helpers.ts` and `noise.ts`.
- `src/content/work.ts`: every unit, grouped by chapter. The home page, its index table
  and `/work/[slug]` all read from it.
- IBM Plex is declared once, in `src/app/fonts.ts`, and applied only on Terminal pages.

## Meet's answers (spec §15), 28 September 2026

1. **Key:** nebula = leadership, star = experience. Research becomes a constellation.
   Planet = projects and black hole = education stand. Marks stay with the kind of work
   (`×` research, `~` leadership).
2. **Impact scores:** placeholders kept until the design is settled; then decide per
   unit what to show.
3. **Archive projects:** none. Converge is removed too.
4. **Serin and Helion:** don't mention Helion.
5. **Astar:** nothing was turned down. The result now reads from the resume: top sellers
   by region and season, to guide production and marketing.
6. **Missing numbers:** later, with the per-unit deep dive.
7. **LinkedIn:** `linkedin.com/in/meet-bhatt2304`, site-wide (`src/lib/socials.ts` too).
8. **Copy:** kept, except the 2022–23 note, which no longer mentions a turned-down path.
9. **Per-unit pages:** yes. For now each is a placeholder at `/work/[slug]`: the body
   large, the facts, "The full story is coming soon." Not indexed yet.
10. **Resume:** linked from the closing chapter to the Google Drive folder.
11. Canvas 2D, not WebGL: yes. 12. Galaxy backdrop with Earth in an arm: yes.
12. Arrow keys step chapters: yes. 14. Old routes keep redirecting to `/`: yes.

## Changes from the demo

- The Horizon chrome (star field, nav, edge blurs, dot-field footer) stands down on `/`
  and `/work/*` (`isTerminalRoute` in `src/lib/routes.ts`). Only the skip link stays.
  The chrome and footer return early from a wrapper, so they mount fresh when a visitor
  goes on to `/story`, and the footer's measuring effects run against real nodes.
- Unit names (in the rows and the index) link to their `/work/[slug]` page.
- Arrow Up/Down step one chapter while the universe is on screen; a second press during
  the smooth scroll steps on from the target. Jumps are instant under reduced motion.
- Canvas labels choose among four placements, avoid each other, the text column and the
  chapter ticks, and slide back on screen rather than clip.
- Phone framing pass (the spec's open item): the map and each year are framed in the
  top half, bodies resolve sooner at phone zoom, labels are one line, and rows show
  name and result (the full line and outside link are on the unit's page).

## Still open

- Impact scores, and what impact means.
- The per-unit case format, and the missing numbers.
- A quality tier for low-power devices, and tests for the pure functions.

## Verification

`npm run ci` passes. Checked in Chromium at 1440×900 and 390×844: the full scroll both
ways, the filter, arrow keys, every `/work/[slug]` (an unknown slug is a 404), `/work`
still redirecting to `/`, client navigation from `/` to `/story` bringing the Horizon
chrome back, and a still frame under reduced motion.
