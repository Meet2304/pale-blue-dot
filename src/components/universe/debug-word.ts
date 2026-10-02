import s from "./debug-word.module.css";

/**
 * What "Engineer." in the hero does when pointed at: an engineer fixing a
 * bug. Two of its letters glitch into a typo, underlined in red the way an
 * editor marks an error; a caret jumps to each and patches it, and the word
 * signs off "✓ fixed". It lays its pieces over the word and takes them
 * away again, and returns how long it takes (ms). The word's letters are
 * the headline's own ([data-ch], each holding its letter as its first
 * child).
 */

const lettersOf = (word: HTMLElement) => [
  ...word.querySelectorAll<HTMLElement>("[data-ch]"),
];
const inner = (ch: HTMLElement) => ch.firstElementChild as HTMLElement;
const emOf = (word: HTMLElement) => parseFloat(getComputedStyle(word).fontSize) || 48;
const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);

function overlay(
  word: HTMLElement,
  className: string,
  style: Partial<CSSStyleDeclaration>,
) {
  const el = document.createElement("span");
  el.className = className;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, style);
  word.appendChild(el);
  return el;
}

/* Where the word's baseline is, from its top (px). */
function baselineOf(word: HTMLElement) {
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  word.appendChild(probe);
  const y = probe.getBoundingClientRect().top - word.getBoundingClientRect().top;
  probe.remove();
  return y;
}

/* How tall a letter of the word's own face stands above the baseline. */
function heightOf(word: HTMLElement, c: string) {
  const g = document.createElement("canvas").getContext("2d");
  if (!g) return 0;
  const cs = getComputedStyle(word);
  g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return g.measureText(c).actualBoundingBoxAscent;
}

export function debugWord(word: HTMLElement) {
  const D = 1800;
  const em = emOf(word);
  const box = word.getBoundingClientRect();
  const letters = lettersOf(word);
  const text = letters.map((l) => inner(l).textContent ?? "");
  /* Two typos: the first "i" and the last "e", or the nearest letters. */
  const bad = [
    { at: Math.max(0, text.indexOf("i")), to: "1" },
    { at: Math.max(1, text.lastIndexOf("e")), to: "3" },
  ];
  const red = "#f0a58a";
  bad.forEach(({ at, to }) => {
    const el = inner(letters[at]);
    el.textContent = to;
    el.style.color = red;
  });
  /* A squiggle under the word, as an editor marks an error. */
  const base = baselineOf(word);
  const svgNS = "http://www.w3.org/2000/svg";
  const W = box.width;
  const squiggle = document.createElementNS(svgNS, "svg");
  squiggle.setAttribute("class", `${s.over} ${s.squiggle}`);
  squiggle.setAttribute("aria-hidden", "true");
  squiggle.setAttribute("viewBox", `0 0 ${W} 10`);
  squiggle.setAttribute("preserveAspectRatio", "none");
  Object.assign(squiggle.style, {
    left: "0",
    top: `${base + 0.1 * em}px`,
    width: `${W}px`,
  });
  const step = Math.max(6, em * 0.12);
  let d = "M0 5";
  for (let x = 0; x < W; x += step)
    d += ` q${step / 4} -4 ${step / 2} 0 t${step / 2} 0`;
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", red);
  path.setAttribute("stroke-width", "1.5");
  squiggle.appendChild(path);
  word.appendChild(squiggle);
  squiggle.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, fill: "both" });

  const caret = overlay(word, `${s.over} ${s.caret}`, {
    top: `${base - heightOf(word, "E") - 0.04 * em}px`,
    height: `${heightOf(word, "E") + 0.1 * em}px`,
    opacity: "0",
  });
  const caretTo = (at: number) => {
    const r = letters[at].getBoundingClientRect();
    caret.style.left = `${r.right - box.left + 1}px`;
    caret.style.opacity = "1";
  };
  const patch = (at: number) => {
    const el = inner(letters[at]);
    el.textContent = text[at];
    el.style.color = "";
    el.animate([{ color: "#92cbfb" }, { color: "currentcolor" }], { duration: 500 });
  };
  later(380, () => caretTo(bad[0].at));
  later(620, () => patch(bad[0].at));
  later(820, () => caretTo(bad[1].at));
  later(1060, () => {
    patch(bad[1].at);
    squiggle.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "both" });
  });
  later(1200, () => {
    caret.style.opacity = "0";
    const done = overlay(word, s.label, {
      left: `${W + 0.12 * em}px`,
      top: `${base - 0.2 * em}px`,
    });
    done.textContent = "✓ fixed";
    done.animate(
      [
        { opacity: 0, transform: "translateY(4px)" },
        { opacity: 1, transform: "none", offset: 0.25 },
        { opacity: 1, offset: 0.7 },
        { opacity: 0 },
      ],
      { duration: D - 1200, fill: "both" },
    );
    later(D - 1200, () => done.remove());
  });
  later(D, () => {
    /* However it went, the word ends as it began. */
    letters.forEach((l, i) => {
      inner(l).textContent = text[i];
      inner(l).style.color = "";
    });
    caret.remove();
    squiggle.remove();
  });
  return D;
}
