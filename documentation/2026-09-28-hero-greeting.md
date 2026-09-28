# Hero: the greeting, and a new line

- **Date:** 28 September 2026
- **Branch:** `claude/eager-ramanujan-blh51w`
- **Why:** Visitors could not tell whose site this was. Meet asked for an opening that
  says "Hola! I'm Meet" and hands over to the landing page with that text still in view,
  and for a hero line that belongs to this site better than "What's missing, I make."

## The opening (`src/components/universe/intro.tsx`)

1. Black, and one point of light at the centre: the pale blue dot.
2. "Hola! I'm Meet" decodes out of the terminal's light glyphs, letter by letter, while
   the point of light glides to where the full stop will be and becomes it. The full
   stop stays pale blue.
3. The whole line flies (FLIP: measure both, translate and scale) into the hero, where
   the same component renders it settled; the black lifts off Earth; the headline,
   identity line, filter and chapter ticks rise in behind it.

About 3.4 seconds. Any key, click, tap or scroll skips to the landing, and nothing
scrolls until it has landed. It plays on every fresh load, not again when a visitor
comes back to `/` from another page in the same visit. Under reduced motion the line
appears whole and the black fades after a short hold.

The page is held still by cancelling scroll input rather than hiding the overflow:
hiding it takes the scrollbar away and brings it back, which would shift the hero
sideways under the line as it lands.

## The line

"What's missing, I make." becomes **"Adding light to the pale blue dot."** Every piece of
work on the map is a point of light around the dot; the line says what Meet does in the
site's own terms, and the closing chapter ("It is a little brighter than it was.")
answers it. The page title follows.
