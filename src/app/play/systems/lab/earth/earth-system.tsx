"use client";

import { LabShell } from "../shell";
import { EarthCanvas } from "./earth-canvas";
import s from "./earth.module.css";

export function EarthSystem() {
  return (
    <LabShell
      number={3}
      name="Terminal Earth"
      tagline="The whole world, in characters."
      idea="A live Earth drawn only in glyphs: oceans in waves, land in marks, clouds drifting over, city lights on the night side. Scroll, and it shrinks to the pale blue dot."
      hint="Drag to spin it. Hover to scan. Scroll to leave."
      rootClass={s.root}
      scrollLength={3}
      renderField={({ palette, className }) => (
        <EarthCanvas palette={palette} className={className} />
      )}
      spec={{
        moment: {
          title: "A planet, then a pixel",
          body: "Every frame the globe is ray-cast into a monospaced grid. Each character cell finds its point on a tilted, spinning sphere and asks noise what is there: ocean, land or cloud, each with its own glyphs, lit by the sun on one side and by cities on the other. Then scrolling takes the camera away. The grid runs out of cells to draw a world with, the characters give way to light, and it ends on one pale blue dot.",
          how: [
            "Dragging spins the planet with inertia; it drifts back to its own rotation when you let go.",
            "The cursor is a scanner: it reveals latitude and longitude lines under it.",
            "The oceans and the dot take the current category's colour; the cities stay warm.",
          ],
        },
        principles: [
          {
            title: "Materials, not pixels",
            body: "Each substance has its own vocabulary: waves for water, marks for land, rounded glyphs for cloud. Texture says what it is before colour does.",
          },
          {
            title: "Instruments, not ornaments",
            body: "Everything on screen could be a readout. Mono labels, square data, and interaction that measures (scan, spin) rather than decorates.",
          },
          {
            title: "Scale is the story",
            body: "The most important motion on the page is the zoom out: from a world you can touch to a point you could miss.",
          },
        ],
        fonts: {
          display: "IBM Plex Sans, light",
          text: "IBM Plex Sans",
          mono: "IBM Plex Mono",
        },
        shape: [
          { name: "Control", value: "6px", use: "Buttons, chips, the nav" },
          { name: "Panel", value: "8px", use: "Panels, with scanlines" },
          {
            name: "Cell",
            value: "7 × 12px",
            use: "The character grid the planet is drawn in",
          },
        ],
        motion: [
          { name: "Spin", value: "0.12 rad/s", use: "The planet's own rotation" },
          {
            name: "Leave",
            value: "3 screens of scroll",
            use: "From globe to pale blue dot",
          },
          { name: "Clouds", value: "0.018 rad/s", use: "Cloud drift over the surface" },
        ],
      }}
    />
  );
}
