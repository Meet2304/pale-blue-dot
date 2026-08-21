import type { CSSProperties } from "react";

/**
 * A stack of masked `backdrop-filter` layers that together blur *progressively*
 * — barely at one edge, fully at the other — instead of the uniform frosted
 * pane a single `backdrop-filter` gives you.
 *
 * Each layer blurs a little more than the last and is masked to a narrow band
 * that slides along the axis, so the bands overlap into a smooth ramp.
 *
 * Two changes from the reference implementation:
 *
 * 1. **No `motion`.** The original rendered every layer as a `motion.div`, but
 *    nothing here animates — these are static divs with a mask and a filter.
 *    Rendering N motion components to hold N static styles is pure overhead.
 * 2. **`aria-hidden` and `pointer-events: none` on the host**, not just the
 *    layers, so the whole stack is inert to both the cursor and a screen
 *    reader. It is texture; it should not be reachable.
 *
 * Cost worth knowing: every layer is its own backdrop snapshot, re-taken
 * whenever what is behind it changes. Over an animating canvas that is N blurs
 * per frame, so keep `layers` low and give small screens a cheaper path.
 *
 * The host is not positioned for you — give it `position` and a box from CSS.
 */

const GRADIENT_ANGLES = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
} as const;

export type ProgressiveBlurProps = {
  /** The edge the blur builds *toward*. A top bar wants "top". */
  direction?: keyof typeof GRADIENT_ANGLES;
  layers?: number;
  /** Blur added per layer, in px. Peak blur is roughly layers × this. */
  intensity?: number;
  /**
   * Exponent shaping where the bands sit along the axis, < 1 easing out.
   *
   * At 1 the bands are evenly spaced, which is what makes a linear ramp feel
   * rigid: the strip spends as much of its length going from clear to slightly
   * blurred as it does going from mostly to fully blurred, so the eye finds an
   * edge in the middle of it. Below 1 the low-blur bands are spread across most
   * of the length and the heavy blur is compressed against the far edge, so the
   * clear end trails off instead of starting.
   */
  curve?: number;
  className?: string;
  style?: CSSProperties;
};

export function ProgressiveBlur({
  direction = "bottom",
  layers = 6,
  intensity = 1,
  curve = 0.62,
  className,
  style,
}: ProgressiveBlurProps) {
  const count = Math.max(layers, 2);
  const segment = 1 / (count + 1);
  const angle = GRADIENT_ANGLES[direction];

  return (
    <div aria-hidden className={className} style={{ pointerEvents: "none", ...style }}>
      {Array.from({ length: count }).map((_, index) => {
        /* Four stops, opaque only across the middle two: a window that is
           feathered on both sides, so neighbouring layers cross-fade instead
           of butting against each other and banding. */
        const gradient = `linear-gradient(${angle}deg, ${[
          index * segment,
          (index + 1) * segment,
          (index + 2) * segment,
          (index + 3) * segment,
        ]
          .map(
            (pos, i) =>
              `rgba(255, 255, 255, ${i === 1 || i === 2 ? 1 : 0}) ${(
                Math.pow(pos, curve) * 100
              ).toFixed(2)}%`,
          )
          .join(", ")}`;

        const blur = `blur(${(index * intensity).toFixed(2)}px)`;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              pointerEvents: "none",
              maskImage: gradient,
              WebkitMaskImage: gradient,
              backdropFilter: blur,
              WebkitBackdropFilter: blur,
            }}
          />
        );
      })}
    </div>
  );
}
