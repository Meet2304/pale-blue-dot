# Landing polish: two kinds of link, no About, quieter phones, and a fact on the 404

- **Date:** 13 October 2026
- **Branch:** `feat/landing-polish` (from `fix/mobile-chapters`)
- **Why:** Meet asked for six things: no title in the figures' frames; a clear difference
  between "What I did" and the link to the thing itself; no About page; menu jumps on a
  phone that show a piece's words and picture, not just its body; fainter bodies on a
  phone; and a random space fact on the 404 page.

## What changed

- **Figures without a title.** The top-right title in each figure's frame is hidden in the
  embed. The site already names the piece above the frame, and the one-line hint under it
  stays. The change is in `pale-blue-dot-figures/anatomy/common.mjs` (`EMBED_CSS`), and the
  six embeds were rebuilt from it.
- **Three links in one row** (`piece-links.tsx`). "What I did" is framed like a figure: a
  hairline with corner ticks in the piece's colour, which open out when pointed at. A faint
  light in the same colour follows the pointer inside it, and the words run through the
  sky's glyphs before they settle. Beside it, as tall and quieter, the thing itself and its
  code: a mark and a short word each ("Live site", or the link's own verb, "Read the
  paper"; "Code"). Pointed at, the mark plays its trick, a line in the piece's colour draws
  in under the word, and the arrow lifts off while the next one rises in. On a phone the
  marks step aside so all three still fit one row. The "1 of 3" counter beside each year is
  gone.
- **No About page.** The page, its route, its footer link and icon, its sitemap entry and its
  line in `llms.txt` are gone. `/about` redirects permanently to `/`. The footer now lists
  nine ways off the page, so Email sits alone on its last row.
- **Menu jumps on a phone** (`chapterLanding` in `universe.tsx`). On an upright phone, a jump
  to a piece of work no longer lands on the top of its body's stage. It lands on the piece:
  the whole copy and picture at the foot of the screen if they fit, or the name just under
  the bar if they don't. The camera still holds the body, so the copy rises over the lower
  part of it. Wide screens, and the hero, dot and sky chapters, land as before.
- **Fainter bodies on a phone.** `NARROW_GLOW` goes from 1.3 to 0.55. On a phone the body now
  sits behind the copy and the picture instead of competing with them.
- **A fact on the 404** (`space-fact.tsx`). The "Lost in space." page now shows one true,
  short fact about space, picked at random on each load, between the message and the way
  home. Five drafts of a playful 403 page were tried in a lab and dropped in favour of this.
