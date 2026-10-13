# On a phone: a stage for each body, and figures without their keys

- **Date:** 13 October 2026
- **Branch:** `fix/mobile-chapters`
- **Why:** Meet found the phone view a mess. Every chapter ran into the next with nothing
  to say where one ended, and the bodies were too faint and small to matter. He also
  asked to drop the lines of explanation under the figures, which read as generated
  and weren't needed.

## What changed

- **A stage for each body.** On a phone a piece of work now opens with the top 46% of
  the screen kept clear for its body. The copy and picture follow below it, and the
  chapter grows to hold them, so one piece ends before the next one's stage begins.
  Earlier, the copy and picture filled the screen and the body was squeezed into a
  strip above them.
- **Chapters taller than a screen** (`chapter-map.ts`). The camera frames a body when
  its chapter reaches the top of the screen. It holds the body there while the rest of
  the chapter is read, and moves on to the next one only over the last screen of
  scrolling. Glides and the keys use the chapters' measured tops, not multiples of the
  screen. A glide re-aims every frame, so it still lands when a figure above it loads
  and changes size. Scroll anchoring now keeps the reader's place between glides. On a
  wide screen every chapter is still exactly a screen tall, and nothing there moves.
- **Bodies with more weight on a phone.** In their stage they are drawn up to a third
  of the screen across (a star a quarter) and 1.3 times brighter. Four versions were
  compared on a 390 px phone:
  - the stage alone;
  - the stage with larger bodies;
  - larger bodies with their chart reticle and name;
  - larger bodies, 1.3 times brighter, without the reticle.

  The reticles ran off the edges at these sizes, so the last version was kept.

- **Figures without their keys.** The embedded figures no longer show the key under
  the drawing (swatch lines with a sentence each). The site's one-line hint below the
  frame stays. On a phone the figure takes the full width. Its kind label, which ran
  into the title and is already named above the frame, is hidden. A long readout wraps
  instead of running off the edge. Both changes are in
  `pale-blue-dot-figures/anatomy/common.mjs`, and the six embeds were rebuilt from it.
