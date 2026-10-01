# A longer story, a phone menu, a lens, and the share card

- **Date:** 1 October 2026
- **Branch:** `claude/eager-ramanujan-blh51w`
- **Why:** Meet asked, over one session, for: a clearer storyline (who he is, then
  the pale blue dot, then his impact); words that never sit in a box over the sky;
  a side menu on phones that shows the bodies; previews of Talaria, Blink Analytics
  and Astar's sites and a link to his published paper; a smooth black hole, locked to
  the scroll, that distorts rather than swallows; a share card for every platform;
  and, having tried them, no scroll stops: the visitor scrolls freely, and the words
  are there wherever they stop.

## The story

| Chapter       | Says                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Earth         | "Hola! I'm Meet." / **"I am an Engineer."** / "I build AI products. MS in AI Engineering at Carnegie Mellon."                                                                                                                   |
| The dot (new) | **"This pale blue dot is where I build things."** "Earth, from far enough away to see it whole: one point of light." Framed 2.6 times closer than the sky, so the nebula is a soft glow around the dot, not yet the whole view. |
| Impact        | **"This is my impact so far."** "Every light out here is something I've built, researched or led." The whole deep sky.                                                                                                          |
| The work      | One piece at a time, as before.                                                                                                                                                                                                 |
| Next          | The void, as before.                                                                                                                                                                                                            |

The opening now says "I am an Engineer." where it said "This pale blue dot is where
I build things."; that line moved to the new chapter, spoken in as it arrives. The
chapter ticks read Earth, Dot, Impact, the years, Next. Chapter numbers the canvas,
page and menus share are in `chapters.ts`.

## Words over the sky

The chapters' copy had a hard black panel on phones (a gradient box behind the copy,
a black block behind the picture), which showed as a square edge whenever a body or
the sky passed behind it. Now every chapter's words sit on a shade with no edges:
darkest at the heart of the copy and fading to nothing well inside its bounds, plus
a soft shadow under the letters. The hero's words keep none, since the opening's
line lands on them. The picture's heavy shadow is lighter too.

## No stops

A version that brought the page to rest on each chapter was tried and removed: it got
in the way of exploring. The page scrolls freely. Instead, a chapter's words show
whenever more than a sliver (12%) of it is on screen, and stay as it scrolls away,
so between any two chapters both are showing; the spoken titles start as soon as
half of them is on screen. Checked by scrolling the whole page in eighths of a
chapter: readable words at every position. The arrow keys and the menus still glide
to a chapter; any wheel or touch takes over from a glide.

## The phone menu (`drawer.tsx`)

On a phone the bar keeps only the mark and a menu button. The menu is a drawer from
the right: the work by kind, each kind with its body drawn live beside it (the key to
the sky, in the menu), each opening to its pieces, a tap flying the page to that
piece; then story, say hello and the resume, and GitHub and LinkedIn at the foot. It
closes with its button, a tap outside, or Escape, and hands focus back to the menu
button. It is put into the page the first time the menu is reached for, so the page
as served is the same on every screen.

## Passing a black hole: a lens, locked to the scroll

The copy no longer falls in. It scrolls by with the page as it always does, and as it
passes, each line and the picture are drawn as a lens would show them: pushed a
little out from the hole, stretched along the circle round it and pressed thin
across it, and turned to follow that circle. The effect grows as the visitor scrolls
away from the piece, peaks half-way to the next, and is gone when either is fully on
screen, so the words are straight at every resting point. It works both ways.

Two things made the first version jittery:

- The canvas eased its own copy of the scroll while the page's words moved with the
  real one, so the hole and the words drifted apart and caught up. The camera now
  follows the page's scroll exactly; the browser already animates a wheel's notches.
- Every frame recomputed where each line had flown to from that eased position. Now
  each line stays where the page puts it, with only a small transform added; it never
  strays more than 8 px from its own place.

Measured on a production build in Chrome at 1440 × 900: a median of 14 ms a frame
scrolling past Carnegie Mellon, no long tasks. The 50 to 80 ms hitches seen in
development were React's development-mode overhead.

### Revised: only the light bends

Meet still found the pass unsettling: he wanted light to bend round the hole and
nothing to change position. So nothing does. The copy and the picture scroll by
untouched, the camera no longer swings in or closes on the hole, the hole no longer
grows, and the starlight is no longer dragged in. What remains is the lens: a dense
field of faint, far stars, drawn only near a black hole, each seen pushed outward
and drawn out into an arc along the circle round the hole, the arcs gathering at
the Einstein ring (`drawLensed` in `backdrop.ts`). The stars sit deep in the sky, so
as the visitor scrolls they slide past the hole and the arcs grow, swing round and
shrink. The camera follows the page's scroll exactly.

## Lighter

Measured what a first visit to `/` downloads (production build, Chrome): 491 KB,
of which 173 KB was eight font files and 246 KB JavaScript. Changes:

- **Fonts.** The home page preloaded the Horizon pages' four faces (Marcellus,
  Hanken Grotesk, Archivo, Anton) and the story page's signature face, none of which
  it uses, and two IBM Plex weights it never sets (Sans 500, Mono 300). The Horizon
  faces and the signature are no longer preloaded, so a browser fetches them only on
  a page that uses them; the unused Plex weights are gone. The home page now
  preloads two fonts, Plex Sans 200 (the hero) and Plex Mono 400.
- **A heading bug found on the way.** The home page's headings were meant to be
  Plex, but a Horizon rule of equal weight set them in Marcellus, and in a
  production build it won, so the live hero would have been in a serif (and fetched
  it). A stronger rule now holds the face. The skip link, outside the page's root,
  also fetched Hanken Grotesk; it uses the system face on the home page.
- **Code.** The Horizon pages' chrome (sky, bar, edge blurs) and footer were bundled
  into every page and only returned nothing on the home page. They are now separate
  chunks loaded only on a Horizon page (`horizon-chrome.tsx`, `footer-body.tsx`). The
  zoom view's code (`lightbox.tsx`) loads on the first click.
- Unchanged and already light: pictures are served by `next/image` at the size
  shown and loaded as their chapter comes near; site previews are screenshots, and
  a live site loads only on request; the deep sky is measured a few rows a frame;
  the phone menu's bodies are drawn only while it is open.

After: about 439 KB on the first visit with five font files (117 KB), before the
heading and skip-link fix removed two more of them.

## New previews and a paper

- **Talaria** (talaria.meetbhatt.com): five screens. The site refuses to be shown
  inside another page (`X-Frame-Options: DENY`), so its button reads "Open it live ↗"
  and opens it in a new tab (`embed: false` in `work.ts`).
- **Blink Analytics** (blinkanalytics.in): five screens, live preview in the frame.
- **Astar Technologies** (astartechnologies.net): five screens, live preview.
- **The malicious prompt classifier** links to the paper, "Malicious Prompt
  Classifier with Leave-One-Out Deletion Approach for Prompt Sanitization",
  Procedia Computer Science, 2026 (ScienceDirect), as "Read the paper ↗", and its
  result now says it is published.

## The share card

`src/app/opengraph-image.jpg` and `twitter-image.jpg`: Meet's image
(`public/Pale Blue Dot_Open Graph_v0.1.png`, 1731 × 909) cropped to 1200 × 630, the
size every platform expects, and saved at 132 KB, under WhatsApp's limit for a
preview. With their alt text files, Next.js adds them to every page with their type,
size and alt. `layout.tsx` adds the Open Graph title, description, site name, type
and locale, and X's large-image card (`@Meet2304`). Vercel's Open Graph view reads
these same tags.

The links in the tags are absolute, from `metadataBase`: `https://www.meetbhatt.com`
in production, the deployment's own address on a Vercel preview, and localhost in
development.

## Verification

`npm run ci` passes. Checked in Chrome at 360 × 640, 390 × 844, 844 × 390,
1024 × 768, 1440 × 900 and 1920 × 1080 (no errors, nothing wider than the screen):
the story's first three chapters, the drawer (open, a kind open, a piece tapped
landing on its chapter), the pass by Carnegie Mellon and PDEU, free scrolling, and
the tags on `/`, `/story` and `/work/linea`, with the image served at 1200 × 630.
