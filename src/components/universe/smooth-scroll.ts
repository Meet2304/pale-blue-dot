/**
 * The universe's scroll, smoothed. Nothing is held back: the page goes
 * wherever, and as fast as, the visitor scrolls.
 *
 * The wheel doesn't move the page itself; it moves where the page is
 * headed, and every frame the page eases a little further there, so the
 * steps of a wheel become one glide and the camera never jumps. A finger
 * keeps the phone's own scrolling, momentum and all. The arrow keys, Page
 * Up and Down and Space step a chapter at a time while the universe is on
 * screen. Under reduced motion nothing is eased.
 */

export type SmoothScroll = {
  /** An eased glide to a position (the menus, the index). */
  glideTo(top: number): void;
  destroy(): void;
};

/* Whether a wheel over `target` scrolls something of its own (a menu's
   list), rather than the page. */
const scrollsItself = (target: EventTarget | null) => {
  for (
    let n = target instanceof Element ? target : null;
    n && n !== document.body && n !== document.documentElement;
    n = n.parentElement
  ) {
    const y = getComputedStyle(n).overflowY;
    if ((y === "auto" || y === "scroll") && n.scrollHeight > n.clientHeight + 1)
      return true;
  }
  return false;
};

/* Something open over the page (an enlarged picture, the menu) has the
   input to itself. */
const covered = () =>
  !!document.querySelector('[aria-modal="true"], #drawer[data-open="true"]');

/* How quickly the page closes on where it is headed, per second. */
const EASE = 9;

export function createSmoothScroll({
  stops,
}: {
  /** Where each chapter sits (px from the top), in order, for the keys. */
  stops: () => number[];
}): SmoothScroll {
  const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let pos = window.scrollY;
  let target = pos;
  let raf = 0;
  let last = 0;
  let lastSet = pos;
  let glide: { from: number; to: number; t0: number; dur: number } | null = null;

  const bottom = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const clamp = (t: number) => Math.max(0, Math.min(bottom(), t));

  const wake = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  function frame(now: number) {
    raf = 0;
    /* A frame's time can be a little before the moment it was asked for. */
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (glide) {
      const k = Math.min(1, (now - glide.t0) / glide.dur);
      const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      pos = glide.from + (glide.to - glide.from) * e;
      target = pos;
      if (k >= 1) glide = null;
    } else if (quiet) pos = target;
    else {
      pos += (target - pos) * (1 - Math.exp(-dt * EASE));
      if (Math.abs(target - pos) < 0.4) pos = target;
    }
    window.scrollTo(0, pos);
    lastSet = pos;
    if (glide || pos !== target) raf = requestAnimationFrame(frame);
  }

  const headTo = (t: number) => {
    glide = null;
    target = clamp(t);
    wake();
  };

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.defaultPrevented || covered() || scrollsItself(e.target)) return;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 40;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    if (Math.abs(e.deltaX) > Math.abs(dy)) return;
    e.preventDefault();
    headTo((glide ? pos : target) + dy);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || covered()) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest("input, textarea, select, [contenteditable]")) return;
    let step = 0;
    if (e.key === "ArrowDown" || e.key === "PageDown") step = e.shiftKey ? 0 : 1;
    else if (e.key === "ArrowUp" || e.key === "PageUp") step = e.shiftKey ? 0 : -1;
    else if (e.key === " " && !el?.closest("button, a, summary"))
      step = e.shiftKey ? -1 : 1;
    if (!step) return;
    const st = stops();
    const from = glide ? glide.to : target;
    /* In the foot, below the last chapter, the keys scroll as usual. */
    if (from > st[st.length - 1] + window.innerHeight * 0.5) return;
    e.preventDefault();
    let i = 0;
    st.forEach((p, k) => {
      if (Math.abs(p - from) < Math.abs(st[i] - from)) i = k;
    });
    headTo(st[Math.max(0, Math.min(st.length - 1, i + step))]);
  };

  /* Moved some other way (a finger, the scrollbar, Home and End, the
     browser putting the page back): pick up from there. */
  const onScroll = () => {
    if (Math.abs(window.scrollY - lastSet) < 2 || glide) return;
    cancelAnimationFrame(raf);
    raf = 0;
    pos = target = lastSet = window.scrollY;
  };

  /* The page's position is ours: the browser's scroll anchoring, nudging
     it as things above change size, would only be eased back out. */
  const root = document.documentElement;
  const anchor = root.style.overflowAnchor;
  root.style.overflowAnchor = "none";

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    glideTo(top: number) {
      const to = clamp(top);
      if (quiet) {
        headTo(to);
        return;
      }
      const span = Math.abs(to - pos) / window.innerHeight;
      glide = {
        from: pos,
        to,
        t0: performance.now(),
        dur: Math.min(1100, 520 + span * 300),
      };
      wake();
    },
    destroy() {
      root.style.overflowAnchor = anchor;
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    },
  };
}
