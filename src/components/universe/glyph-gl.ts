/**
 * Characters drawn in batches.
 *
 * Every body, the deep sky and Earth are set in thousands of characters.
 * Drawn one `fillText` at a time, a frame of them cost 15 to 60 ms, which
 * is what made scrolling stutter. Here each character is drawn once, white,
 * and kept; a layer's characters are then gathered (where, which, what
 * colour) and drawn together, and the result is put into the 2D canvas at
 * the point the characters belong, so whatever is drawn before and after
 * them stays in order.
 *
 * Two ways to draw a batch, behind one interface:
 *   - on the GPU: the characters in an atlas texture, one instanced WebGL2
 *     call, the result copied into the 2D canvas;
 *   - on the CPU: each character's coverage kept as a mask, the batch
 *     composited into pixels and put into the 2D canvas in one go.
 * The GPU is used where copying its result is cheap (Chrome, Safari);
 * in Firefox, where that copy is a readback, or where it turns out to be
 * one (copy-gauge.ts), or WebGL2 is missing or lost, the CPU draws instead.
 *
 * The output matches `fillText`: the same font, the same transform, the
 * same colours and alphas, composited source-over. Each character lands on
 * whole device pixels (at most half a pixel from where `fillText` would
 * put it). `?glyphs=text` draws with fillText, and `?glyphs=cpu` with the
 * CPU, to compare them.
 */

import { copiesWell, copyGauge } from "./copy-gauge";

export type Glyphs = {
  /** Start gathering characters for `g`, in `font`, under g's transform. */
  begin(g: CanvasRenderingContext2D, font: string): void;
  /** The colour (#rrggbb) and alpha of the characters added next. */
  color(hex: string, alpha: number): void;
  /** One character, centred on (x, y), as fillText with textAlign
      "center" and textBaseline "middle" would draw it. */
  add(ch: string, x: number, y: number): void;
  /** A square `size` px across, its top-left at (x, y), as fillRect would
      draw it: a star too small for a character. */
  dot(x: number, y: number, size: number): void;
  /** Draw everything gathered since `begin` into its canvas. */
  end(): void;
};

/**
 * Draw characters gathered into buckets, one colour and alpha per bucket,
 * in a batch where one can be drawn, with fillText where not.
 */
export function fillGlyphs(
  g: CanvasRenderingContext2D,
  font: string,
  buckets: number,
  colorOf: (b: number) => string,
  alphaOf: (b: number) => number,
  xs: number[][],
  ys: number[][],
  cs: string[][],
) {
  const batch = glyphs();
  if (batch) {
    batch.begin(g, font);
    for (let b = 0; b < buckets; b++) {
      const x = xs[b];
      if (!x.length) continue;
      batch.color(colorOf(b), alphaOf(b));
      const y = ys[b];
      const c = cs[b];
      for (let j = 0; j < x.length; j++) batch.add(c[j], x[j], y[j]);
    }
    batch.end();
    return;
  }
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let b = 0; b < buckets; b++) {
    const x = xs[b];
    if (!x.length) continue;
    g.fillStyle = colorOf(b);
    g.globalAlpha = alphaOf(b);
    const y = ys[b];
    const c = cs[b];
    for (let j = 0; j < x.length; j++) g.fillText(c[j], x[j], y[j]);
  }
  g.globalAlpha = 1;
}

/* The engines, made on first use. */
let gpu: Engine | null | undefined;
let cpu: Engine | null | undefined;

/** The batch drawer for this browser, or null to draw with fillText. */
export function glyphs(): Glyphs | null {
  if (typeof document === "undefined") return null;
  const q = location.search;
  if (q.includes("glyphs=text")) return null;
  if (gpu === undefined)
    gpu = q.includes("glyphs=cpu") || !copiesWell() ? null : tryMake(gpuBackend);
  if (gpu && !gpu.retired()) return gpu.api;
  if (cpu === undefined) cpu = tryMake(cpuBackend);
  return cpu?.api ?? null;
}

const tryMake = (backend: () => Backend<Sized> | null) => {
  try {
    const b = backend();
    return b ? engine(b) : null;
  } catch {
    return null;
  }
};

/* ------------------------------------------------------- The batches */

type Sized = { w: number; h: number };

/* A character, drawn white and centred on the scratch canvas (w × h px),
   for a backend to keep. */
type Raster = {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
};

type Backend<S extends Sized> = {
  /** Keep the character on the scratch canvas; null when full. */
  keep(r: Raster): S | null;
  /** Forget every character kept. */
  reset(): void;
  /** Draw `n` characters into `t`, within the box (device px). */
  draw(
    t: CanvasRenderingContext2D,
    n: number,
    pos: Float32Array,
    kept: S[],
    rgba: Uint8Array,
    box: [number, number, number, number],
  ): void;
  /** True once this backend should no longer be used. */
  retired(): boolean;
};

type Engine = { api: Glyphs; retired: () => boolean };

/* A dot's key: no character starts with NUL. */
const DOT = "\0";

function engine<S extends Sized>(backend: Backend<S>): Engine {
  const scratch = document.createElement("canvas");
  const sg = scratch.getContext("2d", { willReadFrequently: true })!;
  let fonts = new Map<string, Map<string, S>>();
  const reset = () => {
    fonts = new Map();
    backend.reset();
  };
  /* Characters drawn before the type arrived are in a stand-in font. */
  document.fonts?.addEventListener?.("loadingdone", reset);

  /* Draw a character on the scratch canvas, sized to it: symmetric about
     its anchor, so the scratch's centre is fillText's. */
  const raster = (ch: string, font: string, scale: number): Raster => {
    const dot = ch[0] === DOT ? parseFloat(ch.slice(1)) : 0;
    let hw: number;
    let hh: number;
    if (dot) hw = hh = Math.ceil((dot * scale) / 2) + 1;
    else {
      sg.setTransform(1, 0, 0, 1, 0, 0);
      sg.font = font;
      const m = sg.measureText(ch);
      hw =
        Math.ceil(
          Math.max(m.actualBoundingBoxLeft, m.actualBoundingBoxRight, 0.5) * scale,
        ) + 1;
      hh =
        Math.ceil(
          Math.max(m.actualBoundingBoxAscent, m.actualBoundingBoxDescent, 0.5) * scale,
        ) + 1;
    }
    /* Resizing clears the scratch canvas and resets its state. */
    scratch.width = hw * 2;
    scratch.height = hh * 2;
    sg.setTransform(scale, 0, 0, scale, hw, hh);
    sg.fillStyle = "#fff";
    if (dot) sg.fillRect(-dot / 2, -dot / 2, dot, dot);
    else {
      sg.font = font;
      sg.textAlign = "center";
      sg.textBaseline = "middle";
      sg.fillText(ch, 0, 0);
    }
    return { canvas: scratch, g: sg, w: hw * 2, h: hh * 2 };
  };

  /* The characters gathered for the current layer. */
  let cap = 4096;
  let pos = new Float32Array(cap * 2);
  let rgba = new Uint8Array(cap * 4);
  const kept: S[] = [];
  let n = 0;
  const grow = () => {
    cap *= 2;
    const p = new Float32Array(cap * 2);
    p.set(pos);
    pos = p;
    const c = new Uint8Array(cap * 4);
    c.set(rgba);
    rgba = c;
  };

  let target: CanvasRenderingContext2D | null = null;
  let font = "";
  let key = "";
  let chars = new Map<string, S>();
  let scale = 1;
  let ma = 1;
  let mb = 0;
  let mc = 0;
  let md = 1;
  let me = 0;
  let mf = 0;
  let tw = 0;
  let th = 0;
  let r = 255;
  let gr = 255;
  let b = 255;
  let a = 255;
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;
  const hexes = new Map<string, number>();

  const keptOf = (ch: string): S | null => {
    const have = chars.get(ch);
    if (have) return have;
    let s = backend.keep(raster(ch, font, scale));
    if (!s) {
      /* Full: draw what refers to the old characters, then start again. */
      flush();
      reset();
      fonts.set(key, (chars = new Map()));
      s = backend.keep(raster(ch, font, scale));
      if (!s) return null;
    }
    chars.set(ch, s);
    return s;
  };

  function flush() {
    if (target && n) {
      const box: [number, number, number, number] = [
        Math.max(0, Math.floor(x0)),
        Math.max(0, Math.floor(y0)),
        Math.min(tw, Math.ceil(x1)),
        Math.min(th, Math.ceil(y1)),
      ];
      if (box[2] > box[0] && box[3] > box[1])
        backend.draw(target, n, pos, kept, rgba, box);
    }
    n = 0;
    x0 = y0 = Infinity;
    x1 = y1 = -Infinity;
  }

  function add(ch: string, x: number, y: number) {
    if (!a) return;
    const X = ma * x + mc * y + me;
    const Y = mb * x + md * y + mf;
    if (X < -32 || Y < -32 || X > tw + 32 || Y > th + 32) return;
    const s = keptOf(ch);
    if (!s) return;
    if (n === cap) grow();
    const px = Math.round(X - s.w / 2);
    const py = Math.round(Y - s.h / 2);
    pos[n * 2] = px;
    pos[n * 2 + 1] = py;
    kept[n] = s;
    const k = n * 4;
    rgba[k] = r;
    rgba[k + 1] = gr;
    rgba[k + 2] = b;
    rgba[k + 3] = a;
    if (px < x0) x0 = px;
    if (py < y0) y0 = py;
    if (px + s.w > x1) x1 = px + s.w;
    if (py + s.h > y1) y1 = py + s.h;
    n++;
  }

  const api: Glyphs = {
    begin(g, f) {
      target = g;
      font = f;
      const m = g.getTransform();
      ma = m.a;
      mb = m.b;
      mc = m.c;
      md = m.d;
      me = m.e;
      mf = m.f;
      scale = Math.hypot(m.a, m.b);
      tw = g.canvas.width;
      th = g.canvas.height;
      key = `${font}@${scale.toFixed(4)}`;
      let fs = fonts.get(key);
      if (!fs) fonts.set(key, (fs = new Map()));
      chars = fs;
      n = 0;
      x0 = y0 = Infinity;
      x1 = y1 = -Infinity;
    },
    color(hex, alpha) {
      let v = hexes.get(hex);
      if (v === undefined) {
        v = parseInt(hex.slice(1, 7), 16);
        hexes.set(hex, v);
      }
      r = (v >> 16) & 255;
      gr = (v >> 8) & 255;
      b = v & 255;
      a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    },
    add,
    dot(x, y, size) {
      add(DOT + size, x + size / 2, y + size / 2);
    },
    end() {
      flush();
      target = null;
    },
  };
  return { api, retired: () => backend.retired() };
}

/* ------------------------------------------------------------ On the GPU */

const ATLAS = 2048;

const VS = `#version 300 es
in vec2 corner;
in vec2 pos;
in vec4 slot;
in vec4 color;
uniform vec2 view;
uniform float atlas;
out vec2 uv;
out vec4 tint;
void main() {
  vec2 p = (pos + corner * slot.zw) / view * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  uv = (slot.xy + corner * slot.zw) / atlas;
  tint = color;
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 uv;
in vec4 tint;
uniform sampler2D tex;
out vec4 o;
void main() {
  float a = texture(tex, uv).a * tint.a;
  o = vec4(tint.rgb * a, a);
}`;

/* Where a character sits in the atlas, in its pixels. */
type Slot = Sized & { u: number; v: number };

function gpuBackend(): Backend<Slot> | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!ctx) return null;
  const gl: WebGL2RenderingContext = ctx;

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("glyph shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("glyph program");
  gl.useProgram(prog);
  const uView = gl.getUniformLocation(prog, "view");
  gl.uniform1f(gl.getUniformLocation(prog, "atlas"), ATLAS);

  gl.bindVertexArray(gl.createVertexArray());
  const attr = (
    name: string,
    size: number,
    type: number,
    normalized: boolean,
    divisor: number,
  ) => {
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const at = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, size, type, normalized, 0, 0);
    gl.vertexAttribDivisor(at, divisor);
    return buf;
  };
  attr("corner", 2, gl.FLOAT, false, 0);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const posBuf = attr("pos", 2, gl.FLOAT, false, 1);
  const slotBuf = attr("slot", 4, gl.UNSIGNED_SHORT, false, 1);
  const colorBuf = attr("color", 4, gl.UNSIGNED_BYTE, true, 1);

  /* The atlas: every character met so far, packed in shelves, on the GPU.
     Each new character sends only its own few pixels: sending the whole
     atlas (16 MB) at each new one held up the frames in which new bodies
     came into view. Old characters are left in it: each new one covers
     its whole slot, clear pixels and all. */
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, ATLAS, ATLAS);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(0, 0, 0, 0);

  let shelf = { x: 0, y: 0, h: 0 };
  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
  });
  const gauge = copyGauge();
  let slots = new Uint16Array(4096 * 4);

  return {
    keep({ canvas: src, w, h }) {
      if (shelf.x + w > ATLAS) shelf = { x: 0, y: shelf.y + shelf.h, h: 0 };
      if (shelf.y + h > ATLAS) return null;
      const s = { u: shelf.x, v: shelf.y, w, h };
      shelf.x += w;
      shelf.h = Math.max(shelf.h, h);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, s.u, s.v, gl.RGBA, gl.UNSIGNED_BYTE, src);
      return s;
    },
    reset() {
      shelf = { x: 0, y: 0, h: 0 };
    },
    draw(t, n, pos, kept, rgba, [bx0, by0, bx1, by1]) {
      if (lost) return;
      const tw = t.canvas.width;
      const th = t.canvas.height;
      if (canvas.width < tw || canvas.height < th) {
        canvas.width = Math.max(canvas.width, tw);
        canvas.height = Math.max(canvas.height, th);
      }
      if (slots.length < n * 4) slots = new Uint16Array(n * 8);
      for (let i = 0; i < n; i++) {
        const s = kept[i];
        slots[i * 4] = s.u;
        slots[i * 4 + 1] = s.v;
        slots[i * 4 + 2] = s.w;
        slots[i * 4 + 3] = s.h;
      }
      const H = canvas.height;
      gl.viewport(0, H - th, tw, th);
      gl.uniform2f(uView, tw, th);
      gl.scissor(bx0, H - by1, bx1 - bx0, by1 - by0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pos.subarray(0, n * 2), gl.STREAM_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, slotBuf);
      gl.bufferData(gl.ARRAY_BUFFER, slots.subarray(0, n * 4), gl.STREAM_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
      gl.bufferData(gl.ARRAY_BUFFER, rgba.subarray(0, n * 4), gl.STREAM_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      t.save();
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.globalAlpha = 1;
      gauge.time(() =>
        t.drawImage(
          canvas,
          bx0,
          by0,
          bx1 - bx0,
          by1 - by0,
          bx0,
          by0,
          bx1 - bx0,
          by1 - by0,
        ),
      );
      t.restore();
    },
    retired: () => lost || gauge.slow,
  };
}

/* ------------------------------------------------------------ On the CPU */

/* A character's coverage, 0 to 255 a pixel. */
type Mask = Sized & { a: Uint8Array };

function cpuBackend(): Backend<Mask> {
  /* Where a batch's pixels are put, to be drawn into the target. */
  const out = document.createElement("canvas");
  const og = out.getContext("2d")!;
  let buf = new Uint8ClampedArray(0);

  return {
    keep({ g, w, h }) {
      const px = g.getImageData(0, 0, w, h).data;
      const a = new Uint8Array(w * h);
      for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3];
      return { w, h, a };
    },
    reset() {},
    draw(t, n, pos, kept, rgba, [bx0, by0, bx1, by1]) {
      const bw = bx1 - bx0;
      const bh = by1 - by0;
      const size = bw * bh * 4;
      if (buf.length < size) buf = new Uint8ClampedArray(size * 1.5);
      const d = buf.subarray(0, size);
      d.fill(0);
      /* Source-over, in the unpremultiplied colour ImageData holds. */
      for (let i = 0; i < n; i++) {
        const m = kept[i];
        const ox = pos[i * 2] - bx0;
        const oy = pos[i * 2 + 1] - by0;
        const k4 = i * 4;
        const r = rgba[k4];
        const g = rgba[k4 + 1];
        const b = rgba[k4 + 2];
        const a = rgba[k4 + 3];
        const ya = Math.max(0, -oy);
        const yb = Math.min(m.h, bh - oy);
        const xa = Math.max(0, -ox);
        const xb = Math.min(m.w, bw - ox);
        for (let y = ya; y < yb; y++) {
          let k = ((oy + y) * bw + ox + xa) * 4;
          let j = y * m.w + xa;
          for (let x = xa; x < xb; x++, k += 4, j++) {
            const c = m.a[j];
            if (!c) continue;
            const sa = (c * a) / 65025;
            const da = d[k + 3];
            if (!da) {
              d[k] = r;
              d[k + 1] = g;
              d[k + 2] = b;
              d[k + 3] = sa * 255;
              continue;
            }
            const dA = (da / 255) * (1 - sa);
            const oA = sa + dA;
            d[k] = (r * sa + d[k] * dA) / oA;
            d[k + 1] = (g * sa + d[k + 1] * dA) / oA;
            d[k + 2] = (b * sa + d[k + 2] * dA) / oA;
            d[k + 3] = oA * 255;
          }
        }
      }
      if (out.width < bw || out.height < bh) {
        out.width = Math.max(out.width, bw);
        out.height = Math.max(out.height, bh);
      }
      og.putImageData(new ImageData(d, bw, bh), 0, 0);
      t.save();
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.globalAlpha = 1;
      t.drawImage(out, 0, 0, bw, bh, bx0, by0, bw, bh);
      t.restore();
    },
    retired: () => false,
  };
}
