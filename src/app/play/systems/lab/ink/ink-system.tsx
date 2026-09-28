"use client";

import { LabShell } from "../shell";
import { InkCanvas } from "./ink-canvas";
import s from "./ink.module.css";

export function InkSystem() {
  return (
    <LabShell
      number={4}
      name="Nebula Ink"
      tagline="A living nebula you paint."
      idea="A real fluid, simulated every frame. Move through it and it swirls; choose a category and your cursor bleeds that colour into the gas. The glyphs lie along the current, so the texture is the flow."
      hint="Move to stir and paint. Switch category to change your ink."
      rootClass={s.root}
      renderField={({ palette, className }) => (
        <InkCanvas palette={palette} className={className} />
      )}
      spec={{
        moment: {
          title: "Paint with physics",
          body: "Under the hero is a stable-fluids solver: velocity advected along itself, pressure solved so the gas never compresses, and vorticity confinement to keep the curls alive. Your cursor is a brush of force and colour. Paint in Research, switch to Projects and paint again, and the nebula keeps both, folding them into each other.",
          how: [
            "Idle, three slow emitters keep the gas breathing, so the hero is never still.",
            "Tracer particles ride the velocity field like stars caught in the gas.",
            "Glyphs in the thinner gas turn to lie along the local current.",
          ],
        },
        principles: [
          {
            title: "Nothing is keyframed",
            body: "Every movement in the hero is the physics answering. Nothing is scripted, so nothing ever repeats.",
          },
          {
            title: "Colour accumulates",
            body: "Categories do not replace each other; they mix. The page remembers what you looked at, like a record of your visit.",
          },
          {
            title: "Soft surfaces",
            body: "Round, gaseous components with generous radii and blurred depth, so the chrome feels made of the same medium.",
          },
        ],
        fonts: { display: "Figtree", text: "Figtree", mono: "JetBrains Mono" },
        shape: [
          { name: "Control", value: "999px", use: "Buttons and chips: fully round" },
          { name: "Panel", value: "24px", use: "Soft panels, blurred behind" },
          { name: "Grid", value: "128 cells wide", use: "The fluid's resolution" },
        ],
        motion: [
          {
            name: "Advection",
            value: "Semi-Lagrangian",
            use: "Gas and velocity carried along the flow",
          },
          {
            name: "Pressure",
            value: "18 Jacobi passes",
            use: "Keeping the gas incompressible",
          },
          {
            name: "Dye decay",
            value: "0.35% per frame",
            use: "How long a stroke of colour lingers",
          },
        ],
      }}
    />
  );
}
