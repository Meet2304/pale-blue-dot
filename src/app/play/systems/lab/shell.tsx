"use client";

import { useMemo, useState, type ReactNode } from "react";

import type { ShapeId } from "../engine";
import {
  ACCENTS,
  CategoryNav,
  Chips,
  HeroCopy,
  Sheet,
  accentVars,
  heroClass,
  heroFieldClass,
  tallClass,
  rampList,
  type AccentKey,
  type SheetSpec,
} from "./sheet";

export type FieldArgs = {
  palette: string[];
  accentKey: AccentKey;
  shape: ShapeId;
  className: string;
};

/**
 * Everything a lab system shares: category state, the nav, the hero copy,
 * optional form chips, and the token sheet. A system supplies its canvas and
 * its skin (a class that sets the sheet's variables).
 */
export function LabShell({
  number,
  name,
  tagline,
  idea,
  hint,
  spec,
  rootClass,
  forms,
  initialShape = "spiral",
  heroClassName,
  renderField,
  heroExtra,
  scrollLength,
}: {
  number: number;
  name: string;
  tagline: string;
  idea: string;
  hint: string;
  spec: SheetSpec;
  rootClass: string;
  forms?: { id: ShapeId; label: string }[];
  initialShape?: ShapeId;
  heroClassName?: string;
  renderField: (args: FieldArgs) => ReactNode;
  heroExtra?: ReactNode;
  /** Pin the hero for this many screen heights of scroll, for scroll-driven
      heroes. The canvas reads its own progress. */
  scrollLength?: number;
}) {
  const [accentKey, setAccentKey] = useState<AccentKey>("home");
  const [shape, setShape] = useState<ShapeId>(initialShape);
  const accent = ACCENTS.find((a) => a.key === accentKey) ?? ACCENTS[0];
  const palette = useMemo(
    () => rampList(ACCENTS.find((a) => a.key === accentKey) ?? ACCENTS[0]),
    [accentKey],
  );

  return (
    <main id="content" className={rootClass} style={accentVars(accent)}>
      {(() => {
        const inner = (
          <>
            {renderField({ palette, accentKey, shape, className: heroFieldClass })}
            <CategoryNav value={accentKey} onChange={setAccentKey} />
            <HeroCopy
              number={number}
              name={name}
              tagline={tagline}
              idea={idea}
              hint={hint}
            >
              {forms && (
                <Chips
                  items={forms}
                  value={shape}
                  onChange={setShape}
                  label="Choose a form"
                />
              )}
            </HeroCopy>
            {heroExtra}
          </>
        );
        return scrollLength ? (
          <section
            className={tallClass}
            data-scroll-hero
            style={{ height: `${scrollLength * 100}svh` }}
          >
            <div className={heroClassName ?? heroClass} data-sticky>
              {inner}
            </div>
          </section>
        ) : (
          <section className={heroClassName ?? heroClass}>{inner}</section>
        );
      })()}
      <Sheet spec={spec} accentKey={accentKey} onAccent={setAccentKey} />
    </main>
  );
}
