import type { CSSProperties } from "react";

import type { SocialId } from "@/lib/socials";

const SOURCES: Record<SocialId, string> = {
  github: "/assets/social/github.svg",
  linkedin: "/assets/social/linkedin.svg",
  x: "/assets/social/x.svg",
};

/** Brand artwork vendored from svglogos.dev and tinted by the current text color. */
export function SocialLogo({ name, size = 18 }: { name: SocialId; size?: number }) {
  const source = `url("${SOURCES[name]}")`;

  return (
    <span
      className="hz-brand-logo"
      aria-hidden="true"
      style={
        {
          width: size,
          height: size,
          WebkitMaskImage: source,
          maskImage: source,
        } as CSSProperties
      }
    />
  );
}
