# Resume glow stays outside an opaque chip

- **Date:** 23 August 2026
- **Branch:** `feat/story-page`
- **PR:** [#10](https://github.com/Meet2304/pale-blue-dot/pull/10)
- **Why:** The résumé control's bloom was shining _through_ the button. The
  interior is meant to be night — stars on a solid plate — with the light only
  wrapping the outline.

A filtered glow as a child of the chip (or as a sibling that Chromium still
composites above the fill) paints the bloom across the label. Negative
`z-index` and a CSS `mask-image` both failed earlier: the first is a
compositor trap in Chromium, the second clips the spill to a square.

## What changed

**Sibling glow.** The bloom (`.hz-resume-glow`) is no longer inside the
`<Link>`. It sits in `.hz-resume-host` _behind_ the painted chip, so a CSS
filter on the glow cannot flatten above the label.

**Opaque plate.** `.hz-resume` and `.hz-resume-face` fill with `--night-1000`.
The star field on `::before` stays fully opaque (it no longer twinkles by
fading the plate). `::after` still twinkles.

**Compositor face.** `.hz-resume-face` wraps the motion `<Link>` and uses
`transform: translateZ(0)` plus `isolation: isolate`. Animate UI's `asChild`
puts Motion transforms on the link itself; a filtered sibling can still
composite through that layer. The face is a non-motion wrapper with its own
layer, so the bloom can only wrap the outline.

**Grain clipped to the bloom.** Dither is an SVG filter unique per instance
(`useId`). `feTurbulence` is composited `in` the blurred blob, so grain does
not paint a square the size of the filter region. Blur lives in that same
pipeline, not as a separate CSS `blur()`.

**Pointer tracking on the document.** The glow is meant to wake as the cursor
approaches, which a listener on the button cannot see. Touches are ignored;
`display: none` 0×0 rects are skipped so the hidden bar control does not think
the cursor is near the origin. Resting bloom stays at bottom-centre `(0, 1)`.

**Do not mask the glow host.** A `mask-image` on `.hz-resume-glow` clips to the
border box and squares the halo. The inner half of the bloom is covered by the
opaque chip instead.

## Files

| Path                                  | Role                                                             |
| ------------------------------------- | ---------------------------------------------------------------- |
| `src/components/site/resume-link.tsx` | Host, glow sibling, dither SVG, face wrapper, document tracking. |
| `src/styles/horizon/nav.css`          | Host tokens, opaque fill, stacking, liquid-menu host/face rules. |

## How to check

Desktop at **≥880px** (below that the bar control is hidden). Hover or
approach Resume: the interior stays black/starry with no blue wash; bloom
only outside the outline. Open the liquid menu on a narrow viewport and
confirm the same on that Resume chip.
