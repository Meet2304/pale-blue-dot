"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const NAV_VARIANTS = [
  {
    id: "classic",
    n: 0,
    name: "Classic",
    short: "Now",
    hidesTopBar: false,
    blurb:
      "The current hamburger and full-screen veil — here so the experiments have something to stand next to.",
  },
  {
    id: "dock",
    n: 1,
    name: "Horizon Dock",
    short: "Dock",
    hidesTopBar: false,
    blurb:
      "A floating glass dock. The active page wears a sliding blue pill, so you always know where you are without opening anything.",
  },
  {
    id: "orbit",
    n: 2,
    name: "Orbital Fan",
    short: "Orbit",
    hidesTopBar: false,
    blurb:
      "One pale-blue-dot button. Tap it and the destinations swing out along an arc, like a tiny constellation unfolding from the corner.",
  },
  {
    id: "island",
    n: 3,
    name: "Magnetic Island",
    short: "Island",
    hidesTopBar: false,
    blurb:
      "A compact island that knows the current page. Tap and it springs open into a stacked list — same object, bigger job.",
  },
  {
    id: "sheet",
    n: 4,
    name: "Star Sheet",
    short: "Sheet",
    hidesTopBar: false,
    blurb:
      "A handle at the bottom of the sky. Pull it up (or tap) for large type you can read with a thumb, then swipe it away.",
  },
  {
    id: "warp",
    n: 5,
    name: "Warp Veil",
    short: "Warp",
    hidesTopBar: false,
    blurb:
      "The menu arrives the way the site does: a circle opens from the trigger and the links come in from far away.",
  },
  {
    id: "liquid",
    n: 6,
    name: "Liquid Morph",
    short: "Liquid",
    hidesTopBar: true,
    blurb:
      "A floating pill that melts into a large rounded card. Gooey on purpose — the sixth design, from the reference.",
  },
] as const;

export type NavVariantId = (typeof NAV_VARIANTS)[number]["id"];

export type NavVariant = (typeof NAV_VARIANTS)[number];

const STORAGE_KEY = "hz-nav-lab-variant";
const CHANGE_EVENT = "hz-nav-lab";
const DEFAULT_VARIANT: NavVariantId = "classic";

function isVariantId(value: string | null): value is NavVariantId {
  return NAV_VARIANTS.some((variant) => variant.id === value);
}

function variantById(id: NavVariantId): NavVariant {
  const found = NAV_VARIANTS.find((variant) => variant.id === id);
  return found ?? NAV_VARIANTS[0];
}

function readVariantId(): NavVariantId {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("nav");
  if (isVariantId(fromQuery)) return fromQuery;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (isVariantId(stored)) return stored;
  return DEFAULT_VARIANT;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

type NavLabContextValue = {
  variant: NavVariant;
  variantId: NavVariantId;
  setVariantId: (id: NavVariantId) => void;
};

const NavLabContext = createContext<NavLabContextValue | null>(null);

export function NavLabProvider({ children }: { children: ReactNode }) {
  const variantId = useSyncExternalStore(
    subscribe,
    readVariantId,
    () => DEFAULT_VARIANT,
  );

  useEffect(() => {
    document.documentElement.dataset.navVariant = variantId;
  }, [variantId]);

  const setVariantId = useCallback((id: NavVariantId) => {
    window.sessionStorage.setItem(STORAGE_KEY, id);
    const url = new URL(window.location.href);
    if (id === DEFAULT_VARIANT) url.searchParams.delete("nav");
    else url.searchParams.set("nav", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo<NavLabContextValue>(
    () => ({
      variant: variantById(variantId),
      variantId,
      setVariantId,
    }),
    [variantId, setVariantId],
  );

  return <NavLabContext.Provider value={value}>{children}</NavLabContext.Provider>;
}

export function useNavLab(): NavLabContextValue {
  const context = useContext(NavLabContext);
  if (!context) {
    throw new Error("useNavLab must be used inside NavLabProvider");
  }
  return context;
}
