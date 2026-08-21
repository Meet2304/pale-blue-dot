import type { ReactNode } from "react";

type MobileLayerProps = {
  visible: boolean;
  children: ReactNode;
  className?: string;
  preview?: boolean;
};

/**
 * Shared shell for every experimental mobile nav: hidden until the warp
 * finishes, gone from the tab order while it is, and CSS-hidden on desktop.
 */
export function MobileLayer({
  visible,
  children,
  className,
  preview = false,
}: MobileLayerProps) {
  const shown = visible || preview;
  return (
    <div
      className={["hz-mnav", className].filter(Boolean).join(" ")}
      data-nav={shown ? "visible" : "hidden"}
      data-preview={preview ? "true" : undefined}
      inert={!shown}
    >
      {children}
    </div>
  );
}
