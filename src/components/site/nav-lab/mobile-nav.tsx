"use client";

import { HorizonDock } from "./designs/horizon-dock";
import { LiquidMorph } from "./designs/liquid-morph";
import { MagneticIsland } from "./designs/magnetic-island";
import { OrbitalFan } from "./designs/orbital-fan";
import { StarSheet } from "./designs/star-sheet";
import { WarpVeil } from "./designs/warp-veil";
import { useNavLab, type NavVariantId } from "./provider";

type MobileNavProps = {
  visible: boolean;
  preview?: boolean;
  forceVariant?: NavVariantId;
};

const DESIGNS = {
  dock: HorizonDock,
  orbit: OrbitalFan,
  island: MagneticIsland,
  sheet: StarSheet,
  warp: WarpVeil,
  liquid: LiquidMorph,
} as const;

export function MobileNav({ visible, preview = false, forceVariant }: MobileNavProps) {
  const { variantId } = useNavLab();
  const id = forceVariant ?? variantId;
  if (id === "classic") return null;

  const Design = DESIGNS[id];
  return <Design key={id} visible={visible} preview={preview} />;
}
