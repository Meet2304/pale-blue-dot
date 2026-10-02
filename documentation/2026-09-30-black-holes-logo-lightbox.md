# Passing a black hole, the logo, and pictures up close

- **Date:** 30 September 2026
- **Branch:** `claude/eager-ramanujan-blh51w`
- **Why:** Meet asked for four things: scrolling past a black hole should feel like
  barely getting past one, with the page's contents sucked in; his logo in the bar,
  turning from "m." to "meet." on hover in a way that fits the rest of the site;
  the bodies behind the pictures were too hidden; and the pictures should answer the
  pointer and open up to be looked at closely.

## Passing a black hole

Scrolling on from a piece drawn as a black hole (Carnegie Mellon, PDEU):

1. **The hole holds the page.** From the first moment of the pull the copy stops
   scrolling away: the hole holds it where it was.
2. **The copy falls in.** Each line of the copy, and the picture, is drawn towards the
   hole, nearest first, along an inward spiral that turns the way the disk does. On
   the way it is stretched towards the hole and squeezed across it, shrinks, and
   fades as it reaches the shadow.
3. **The camera passes close.** The hole swings in towards the middle of the screen
   and the camera closes in on it (to 1.4 times), while it grows a little and comes
   to full strength, and the starlight around it is dragged in: stars are drawn
   towards it, turning with the disk, and drawn out into streaks pointing into it.
4. **And on.** It swings away, and the next piece arrives where it always would.

All of it is tied to the scroll, so it runs backwards on the way back and the copy
comes out of the hole again. The copy is moved by transforms written each frame from
the canvas, which knows where the hole is; the chapter's own fade is held off while
the hole pulls. Under reduced motion none of it happens: the page scrolls as before.

Code: `falls`, `pullOf` and the copy's fall in `universe-canvas.tsx`; the swing in
`camAt`; the dragged starlight in `backdrop.ts`. Measured in Chrome at 1440 × 900:
a median of 14 ms a frame (90th percentile 21 ms) scrolling past Carnegie Mellon.

The hole's shadow is now drawn black even while the hole is faint, so it never
shows as a grey disc.

## The logo

Meet's mark is in the bar in place of his name: "m." at rest, the pale blue dot as
its full stop. Pointed at or focused, the dot travels out to the end of the word and
draws "eet" out behind it, and glows; leaving, it draws them back in (560 ms). The
mark keeps the room of the whole word, so nothing else in the bar moves. The bar's
button is named "Meet Bhatt: back to the top" for screen readers.

The letters are cut from the full wordmark (`public/meet_logo_full_dark_v0.1.png`)
into two masks, `public/logos/wordmark/m.png` and `eet.png`, so the "m" is the same
in both states and they take the text colour (white here, black on a light page).
Sizes follow the wordmark's own proportions. The dot is the logo's blue, `#2f9dff`.

The browser tab shows the mark white on black when the browser is dark and black on
white when it is light (`public/logos/meet_logo_dark_v0.1/` and `redketchup/`, in
`src/app/layout.tsx`), with the dark one as `favicon.ico`, the touch icon, and in a
new web manifest (`src/app/manifest.ts`).

## Bodies behind the pictures, less hidden

Each body now rises higher above the picture's top edge and sits further out at its
corner, and is drawn at 80% of its strength, up from 60%.

## Pictures up close

**Under the pointer** a picture leans a few degrees towards it, as a print would if
picked up, and a soft sheen follows the pointer across it.

**Clicking it** opens it up (`lightbox.tsx`): it grows out of its place on the page
over a dimmed sky, and shrinks back into place when closed (the Close button,
Escape, or a click outside it). A website opens on the screen that was showing; the
arrows (or the left and right keys) step through its screens, and "Try it live" loads
the real site at a size where it can be used: laid out at 1280 × 800 and scaled to
fit on a wide screen, or at the phone's own width on a phone. "Try it live" on the
frame opens straight to that. While it is open the page beneath does not scroll, the
keys are the lightbox's, focus stays in it, and closing hands focus back to the
picture.

## Verification

`npm run ci` passes. Checked in Chrome: the pass-by at Carnegie Mellon and PDEU,
frame by frame, at 1440 × 900 and 390 × 844; the logo at rest, mid-way and open; the
favicon links; a picture leaning under the pointer; the photo and Linea opened up,
screens stepped, Linea live; the page held still while open; focus back on the
picture after closing. No console errors.
