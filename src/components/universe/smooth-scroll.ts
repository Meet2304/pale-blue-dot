/**
 * The universe's scroll. The wheel, a trackpad and a finger are the
 * browser's own: it scrolls on the compositor, off the main thread, so the
 * page moves at the screen's full rate however busy a frame is, and the
 * browser already smooths a wheel's notches. (Easing the wheel here, frame
 * by frame, tied the page to the main thread: when a frame ran long, the
 * page stood still, then jumped.) The arrow keys, Page Up and Down and
 * Space step a chapter at a time while the universe is on screen, and the
 * menus and the index glide to a chapter. Under reduced motion nothing is
 * eased.
 */

export type SmoothScroll = {
  /** An eased glide to a position (the menus, the index). */
  glideTo(top: number): void;
  destroy(): void;
};

/* Something open over the page (an enlarged picture, the menu) has the
   input to itself. */
const covered = () =>
  !!document.querySelector('[aria-modal="true"], #drawer[data-open="true"]');

export function createSmoothScroll({
  stops,
}: {
  /** Where each chapter sits (px from the top), in order, for the keys. */
  stops: () => number[];
}): SmoothScroll {
  const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0;
  let glide: { from: number; to: number; t0: number; dur: number } | null = null;

  const bottom = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const clamp = (t: number) => Math.max(0, Math.min(bottom(), t));

  function frame(now: number) {
    raf = 0;
    if (!glide) return;
    const k = Math.max(0, Math.min(1, (now - glide.t0) / glide.dur));
    const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
    window.scrollTo(0, glide.from + (glide.to - glide.from) * e);
    if (k >= 1) glide = null;
    else raf = requestAnimationFrame(frame);
  }

  const glideTo = (top: number) => {
    const to = clamp(top);
    const from = window.scrollY;
    cancelAnimationFrame(raf);
    raf = 0;
    if (quiet || Math.abs(to - from) < 1) {
      glide = null;
      window.scrollTo(0, to);
      return;
    }
    const span = Math.abs(to - from) / window.innerHeight;
    glide = { from, to, t0: performance.now(), dur: Math.min(1100, 520 + span * 300) };
    raf = requestAnimationFrame(frame);
  };

  /* The visitor takes the page back mid-glide: it stops where it is. */
  const cancel = () => {
    if (!glide) return;
    glide = null;
    cancelAnimationFrame(raf);
    raf = 0;
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
    const from = glide ? glide.to : window.scrollY;
    /* In the foot, below the last chapter, the keys scroll as usual. */
    if (from > st[st.length - 1] + window.innerHeight * 0.5) return;
    e.preventDefault();
    let i = 0;
    st.forEach((p, k) => {
      if (Math.abs(p - from) < Math.abs(st[i] - from)) i = k;
    });
    glideTo(st[Math.max(0, Math.min(st.length - 1, i + step))]);
  };

  /* The page's position is ours: the browser's scroll anchoring, nudging
     it as things above change size, would only fight a glide. */
  const root = document.documentElement;
  const anchor = root.style.overflowAnchor;
  root.style.overflowAnchor = "none";

  const opts = { passive: true } as const;
  window.addEventListener("keydown", onKey);
  window.addEventListener("wheel", cancel, opts);
  window.addEventListener("touchstart", cancel, opts);
  window.addEventListener("pointerdown", cancel, opts);

  return {
    glideTo,
    destroy() {
      root.style.overflowAnchor = anchor;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("pointerdown", cancel);
    },
  };
}
