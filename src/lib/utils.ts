import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name joiner required by the Animate UI icon components, which are
 * distributed as Tailwind-classed files and import it from `@/lib/utils`.
 *
 * Nothing hand-written in this repo needs it — the design system styles inline
 * against the Horizon tokens. It exists so the vendored icons work unmodified.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
