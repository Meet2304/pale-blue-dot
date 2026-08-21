# Personal Site — Loader & Hero Section Spec

## Scope

This spec covers everything from page load through the fully-interactive hero
state. It stops there. The scroll-triggered warp transition and the project
story sections that follow are **out of scope** for this build — they'll be
spec'd separately once content for each project is finalized. Do not build
placeholder content for what comes after the hero; end the build at "hero
fully interactive, awaiting scroll."

## Concept, in one paragraph

There is no separate loading screen and hero screen — they are the same
scene at different moments. The page opens on black. A single point of
light ignites low on the screen. That point becomes a horizon. The horizon
becomes a full night seascape: starry sky above, a glowing gradient horizon
with a subtle noise texture, and a sea below that reflects the glow and
reacts to the user's mouse. Nowhere in this sequence should there be a
visible "cut" between a loading state and the real site — it should read as
one continuous act of something coming into being.

## Sequence & timing

Total budget from black screen to fully interactive: **≤1.8 seconds**,
regardless of asset load state. If assets aren't ready by then, degrade
gracefully (see Fallbacks) rather than extending the animation.

| Time (ms)                           | Event                                                                                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0                                   | Black screen.                                                                                                                                                                                                                                                 |
| 0–400                               | A single point of light ignites low-center on the screen.                                                                                                                                                                                                     |
| 400–1200                            | The point stretches horizontally into the horizon line. Gradient bleeds upward into the sky and downward into where the water will be, simultaneously.                                                                                                        |
| 800–1600                            | Stars fade in above the horizon. Procedurally placed (not a repeating/tiling pattern), with slight variation in size and a subtle independent twinkle per star. Overlaps with horizon formation — don't wait for the horizon to finish before starting stars. |
| 1400–1800                           | Noise texture fades in **last**, over the gradient. It should never be visible before the gradient is — grain appearing before light reads as a rendering glitch, not atmosphere.                                                                             |
| 1600–1800                           | Water plane fades in beneath the horizon, showing the reflected gradient.                                                                                                                                                                                     |
| 1800+                               | Scene is fully formed. Mouse-reactive water interaction goes live **only now** — do not let pointer movement distort water that's still fading in.                                                                                                            |
| ~concurrent with horizon completing | Headline "Not given. Built." fades in and becomes the permanent hero copy.                                                                                                                                                                                    |

## Visual composition

- **Sky (upper portion of viewport):** night sky, dark, procedural stars with individual twinkle animation. No moon, no clouds — keep it spare.
- **Horizon (roughly middle third):** glowing gradient band, blue-toned, brightest at the horizon line and falling off vertically in both directions. Subtle noise/grain texture layered on top of the gradient (film-grain style, not visible pixelation) — added last in the sequence, per timing table above.
- **Sea (lower portion of viewport):** reflects the horizon gradient (mirrored, slightly blurred/rippled — not a perfect mirror). Occupies less vertical space than the sky; the horizon sits low in the frame, not centered.
- **Overall palette:** near-black base, blues for the glow/water, white/pale stars. No competing accent colors.

## Interaction

- **Water responds to mouse position** via a displacement/ripple shader, raycast against the water plane. Movement should feel physical (damped, slightly delayed) rather than instant/rigid — closer to disturbing a real surface than dragging a filter.
- Interaction only activates after the fade-in sequence completes (see timing table). No interaction should be possible, or perceptible, before then.
- Any user scroll or click **during** the load sequence should immediately snap to the fully-formed hero state — never queue the interaction behind the animation, never trap the user in a sequence they can't skip.

## Copy

- **Hero headline (permanent, primary):** `Not given. Built.`
- No supporting subtext/paragraph beneath the headline. The line stands alone.

## Accessibility & performance requirements (non-negotiable)

- Respect `prefers-reduced-motion`: skip directly to the fully-formed static hero state (no ignition sequence, no water animation loop beyond a minimal idle state). "Hola" and the headline can still appear, just without the motion build-up.
- Hard cap of 1.8s on the load sequence regardless of connection speed or asset size — pre-load/inline whatever is needed to hit this, or simplify the visual until it fits.
- Sequence must be interruptible at any point by scroll or click/tap.
- Target 60fps for the water shader on mid-range hardware; if unattainable, reduce shader complexity before reducing frame rate.

## Suggested stack notes

- Build as a single continuous WebGL scene (e.g. React Three Fiber / Three.js) rather than a DOM-based loader handing off to a separate canvas — a handoff between two rendering systems is the most likely place a visible "cut" will appear.
- Stars: instanced points or sprites with per-instance twinkle animation, not a static texture.
- Water: shader-based plane (e.g. custom GLSL vertex/fragment shader) with pointer-driven displacement; reflection can be a simple approximated reflection of the horizon gradient rather than a full scene reflection.

## Fallbacks

- If WebGL is unavailable or fails to initialize, fall back to a static version of the fully-formed hero (gradient + stars as CSS/SVG, no water interaction) rather than blocking the page.
- On low-power/mobile devices, consider disabling the mouse-reactive water displacement (or switching to a lightweight idle ripple) while keeping the visual composition intact.

## Out of scope for this build

- Scroll-triggered warp/transition animation into the next section.
- Project story sections (Serin, Project Phoenix, etc.) and their content.
- Navigation, changelog page, contact section.
