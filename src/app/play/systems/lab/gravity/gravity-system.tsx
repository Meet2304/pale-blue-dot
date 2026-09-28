"use client";

import { LabShell } from "../shell";
import { GravityCanvas } from "./gravity-canvas";
import s from "./gravity.module.css";

export function GravitySystem() {
  return (
    <LabShell
      number={1}
      name="Gravity"
      tagline="Everything bends toward what matters."
      idea="Your cursor is a black hole. Stars, the galaxy and spacetime itself lens around it, with the real equations, so light behind it wraps into arcs and rings."
      hint="Move to lens the sky. Hold to add mass."
      rootClass={s.root}
      initialShape="spiral"
      forms={[
        { id: "spiral", label: "Galaxy" },
        { id: "nebula", label: "Nebula" },
        { id: "ring", label: "Ring" },
        { id: "dot", label: "Dot" },
        { id: "name", label: "Name" },
      ]}
      renderField={({ palette, shape, className }) => (
        <GravityCanvas palette={palette} shape={shape} className={className} />
      )}
      spec={{
        moment: {
          title: "A black hole for a cursor",
          body: "Every point of light behind the cursor is lensed by a point mass: it forms two images, one pushed outward and one pulled through to the far side, each brightened by the lens. Line a source up behind it and you get a full Einstein ring. The spacetime grid bends the same way, and its glyphs turn into strokes along the stretch.",
          how: [
            "Idle, the lens drifts across the galaxy on its own, so the page is never still.",
            "Holding the mouse down grows the mass: the ring widens and the grid pulls in.",
            "The photon ring around the shadow takes the current category's colour.",
          ],
        },
        principles: [
          {
            title: "Bend, never break",
            body: "Nothing is pushed away or cut out. Space is only curved, so every form stays whole as it distorts.",
          },
          {
            title: "The grid is the ground",
            body: "A faint spacetime grid sits under everything. It is the one structure that shows the curvature when nothing else is there.",
          },
          {
            title: "Precise, then strange",
            body: "Square corners, a strict grid and an engineered sans. The strangeness comes only from the physics, never from decoration.",
          },
        ],
        fonts: { display: "Geist, light", text: "Geist", mono: "Geist Mono" },
        shape: [
          { name: "Control", value: "2px", use: "Buttons, chips, the nav" },
          { name: "Panel", value: "4px", use: "Cards and panels" },
          {
            name: "Grid",
            value: "46px",
            use: "The spacetime lattice under everything",
          },
        ],
        motion: [
          {
            name: "Lens follow",
            value: "12% per frame",
            use: "The mass trailing your cursor",
          },
          {
            name: "Mass",
            value: "1× to 2.4×, 5% per frame",
            use: "Holding to add mass",
          },
          {
            name: "Drift",
            value: "0.13 and 0.21 Hz",
            use: "The idle path across the galaxy",
          },
        ],
      }}
    />
  );
}
