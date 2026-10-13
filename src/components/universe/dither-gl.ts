/**
 * The deep sky's glow (cosmos.ts, drawDither), worked out by the GPU.
 *
 * The glow is an ordered dither: every dot on a fine screen grid reads the
 * sky's light through the camera, picks a colour, and switches on in one of
 * a few strengths. Done in JavaScript that is a loop over some 150,000 dots,
 * every time the camera moves, which cost most of a frame. Here it is one
 * fragment shader over the same grid, doing the same sums (the light read
 * between four texels, the Bayer threshold, each patch's breath, the
 * sparkle's integer hash, the stir), into a small image that cosmos.ts then
 * draws exactly as it drew its own. Where WebGL2 is missing or lost, or
 * copying the image out is a readback (copy-gauge.ts), `ditherGL()`
 * returns null and cosmos.ts works the dots out itself.
 */

import { copiesWell, copyGauge } from "./copy-gauge";

const VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
uniform sampler2D uI;
uniform usampler2D uCP;
uniform sampler2D uF;
uniform ivec2 uSize;
uniform ivec2 uGrid;
uniform vec2 uF0;
uniform float uScale;
uniform float uD;
uniform float uBreath[64];
uniform vec3 uRGB[8];
uniform int uTick;
uniform bool uCalm;
uniform bool uHasBox;
uniform vec4 uBox;
uniform vec3 uStir;
uniform float uStirR;
uniform float uLens;
uniform float uCell;
uniform ivec2 uFSize;
out vec4 o;

const float BAYER[16] = float[16](
  0.03125, 0.53125, 0.15625, 0.65625,
  0.78125, 0.28125, 0.90625, 0.40625,
  0.21875, 0.71875, 0.09375, 0.59375,
  0.96875, 0.46875, 0.84375, 0.34375);

float ihash(uint x, uint y, uint e) {
  uint h = x * 374761393u + y * 668265263u + e * 2246822519u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  return float(h ^ (h >> 16u)) / 4294967296.0;
}

void main() {
  int px = int(gl_FragCoord.x);
  int py = uGrid.y - 1 - int(gl_FragCoord.y);
  float X = (float(px) + 0.5) * uD;
  float Y = (float(py) + 0.5) * uD;

  /* The stir (cosmos.ts, stirAt). */
  float e = 0.0;
  float ox = 0.0;
  float oy = 0.0;
  if (uHasBox && X >= uBox.x && X <= uBox.z && Y >= uBox.y && Y <= uBox.w) {
    if (uStir.z > 0.0) {
      float dx = X - uStir.x;
      float dy = Y - uStir.y;
      float r2 = (dx * dx + dy * dy) / (uStirR * uStirR);
      if (r2 < 2.9) {
        float gauss = exp(-r2);
        e = uStir.z * gauss * 0.75;
        float push = (uLens * 2.33 * gauss * uStir.z) / uStirR;
        ox = dx * push;
        oy = dy * push;
      }
    }
    float sfx = X / uCell - 0.5;
    float sfy = Y / uCell - 0.5;
    int sx = int(floor(sfx));
    int sy = int(floor(sfy));
    if (sx >= 0 && sy >= 0 && sx < uFSize.x - 1 && sy < uFSize.y - 1) {
      float tx = sfx - float(sx);
      float ty = sfy - float(sy);
      float f00 = texelFetch(uF, ivec2(sx, sy), 0).r;
      float f10 = texelFetch(uF, ivec2(sx + 1, sy), 0).r;
      float f01 = texelFetch(uF, ivec2(sx, sy + 1), 0).r;
      float f11 = texelFetch(uF, ivec2(sx + 1, sy + 1), 0).r;
      float a = f00 + (f10 - f00) * tx;
      float b = f01 + (f11 - f01) * tx;
      e += (a + (b - a) * ty) * 0.8;
    }
    e = min(1.0, e);
  }

  float fx = uF0.x + (float(px) - ox / uD) * uScale;
  float fy = uF0.y + (float(py) - oy / uD) * uScale;
  int ix = int(floor(fx));
  int iy = int(floor(fy));
  if (ix < 0 || ix >= uSize.x - 1 || iy < 0 || iy >= uSize.y - 1) discard;
  float tx = fx - float(ix);
  float ty = fy - float(iy);
  float i00 = texelFetch(uI, ivec2(ix, iy), 0).r;
  float i10 = texelFetch(uI, ivec2(ix + 1, iy), 0).r;
  float i01 = texelFetch(uI, ivec2(ix, iy + 1), 0).r;
  float i11 = texelFetch(uI, ivec2(ix + 1, iy + 1), 0).r;
  float a = i00 + (i10 - i00) * tx;
  float b = i01 + (i11 - i01) * tx;
  float v0 = a + (b - a) * ty;
  if (v0 < 0.03) discard;
  float thr = BAYER[(py & 3) * 4 + (px & 3)];
  ivec2 ci = ivec2(ix + (tx > thr ? 1 : 0), iy + (ty > 1.0 - thr ? 1 : 0));
  uvec2 cp = texelFetch(uCP, ci, 0).rg;
  float v = v0 * uBreath[cp.y] * (1.0 + e * 0.7);
  float wob = uCalm
    ? 0.0
    : (ihash(uint(px), uint(py), uint(uTick + ((px * 7 + py * 13) & 3))) - 0.5) *
      0.3 * (1.0 + e * 2.0);
  int q = min(3, int(floor(v * (0.45 + 0.55 * v) * 3.1 + thr + wob)));
  if (q <= 0) discard;
  /* The strengths as the CPU's ImageData stored them (0.13, 0.25, 0.4 of
     255, rounded). */
  float lv = q == 1 ? 33.0 / 255.0 : q == 2 ? 64.0 / 255.0 : 102.0 / 255.0;
  o = vec4(uRGB[cp.x] * lv, lv);
}`;

export type DitherSky = {
  /** Light per texel, cols × rows. */
  I: Float32Array;
  /** Colour index per texel. */
  col: Uint8Array;
  /** Breath phase per texel, 0 to 63. */
  ph: Uint8Array;
  cols: number;
  rows: number;
  /** Changes when the sky does (it is built once a visit). */
  version: number;
};

export type DitherFrame = {
  gw: number;
  gh: number;
  fx0: number;
  fy0: number;
  scale: number;
  D: number;
  calm: boolean;
  tick: number;
  breath: Float32Array;
  palette: readonly (readonly [number, number, number])[];
  stir: {
    box: { x0: number; y0: number; x1: number; y1: number } | null;
    x: number;
    y: number;
    on: number;
    R: number;
    lens: number;
    cell: number;
    f: Float32Array;
    cols: number;
    rows: number;
  };
};

export type DitherGL = {
  /** Draw the glow for this frame; returns the image, gw × gh. */
  draw(sky: DitherSky, f: DitherFrame): HTMLCanvasElement | null;
  /** Copy the image into the page's canvas, timed (copy-gauge.ts): where
      that copy is a readback, the CPU draws the glow from then on. */
  copy(copy: () => void): void;
};

let engine: DitherGL | null | undefined;

export function ditherGL(): DitherGL | null {
  if (engine !== undefined) return engine;
  if (typeof document === "undefined") return null;
  if (/glyphs=(text|cpu)/.test(location.search) || !copiesWell())
    return (engine = null);
  try {
    engine = create();
  } catch {
    engine = null;
  }
  return engine;
}

function create(): DitherGL | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!ctx) return null;
  const gl: WebGL2RenderingContext = ctx;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("dither shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("dither program");
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray());
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const U = {
    I: u("uI"),
    CP: u("uCP"),
    F: u("uF"),
    size: u("uSize"),
    grid: u("uGrid"),
    f0: u("uF0"),
    scale: u("uScale"),
    D: u("uD"),
    breath: u("uBreath"),
    rgb: u("uRGB"),
    tick: u("uTick"),
    calm: u("uCalm"),
    hasBox: u("uHasBox"),
    box: u("uBox"),
    stir: u("uStir"),
    stirR: u("uStirR"),
    lens: u("uLens"),
    cell: u("uCell"),
    fSize: u("uFSize"),
  };
  gl.uniform1i(U.I, 0);
  gl.uniform1i(U.CP, 1);
  gl.uniform1i(U.F, 2);

  const texture = (unit: number) => {
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const texI = texture(0);
  const texCP = texture(1);
  const texF = texture(2);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.clearColor(0, 0, 0, 0);

  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    engine = null;
  });

  const gauge = copyGauge();
  let version = -1;
  let paletteSet = false;
  const empty = new Float32Array(4);

  return {
    copy(copy) {
      gauge.time(copy);
      if (gauge.slow) engine = null;
    },
    draw(sky, f) {
      if (lost || gauge.slow) return null;
      if (sky.version !== version) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texI);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.R32F,
          sky.cols,
          sky.rows,
          0,
          gl.RED,
          gl.FLOAT,
          sky.I,
        );
        const cp = new Uint8Array(sky.cols * sky.rows * 2);
        for (let i = 0; i < sky.col.length; i++) {
          cp[i * 2] = sky.col[i];
          cp[i * 2 + 1] = sky.ph[i];
        }
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texCP);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RG8UI,
          sky.cols,
          sky.rows,
          0,
          gl.RG_INTEGER,
          gl.UNSIGNED_BYTE,
          cp,
        );
        gl.uniform2i(U.size, sky.cols, sky.rows);
        version = sky.version;
      }
      if (!paletteSet) {
        gl.uniform3fv(
          U.rgb,
          f.palette.flatMap((c) => [c[0] / 255, c[1] / 255, c[2] / 255]),
        );
        paletteSet = true;
      }
      const st = f.stir;
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texF);
      const live = !!st.box && st.f.length === st.cols * st.rows && st.cols > 1;
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R32F,
        live ? st.cols : 2,
        live ? st.rows : 2,
        0,
        gl.RED,
        gl.FLOAT,
        live ? st.f : empty,
      );
      gl.uniform2i(U.fSize, live ? st.cols : 2, live ? st.rows : 2);
      gl.uniform1i(U.hasBox, live ? 1 : 0);
      if (st.box) gl.uniform4f(U.box, st.box.x0, st.box.y0, st.box.x1, st.box.y1);
      gl.uniform3f(U.stir, st.x, st.y, st.on);
      gl.uniform1f(U.stirR, st.R);
      gl.uniform1f(U.lens, st.lens);
      gl.uniform1f(U.cell, st.cell);

      if (canvas.width !== f.gw || canvas.height !== f.gh) {
        canvas.width = f.gw;
        canvas.height = f.gh;
      }
      gl.viewport(0, 0, f.gw, f.gh);
      gl.uniform2i(U.grid, f.gw, f.gh);
      gl.uniform2f(U.f0, f.fx0, f.fy0);
      gl.uniform1f(U.scale, f.scale);
      gl.uniform1f(U.D, f.D);
      gl.uniform1fv(U.breath, f.breath);
      gl.uniform1i(U.tick, f.tick);
      gl.uniform1i(U.calm, f.calm ? 1 : 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return canvas;
    },
  };
}
