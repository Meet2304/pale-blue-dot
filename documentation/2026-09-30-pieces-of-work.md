# The work, one piece at a time

- **Date:** 30 September 2026
- **Branch:** `claude/eager-ramanujan-blh51w`
- **Why:** Meet liked what the "Now" chapter held (Carnegie Mellon, the Corporate
  Startup Lab at Bosch Mobility and Linea) but not how. The bodies should look like
  the bar's panels draw them, and no two of a kind alike: planets varying in colour,
  type and size, and so on. The information wasn't comfortable to read. Each piece
  should have a picture of what Meet did (Linea's a preview of the actual website,
  if it could be done without weighing the page down), and all of it simple,
  easy to follow and beautiful to look at.

## One screen per piece of work

A year's chapter used to show all its pieces at once: the bodies on the canvas,
and a list of rows in a narrow column with the kind, the line, the result and the
link in small type. There was no room for a picture, and on a phone none for more
than a name and a result.

Now each piece of work has its own screen, newest first, 12 in all. The copy reads
top to bottom in the order a reader asks:

1. **Which year**, and where in it: "Now, 2026 to 2027 | 3 of 3".
2. **What it is**: the name, large.
3. **What kind of thing, and when**: "+ Projects, 2026", in the piece's colour.
4. **What it was for**: the brief (the sentence the bar's panels use), in body
   type.
5. **Why it is drawn as it is**, under a hairline: "Drawn as a black hole. School:
   the deepest gravity, which bent every path after it." (the kind's line from the
   bar's panels). It is the bridge between the sky and the work.
6. **A link** to the thing itself, where there is one.

Its body is on the canvas to the right, framed like a find on a star chart: corner
ticks round its reach, and its name ("o black hole") at the top-left tick. Where
there is a picture of the work it sits under the body.

The camera flies from piece to piece. Within a year it
pans; from one year to the next it rises a little mid-way and comes back down, so
the move reads as a hop, not a slide. The neighbours from the same year show only as
soft glows in their colours at the edges of the screen, and sharpen into their
characters as the camera arrives.

The chapter index down the right names each year once, at its first piece, and
always names the one on screen. The arrow keys step one piece at a time. Clicking a
body goes to its screen.

## Bodies, drawn as the bar draws them, each with a look of its own

The year chapters used the map's renderers (`bodies.ts`), tuned to read at a
distance. They now use the bar's portraits (`portraits.ts`), in the same fine
characters, and each piece has a look (`looks.ts`) that makes it unlike the others
of its kind:

| Kind                     | Piece             | Look                                                                   |
| ------------------------ | ----------------- | ---------------------------------------------------------------------- |
| Education, black holes   | Carnegie Mellon   | Gold disk, nearly edge on, turning toward us on the left               |
|                          | PDEU              | Smaller, cool blue-white disk, seen more openly, turning the other way |
| Experience, stars        | Bosch Mobility    | A yellow star                                                          |
|                          | Blink Analytics   | A larger, hot blue-white star                                          |
|                          | Astar             | A small orange-red star                                                |
| Projects, planets        | Linea             | A lilac ice giant: smooth, faint bands, polar haze, rings, a moon      |
|                          | Talaria           | A small rocky world: rough ground, craters, two moons, no rings        |
|                          | Icarus            | An amber banded giant with a storm, no rings                           |
| Research, constellations | Phoenix           | A bird rising with its wings spread                                    |
|                          | Prompt classifier | A shield, like Scutum                                                  |
| Leadership, nebulae      | Mind Ripple       | Magenta                                                                |
|                          | Interact Club     | Teal, and mirrored, so the two don't share a shape                     |

Each look sets the body's palette (in OKLCH, like the kinds) and its warm tier (its
glow, a black hole's disk), and its size against the others. Carnegie Mellon's black
hole also has twin jets from its poles, with knots of light running outward along
them, and a faint glow down their length. The copy's accents on
the piece's screen are drawn from the same palette, so the words and the body match.
Without a look, each portrait draws exactly the body the bar's panels show.

## Pictures of the work

`Unit.media` in `src/content/work.ts` is either a photo or a website. Images are
imported, so Next.js knows their size and serves each at the size it is shown.

**Photos** are shown whole, in their own shape: Carnegie Mellon's campus at sunset
(2:1) and the Corporate Startup Lab's logo (4:3), both from `public/assets/`, where
Meet put them. A logo (`logo: true`) is shown smaller than a photo: it names the
place rather than showing it. To add a picture to another piece, import it in
`work.ts` and give the piece `media: { kind: "photo", src, alt, caption? }`.

**Websites** (Linea and Phoenix) are shown in a browser frame with the address in
its bar, turning through five of the site's screens as if someone were scrolling
it: five screenshots at 1280 × 800, loaded lazily as the chapter comes near. The
screens turn every 3.4 s while the frame is on screen, and not under reduced motion.
A caption says what each screen shows.

**Try it live.** Clicking the screen loads the real site into the frame, laid out as
on a laptop (1280 × 800) and scaled to fit, to scroll and click through; "Close"
puts the screenshots back. Nothing of the live site loads until then. On a phone the
frame is too small for that, so the same click opens the site in a new tab. The
address in the frame's bar always opens it in a new tab. Both sites allow being
framed (no `X-Frame-Options` or `frame-ancestors`); if that changes, the address
still works.

The first version paused the screens while the pointer rested on the frame, and the
whole frame was one link to the site. Meet found the preview "not working": it
looked frozen under the pointer, and nothing about it was live. Now the screens keep
turning, and the frame is what its label says, a live preview on request.

## Keeping it smooth

The portraits are thousands of characters each, so the bodies are drawn offscreen
and redrawn when something moves (the camera, the scroll, the filter, the pointer
over a body) or every 80 ms; the frames between copy them. While the camera moves
they are drawn in coarser characters and sharpen as it settles, like a lens coming
into focus. Characters are sized in proportion to the body, as the bar's panels draw
it, so a large body looks the same and costs no more. Measured in Chrome at 1440 ×
900: 7 ms a frame on every piece at rest, and a median of 14 ms (90th percentile
21 ms) scrolling from piece to piece.

## Revised the same day

Meet added photos for Carnegie Mellon and the Corporate Startup Lab, and asked for:

- **A grander black hole**, with more character, and something to relate it to:
  the campus photo under it, twin jets, and the sky lensed round it (below).
- **No "My part" and "Result"** on each piece: one picture each, with the body still
  plainly there and marked as the piece's. The two lines are gone; the line on why
  the body is the body it is, and the reticle with its name, took their place. The
  index at the bottom still lists each result.
- **Every screen size**, from a small phone to a wide desktop (below).
- **A working live preview** of Linea, and the same for Phoenix (above).
- **Less bare black** behind the work: a sky of its own (below).

### A sky behind the work (`backdrop.ts`)

- Stars in three depths that drift a little against each other as the camera moves,
  each twinkling on its own clock. Round a black hole they are lensed: each is seen
  pushed outward (a point lens puts it at (d + √(d² + 4θ²)) / 2), and drawn out into a
  short arc the closer it lies to the ring, so the gravity shows in the sky itself.
- A soft haze of the body's own colours round it, breathing slowly.
- Faint nebulosity in characters, in the body's colours, drifting with the camera.
- Now and then (every 7 to 16 s) a shooting star across the upper sky.

It is quiet on purpose: it sits under the copy and the body. Under reduced motion it
holds still and no star shoots. Earth, whose orbits could reach in from the edge at
the new zooms, now fades out on the work's screens.

### Any screen

The body is no longer placed at fixed fractions of the screen. The page lays out the
copy and picture with CSS, and the canvas measures them (`pieceFrame` in
`universe-canvas.tsx`) and fits the body, by how far it visibly reaches
(`reachOf` in `looks.ts`), into the space left: right of the copy and above the
picture on a wide screen, above the copy on a phone. It measures again whenever the
copy or picture change size (fonts arriving, a resize, a phone turning).

Layouts, by the screen's size and shape:

- **Wide** (wider than 860 px, or any landscape screen taller than 520 px): copy on
  the left, body right, picture under the body.
- **Upright and small** (up to 860 px wide and no wider than 4:3, so phones and
  tablets held upright): body at the top, copy and picture stacked below. On a short
  phone the picture shrinks further; on a phone the body line keeps its name and
  drops the reason.
- **A phone on its side** (landscape, 520 px tall or less): too short to stack, so
  the copy stays left, compact, with the picture beside it and the body to the right
  of both. The hero and the sky follow the same test.

The index table drops its dates on a phone, which had made the page 31 px wider
than a 360 px screen. A frame's address shortens with an ellipsis rather than
wrapping, and its dots go when it is small.

## Also

- The canvas labels and leader lines for each year's bodies are gone: the copy
  beside the body says what it is.
- The index's line, "The same map, as a list.", now says "Every piece of work above,
  as a list."

## The picture leads (revised again)

With the picture under the body, at much the same weight, neither led. Meet wanted
the eye on the picture and the words, and the body there as a design choice, not a
second thing asking to be looked at.

Now, on a wide screen, a piece with a picture is a spread: the copy on the left and
the picture on the right, large (up to 44vw, never over the copy) and centred on the
copy's height, lifted by a soft shadow. The body rises behind the picture's top-right
corner, partly hidden by it, like a light behind a print, at 60% of its strength and
without its chart marks. Each kind sits differently (`BEHIND` in
`universe-canvas.tsx`): a black hole is large and low, so its shadow sits on the
picture's edge with the jet rising above it and the disk running behind the frame; a
planet or a star is smaller and rides higher, so its disc clears the frame. It always
stays clear of the bar. On a phone, and a phone on its side, the body keeps its place
but is drawn smaller and quieter. A piece without a picture keeps its body as the
picture, as before.

Telling the layouts apart is done by the picture's own layout (in the page's flow, or
placed apart), not by distances, which at 1280 px wide mistook the spread for the
phone-on-its-side layout.

## Verification

`npm run ci` passes. Checked in Chrome at 360 × 640, 390 × 844, 430 × 932, 667 × 375,
768 × 1024, 820 × 1180, 844 × 390, 1024 × 768, 1280 × 720, 1536 × 730, 1440 × 900 and
1920 × 1080: the hero, the sky, every piece's screen, the index and the void, with
no console errors and nothing wider than the screen. Also: Linea's and Phoenix's
previews turning, "Try it live" loading Linea in the frame, the address opening a
new tab, a hop from one year to the next, a body under the pointer (reticle and
scanner), and reduced motion.
