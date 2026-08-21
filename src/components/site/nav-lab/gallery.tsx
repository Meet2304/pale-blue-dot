"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { MobileNav } from "./mobile-nav";
import { NAV_VARIANTS, useNavLab, type NavVariantId } from "./provider";

const EXPERIMENTS = NAV_VARIANTS.filter((variant) => variant.id !== "classic");

export function NavLabGallery() {
  const { variantId, setVariantId } = useNavLab();
  const activeId: NavVariantId = variantId === "classic" ? "dock" : variantId;
  const active =
    NAV_VARIANTS.find((variant) => variant.id === activeId) ?? EXPERIMENTS[0]!;

  return (
    <main id="content" className="hz-nav-lab">
      <header className="hz-nav-lab-head">
        <span className="hz-eyebrow">Exploration</span>
        <h1>
          Six ways a phone <em>could hold the sky</em>
        </h1>
        <p>
          The current mobile menu is a hamburger and a veil. These six are alternatives
          — five originals, and a sixth grown from the liquid-morph reference. They only
          replace the bar below 720px, after the warp. Desktop is untouched. Pick one,
          then pinch the window or open this on a phone.
        </p>
      </header>

      <div className="hz-nav-lab-layout">
        <ol className="hz-nav-lab-list">
          {EXPERIMENTS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="hz-nav-lab-card"
                data-active={item.id === activeId ? "true" : "false"}
                onClick={() => setVariantId(item.id)}
              >
                <span className="hz-nav-lab-num">
                  {String(item.n).padStart(2, "0")}
                </span>
                <span className="hz-nav-lab-copy">
                  <strong>{item.name}</strong>
                  <span>{item.blurb}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="hz-nav-lab-stage">
          <PhoneFrame variantId={activeId} />
          <p className="hz-nav-lab-caption">
            <strong>{active.name}.</strong> {active.blurb}
          </p>
          <p className="hz-nav-lab-hint">
            Tap the preview to open it. On a phone, the same design is already live on
            every page — the chip in the corner switches them.
          </p>
          <Link href={`/?nav=${activeId}`} className="hz-nav-lab-try">
            Try {active.short} after the warp
          </Link>
        </div>
      </div>
    </main>
  );
}

function PhoneFrame({ variantId }: { variantId: NavVariantId }) {
  const pathname = usePathname();

  return (
    <div className="hz-nav-lab-phone" data-variant={variantId}>
      <div className="hz-nav-lab-screen">
        <div className="hz-nav-lab-sky" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className="hz-nav-lab-star" />
          ))}
        </div>
        {variantId !== "liquid" && (
          <div className="hz-nav-lab-topbar">
            <span className="hz-nav-lab-mark">
              <i />
              Meet Bhatt
            </span>
          </div>
        )}
        <div className="hz-nav-lab-page">
          <span className="hz-eyebrow">The other side</span>
          <p className="hz-nav-lab-line">
            You came a long way <em>for a quiet room</em>
          </p>
          <hr className="hz-rule" />
          <p className="hz-nav-lab-note">
            Previewing {pathname === "/nav-lab" ? "the lab" : "this page"} at phone
            size. The control below is the real component.
          </p>
        </div>
        <MobileNav visible preview forceVariant={variantId} />
      </div>
    </div>
  );
}
