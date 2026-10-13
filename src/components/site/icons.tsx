import type { SVGProps } from "react";

import s from "./icons.module.css";

/**
 * The site's small line icons (Lucide's shapes), each with a little motion
 * when the control it sits in is pointed at, focused from the keyboard or
 * pressed: mark that control `data-animate-icon`. The motion is CSS
 * (icons.module.css). These replaced Animate UI's icons, which brought the
 * whole of `motion` and `tailwind-merge` (60 KB compressed) onto every page
 * for a nudge, a turn and a wiggle.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

const Svg = ({
  size = 24,
  className,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    {children}
  </svg>
);

/** Steps a quarter of its width to the left. */
export const ArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <g className={`${s.part} ${s.arrowLeft}`}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </g>
  </Svg>
);

/** The arrow leans out of its box. */
export const ExternalLink = (p: IconProps) => (
  <Svg {...p}>
    <g className={`${s.part} ${s.outQuick}`}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </g>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Svg>
);

/** The arrow leans out of its box, a little slower. */
export const SquareArrowOutUpRight = (p: IconProps) => (
  <Svg {...p}>
    <g className={`${s.part} ${s.out}`}>
      <path d="m21 3-9 9" />
      <path d="M15 3h6v6" />
    </g>
    <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
  </Svg>
);

/** The three bars fold into an arrow. */
export const Menu = (p: IconProps) => (
  <Svg {...p}>
    <line className={`${s.part} ${s.menuTop}`} x1={4} y1={6} x2={20} y2={6} />
    <line className={`${s.part} ${s.menuMid}`} x1={4} y1={12} x2={20} y2={12} />
    <line className={`${s.part} ${s.menuBottom}`} x1={4} y1={18} x2={20} y2={18} />
  </Svg>
);

/** The bubble wiggles. */
export const MessageCircle = (p: IconProps) => (
  <Svg {...p}>
    <path className={`${s.part} ${s.wiggle}`} d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Svg>
);

/** The whole orbit turns, for as long as it is pointed at. */
export const Orbit = (p: IconProps) => (
  <Svg {...p} className={`${s.part} ${s.orbit} ${p.className ?? ""}`}>
    <path d="M20.341 6.484A10 10 0 0 1 10.266 21.85" />
    <path d="M3.659 17.516A10 10 0 0 1 13.74 2.152" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="19" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" />
  </Svg>
);

/** Each stroke turns a quarter, the second just after the first. */
export const X = (p: IconProps) => (
  <Svg {...p}>
    <line className={`${s.part} ${s.xOne}`} x1={6} y1={18} x2={18} y2={6} />
    <line className={`${s.part} ${s.xTwo}`} x1={6} y1={6} x2={18} y2={18} />
  </Svg>
);
