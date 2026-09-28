"use client";

import { LabShell } from "../shell";
import { DeepCanvas } from "./deep-canvas";
import s from "./deep.module.css";

export function DeepSystem() {
  return (
    <LabShell
      number={5}
      name="Deep Field"
      tagline="Look long enough and it has depth."
      idea="A galaxy of thousands of points in real 3D, seen through a lens with depth of field. The camera turns with your cursor, and scrolling flies you straight through it."
      hint="Move to orbit the camera. Scroll to fly through."
      rootClass={s.root}
      scrollLength={2.5}
      initialShape="spiral"
      forms={[
        { id: "spiral", label: "Galaxy" },
        { id: "nebula", label: "Nebula" },
        { id: "ring", label: "Ring" },
        { id: "name", label: "Name" },
      ]}
      renderField={({ palette, shape, className }) => (
        <DeepCanvas palette={palette} shape={shape} className={className} />
      )}
      spec={{
        moment: {
          title: "Through the galaxy",
          body: "Every point has a real depth, so the camera can move. It orbits with the cursor, and the lens focuses on the galaxy's heart: everything nearer or farther swells into soft bokeh, the way a real long lens sees. Then the scroll takes over and flies the camera forward, through the disc and out the other side, the stars streaking past as fast as you scroll.",
          how: [
            "A far layer of glyphs turns more slowly than the galaxy, for parallax.",
            "Forms morph in three dimensions: galaxy, nebula, ring, even the name.",
            "Scroll speed sets the streaks: a slow scroll drifts, a fast one warps.",
          ],
        },
        principles: [
          {
            title: "Depth over decoration",
            body: "Hierarchy comes from focus, not borders. What matters is sharp; everything else is honestly out of focus.",
          },
          {
            title: "The camera is the narrator",
            body: "Scrolling is a journey through space, not down a page. Sections arrive the way places do, by getting closer.",
          },
          {
            title: "Cinematic, then quiet",
            body: "Wide type and generous space in the hero; underneath, calm panels with soft light, so the drama stays in one place.",
          },
        ],
        fonts: { display: "Sora, light", text: "Sora", mono: "Red Hat Mono" },
        shape: [
          { name: "Control", value: "12px", use: "Buttons and chips" },
          { name: "Panel", value: "20px", use: "Panels, lit by bokeh" },
          { name: "Focus", value: "Galaxy centre", use: "Where the lens is sharpest" },
        ],
        motion: [
          {
            name: "Orbit",
            value: "5% per frame",
            use: "The camera following the cursor",
          },
          {
            name: "Fly",
            value: "2.5 screens of scroll",
            use: "Through the disc and out",
          },
          { name: "Morph", value: "3.5% per frame", use: "Forms rebuilding in 3D" },
        ],
      }}
    />
  );
}
