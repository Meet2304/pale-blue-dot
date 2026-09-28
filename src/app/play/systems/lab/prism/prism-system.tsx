"use client";

import { LabShell } from "../shell";
import { PrismCanvas } from "./prism-canvas";
import s from "./prism.module.css";

export function PrismSystem() {
  return (
    <LabShell
      number={2}
      name="Prism"
      tagline="One light, five colours."
      idea="Everything I do starts as the same white beam. Through the prism it splits into the kinds of work, in true spectral order, because the category colours already are a spectrum."
      hint="Move up and down to turn the prism. Left and right to widen the spread."
      rootClass={s.root}
      renderField={({ accentKey, className }) => (
        <PrismCanvas accentKey={accentKey} className={className} />
      )}
      spec={{
        moment: {
          title: "White light in, a spectrum out",
          body: "Sorted by hue, the five category accents run rose, amber, teal, blue, violet: a rainbow. So the hero is a prism. A beam of white particles enters, bends through the glass and fans out into one river per kind of work. Choosing a category in the nav leaves its band lit and lets the others fall to a glow.",
          how: [
            "Turning the prism sweeps the whole spectrum up and down the page.",
            "Widening the spread pulls the rivers apart; closing it braids them back toward white.",
            "Each band writes its category where it leaves the frame.",
          ],
        },
        principles: [
          {
            title: "One source",
            body: "Every colour on the page is traceable to the same white. Accents are never decoration: they are what the light became.",
          },
          {
            title: "Glass, not paint",
            body: "Surfaces are frosted and edged with a thin spectral line, as if cut from the prism. Nothing is filled with a flat colour except the one active action.",
          },
          {
            title: "Order carries meaning",
            body: "Categories always appear in spectral order, from rose to violet, everywhere: the nav, the legend, the lists.",
          },
        ],
        fonts: { display: "Onest", text: "Onest", mono: "Fragment Mono" },
        shape: [
          { name: "Control", value: "10px", use: "Buttons and chips" },
          { name: "Glass", value: "18px", use: "Panels, with a spectral edge" },
          { name: "Tag", value: "999px", use: "Category tags" },
        ],
        motion: [
          {
            name: "Beam",
            value: "4 to 6 s per traverse",
            use: "Particles crossing the frame",
          },
          {
            name: "Turn",
            value: "6% per frame",
            use: "The prism following the cursor",
          },
          {
            name: "Isolate",
            value: "6% per frame",
            use: "Bands dimming to a glow when one is chosen",
          },
        ],
      }}
    />
  );
}
