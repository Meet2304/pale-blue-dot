/**
 * A photograph rebuilt as a real 3D Gaussian splat: Apple's SHARP predicts,
 * from the one photo, about a million Gaussians in two layers, the second
 * filling in what the first hides, so the scene holds up as the camera
 * moves round it. Spark (World Labs' renderer for three.js) draws them.
 *
 * From where the photo was taken the splat lines up with the photo (the
 * camera's field of view is SHARP's own). Yours to move:
 *   - drag to walk round it (it keeps turning a little when let go);
 *   - once clicked into, scroll (or pinch) to step in and out;
 *   - double-click to go back to where the photo was taken;
 *   - just pointing leans the view a little.
 *
 * Kind to the device: three.js and Spark are fetched only when the picture
 * is about a screen away, and the splat file after them; the photograph
 * shows until the splat is ready and then gives way to it; it draws only
 * while the camera moves (and a moment after, while Spark re-sorts); the
 * pixel ratio is capped at 1.5. Phones, reduced motion, Data Saver and
 * browsers without WebGL2 keep the photograph.
 */

/* How far the eye may go: turning round the subject, and stepping in or out
   (as a share of the distance to it). Further, and the camera ends up beside
   the nearest things in the photo, which smear across the view. */
const YAW = 0.18;
const PITCH = 0.07;
const IN = -0.3;
const OUT = 0.04;

/** Whether the splat should run here; if not, the photograph stays. */
export function canSplat() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.matchMedia("(max-width: 700px), (pointer: coarse)").matches) return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  if (conn?.saveData) return false;
  return Boolean(document.createElement("canvas").getContext("webgl2"));
}

/**
 * Draws the splat at `src` into `canvas`, sized to `host`. `fov` is the
 * photo's vertical field of view in degrees and `focus` the distance to its
 * subject, both from SHARP. `onReady` is called once the splat is drawn,
 * `onFail` if it can't be. Returns a function that stops it.
 */
export function mountSplat(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  {
    src,
    fov,
    focus,
    onReady,
    onFail,
  }: {
    src: string;
    fov: number;
    focus: number;
    onReady: () => void;
    onFail: () => void;
  },
) {
  let dead = false;
  let ready = false;
  let visible = false;
  let frame = 0;
  let last = 0;
  let clock = 0;
  let introAt = -1;
  let settleUntil = 0;
  let draw: () => void = () => {};
  let resize: () => void = () => {};
  let dispose: () => void = () => {};

  const cam = { yaw: 0, pitch: 0, dolly: 0 };
  const to = { yaw: 0, pitch: 0, dolly: 0 };
  const lean = { x: 0, y: 0 };
  const leanTo = { x: 0, y: 0 };
  const spin = { yaw: 0, pitch: 0 };
  let intro = 0;
  let drag: {
    x: number;
    y: number;
    yaw: number;
    pitch: number;
    t: number;
    vx: number;
    vy: number;
  } | null = null;
  let active = false;
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
  const follow = (x: number, target: number, dt: number, tau: number) =>
    x + (target - x) * (1 - Math.exp(-dt / tau));
  const ease = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const AXES = ["yaw", "pitch", "dolly"] as const;

  function tick(now: number) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    clock += dt;
    if (introAt >= 0) intro = ease((clock - introAt) / 3);
    /* Let go mid-drag, the scene keeps turning and slows. */
    if (!drag && (spin.yaw || spin.pitch)) {
      to.yaw = clamp(to.yaw + spin.yaw * dt, -YAW, YAW);
      to.pitch = clamp(to.pitch + spin.pitch * dt, -PITCH, PITCH);
      const decay = Math.exp(-dt / 0.35);
      spin.yaw = Math.abs(spin.yaw * decay) < 1e-3 ? 0 : spin.yaw * decay;
      spin.pitch = Math.abs(spin.pitch * decay) < 1e-3 ? 0 : spin.pitch * decay;
    }
    for (const key of AXES) cam[key] = follow(cam[key], to[key], dt, 0.16);
    lean.x = follow(lean.x, leanTo.x, dt, 0.5);
    lean.y = follow(lean.y, leanTo.y, dt, 0.5);
    draw();
    const moving =
      intro < 1 ||
      Boolean(spin.yaw || spin.pitch) ||
      AXES.some((key) => Math.abs(cam[key] - to[key]) > 1e-4) ||
      Math.abs(lean.x - leanTo.x) > 1e-4 ||
      Math.abs(lean.y - leanTo.y) > 1e-4;
    /* Spark re-sorts the splats a frame or two behind the camera: keep
       drawing a moment after it stops. */
    if (moving) settleUntil = now + 400;
    frame = visible && now < settleUntil ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (ready && visible && !frame) {
      last = 0;
      settleUntil = performance.now() + 400;
      frame = requestAnimationFrame(tick);
    }
  };
  const fail = () => {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(frame);
    onFail();
  };

  async function start() {
    try {
      const [THREE, { SparkRenderer, SplatMesh }] = await Promise.all([
        import("three"),
        import("@sparkjsdev/spark"),
      ]);
      if (dead) return;
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(fov, 1, focus * 0.01, focus * 20);
      /* A little tighter than the photo, so moving never shows past its edges. */
      camera.zoom = 1.1;
      const spark = new SparkRenderer({ renderer });
      scene.add(spark);
      const mesh = new SplatMesh({ url: src });
      /* SHARP writes OpenCV axes (y down, z forward): turn them over. */
      mesh.quaternion.set(1, 0, 0, 0);
      scene.add(mesh);
      await mesh.initialized;
      if (dead) {
        renderer.dispose();
        return;
      }
      const target = new THREE.Vector3(0, 0, -focus);
      resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      draw = () => {
        /* The first look: from in close and to the left, a slow drift back. */
        const away = 1 - intro;
        const yaw = cam.yaw + lean.x - away * 0.1;
        const pitch = cam.pitch + lean.y + away * 0.02;
        const reach = focus * (1 + cam.dolly - away * 0.15);
        camera.position.set(
          Math.sin(yaw) * Math.cos(pitch) * reach,
          Math.sin(pitch) * reach,
          -focus + Math.cos(yaw) * Math.cos(pitch) * reach,
        );
        camera.lookAt(target);
        renderer.render(scene, camera);
      };
      dispose = () => {
        scene.remove(mesh);
        mesh.dispose();
        renderer.dispose();
      };
      resize();
      ready = true;
      if (visible && introAt < 0) introAt = clock;
      draw();
      onReady();
      run();
    } catch {
      fail();
    }
  }

  const lost = (e: Event) => {
    e.preventDefault();
    fail();
  };
  canvas.addEventListener("webglcontextlost", lost);

  const down = (e: PointerEvent) => {
    if (!ready || e.button > 0) return;
    drag = {
      x: e.clientX,
      y: e.clientY,
      yaw: to.yaw,
      pitch: to.pitch,
      t: performance.now(),
      vx: 0,
      vy: 0,
    };
    spin.yaw = spin.pitch = 0;
    active = true;
    host.dataset.active = "";
    host.setPointerCapture(e.pointerId);
    run();
  };
  const move = (e: PointerEvent) => {
    if (!ready) return;
    const box = host.getBoundingClientRect();
    if (drag) {
      const yaw = clamp(drag.yaw - ((e.clientX - drag.x) / box.width) * 0.5, -YAW, YAW);
      const pitch = clamp(
        drag.pitch + ((e.clientY - drag.y) / box.height) * 0.2,
        -PITCH,
        PITCH,
      );
      const now = performance.now();
      const dt = Math.max(1, now - drag.t) / 1000;
      drag.vx = (yaw - to.yaw) / dt;
      drag.vy = (pitch - to.pitch) / dt;
      drag.t = now;
      to.yaw = yaw;
      to.pitch = pitch;
    } else if (e.pointerType === "mouse") {
      leanTo.x = ((e.clientX - box.left) / box.width - 0.5) * 0.06;
      leanTo.y = -((e.clientY - box.top) / box.height - 0.5) * 0.03;
    }
    run();
  };
  const release = () => {
    if (!drag) return;
    spin.yaw = clamp(drag.vx, -2, 2) * 0.6;
    spin.pitch = clamp(drag.vy, -1, 1) * 0.6;
    drag = null;
    run();
  };
  const leave = () => {
    release();
    active = false;
    delete host.dataset.active;
    leanTo.x = leanTo.y = 0;
    run();
  };
  /* Scroll steps in and out, but only once the picture has been clicked,
     so it never steals the page's scroll; a pinch always works. */
  const wheel = (e: WheelEvent) => {
    if (!ready || (!active && !e.ctrlKey)) return;
    e.preventDefault();
    to.dolly = clamp(to.dolly + e.deltaY * (e.ctrlKey ? 0.006 : 0.0012), IN, OUT);
    run();
  };
  const reset = () => {
    to.yaw = to.pitch = to.dolly = 0;
    spin.yaw = spin.pitch = 0;
    run();
  };
  host.addEventListener("pointerdown", down);
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", release);
  host.addEventListener("pointerleave", leave);
  host.addEventListener("wheel", wheel, { passive: false });
  host.addEventListener("dblclick", reset);

  let fetched = false;
  const near = new IntersectionObserver(
    (entries) => {
      if (!fetched && entries[entries.length - 1].isIntersecting) {
        fetched = true;
        void start();
      }
    },
    { rootMargin: "100% 0px" },
  );
  near.observe(host);
  const view = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible && ready && introAt < 0) introAt = clock;
      if (visible) run();
    },
    { threshold: 0.25 },
  );
  view.observe(host);
  const sizer = new ResizeObserver(() => {
    if (!ready) return;
    resize();
    draw();
  });
  sizer.observe(host);

  return () => {
    dead = true;
    cancelAnimationFrame(frame);
    canvas.removeEventListener("webglcontextlost", lost);
    host.removeEventListener("pointerdown", down);
    host.removeEventListener("pointermove", move);
    host.removeEventListener("pointerup", release);
    host.removeEventListener("pointercancel", release);
    host.removeEventListener("pointerleave", leave);
    host.removeEventListener("wheel", wheel);
    host.removeEventListener("dblclick", reset);
    near.disconnect();
    view.disconnect();
    sizer.disconnect();
    dispose();
  };
}
