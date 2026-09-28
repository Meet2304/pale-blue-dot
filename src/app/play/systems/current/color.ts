/**
 * Colour for Current.
 *
 * The system is built so the accent is a guest: every category gets its own
 * hue, and nothing else about the page changes when it swaps. That only holds
 * if the accents are equally bright to the eye, which is why they are defined
 * in OKLCH (perceptual lightness, chroma, hue) and converted here, rather than
 * picked as hex by feel.
 */

export type AccentKey = "home" | "projects" | "research" | "experience" | "leadership";

export type Accent = {
  key: AccentKey;
  label: string;
  /** The category's glyph mark, so categories never rely on colour alone. */
  mark: string;
  l: number;
  c: number;
  h: number;
};

/** Same lightness band (0.76–0.83) and similar chroma: only the hue moves. */
export const ACCENTS: Accent[] = [
  { key: "home", label: "All", mark: "·", l: 0.82, c: 0.09, h: 245 },
  { key: "projects", label: "Projects", mark: "+", l: 0.77, c: 0.14, h: 300 },
  { key: "research", label: "Research", mark: "×", l: 0.8, c: 0.12, h: 185 },
  { key: "experience", label: "Experience", mark: "=", l: 0.83, c: 0.12, h: 80 },
  { key: "leadership", label: "Leadership", mark: "~", l: 0.77, c: 0.13, h: 15 },
];

export const accentOf = (key: AccentKey) =>
  ACCENTS.find((a) => a.key === key) ?? ACCENTS[0];

/** OKLCH to sRGB hex, clamped into gamut. */
export function oklch(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return (
    "#" +
    lin
      .map((v) => {
        const g = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        const byte = Math.round(Math.min(1, Math.max(0, g)) * 255);
        return byte.toString(16).padStart(2, "0");
      })
      .join("")
  );
}

/**
 * The five-stop ramp every accent expands into, from nearly neutral to
 * nearly white. Particles, glyphs and UI all draw from these stops, so a new
 * accent restyles everything at once and keeps every relationship intact.
 */
export function rampOf(a: Accent) {
  return {
    deep: oklch(0.34, a.c * 0.35, a.h),
    dim: oklch(0.55, a.c * 0.75, a.h),
    accent: oklch(a.l, a.c, a.h),
    soft: oklch(0.9, a.c * 0.45, a.h),
    white: oklch(0.97, 0.012, a.h),
  };
}

export const rampList = (a: Accent) => {
  const r = rampOf(a);
  return [r.deep, r.dim, r.accent, r.soft, r.white];
};
