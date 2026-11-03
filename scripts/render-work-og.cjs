/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS Node tooling, never bundled into the app. */
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const ts = require(path.join(root, "node_modules/typescript"));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const out = path.resolve(
  process.env.OG_OUTPUT_DIR || path.join(root, ".cache/work-og"),
);
// Render one card for focused revisions without rewriting the other assets.
const requestedId = process.env.OG_UNIT_ID;
fs.mkdirSync(out, { recursive: true });
const modules = {};
function bundle(file) {
  file = path.resolve(file);
  const id = path.relative(root, file).replaceAll("\\", "/");
  if (modules[id]) return id;
  modules[id] = "";
  let js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  js = js.replace(/require\("([^"]+)"\)/g, (_, dep) => {
    const dest = dep.startsWith("@/")
      ? path.join(root, "src", dep.slice(2))
      : path.resolve(path.dirname(file), dep);
    return `require(${JSON.stringify(bundle(dest + ".ts"))})`;
  });
  modules[id] = js;
  return id;
}
for (const file of [
  "content/work",
  "components/universe/encoding",
  "components/universe/looks",
  "components/universe/portraits",
  "components/universe/render",
  "components/universe/helpers",
])
  bundle(path.join(root, "src", file + ".ts"));
const boot = `const mods={${Object.entries(modules)
  .map(([id, js]) => `${JSON.stringify(id)}:(exports,module,require)=>{${js}\n}`)
  .join(
    ",",
  )}};const cache={};window.req=id=>{if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;mods[id](m.exports,m,window.req);return m.exports;};`;
let fonts = "";
for (const f of fs
  .readdirSync(path.join(root, ".next/static/chunks"))
  .filter((f) => f.endsWith(".css"))) {
  const css = fs.readFileSync(path.join(root, ".next/static/chunks", f), "utf8");
  for (let face of css.match(/@font-face\{[^}]+\}/g) || [])
    if (face.includes("IBM Plex") && !face.includes("Fallback")) {
      face = face.replace(/url\(([^)]+)\)/g, (_, url) => {
        const name = path.basename(url.replace(/["']/g, ""));
        return `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, ".next/static/media", name)).toString("base64")})`;
      });
      fonts += face;
    }
}
const copy = {
  "hackathon-wins": [
    "Hack-Nation &\nWorld Bank Group",
    "Grand winner · Hack-Nation",
    "Health track winner · World Bank Group",
    "Global AI & Digital Summit",
    "Seoul, South Korea · October 2026",
  ],
  "carnegie-mellon": [
    "Carnegie Mellon\nUniversity",
    "AI engineering & innovation management",
    "J N Tata Scholar · Graduate study",
  ],
  "bosch-mobility": [
    "Bosch Mobility",
    "Corporate Startup Lab",
    "Actuators for occupational exoskeletons",
  ],
  linea: [
    "Linea",
    "Lyrics that float over your work",
    "Designer & developer · Open source",
  ],
  "health-performance-lab": [
    "Health & Human\nPerformance Lab",
    "Who benefits from mindfulness?",
    "Research Assistant · Carnegie Mellon",
  ],
  phoenix: [
    "Project Phoenix",
    "Explainable AI for cervical cell classification",
    "96.3% accuracy · Manuscript in preparation",
  ],
  "prompt-classifier": [
    "Malicious Prompt\nClassifier",
    "98.84% precision · 90.79% accuracy",
    "Published · Procedia Computer Science, 2026",
  ],
  talaria: [
    "Project Talaria",
    "Forecasting heart rate & gait",
    "143K records · 32 participants · LSTM",
  ],
  "blink-analytics": [
    "Blink Analytics",
    "From RLHF contributor to product lead",
    "222% revenue growth in two months",
  ],
  serin: [
    "Serin",
    "AI interviews. Live voice. Role-based scoring.",
    "Product development lead · Private beta",
  ],
  icarus: [
    "Project Icarus",
    "A drone with a flight controller I built",
    "Custom PCB · Sensor fusion · Flight control",
  ],
  pdeu: [
    "Pandit Deendayal\nEnergy University",
    "B.Tech in Computer Engineering",
    "9.55/10 GPA · Internet of Things minor",
  ],
  "mind-ripple": [
    "Mind Ripple",
    "From club member to president & advisor",
    "30-member team · 300+ event participants",
  ],
  astar: [
    "Astar Technologies",
    "Regional & seasonal demand forecasting",
    "Business & data analysis",
  ],
  "interact-club": [
    "Interact Club",
    "Baroda Sayajinagari",
    "Founder & Charter President · 32 members",
  ],
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.OG_BROWSER_CHANNEL
      ? { channel: process.env.OG_BROWSER_CHANNEL }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>${fonts}body{margin:0;background:black}canvas{display:block}</style><canvas width="1200" height="630"></canvas><script>${boot}</script>`,
  );
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('300 56px "IBM Plex Sans"'),
      document.fonts.load('400 20px "IBM Plex Mono"'),
    ]);
    await document.fonts.ready;
  });
  const assets = Object.fromEntries(
    [
      ["winners", "work/hackathon-wins/seoul/track-winners.webp", "image/webp"],
      ["logoM", "logos/wordmark/m.png", "image/png"],
      ["logoEet", "logos/wordmark/eet.png", "image/png"],
    ].map(([key, file, mime]) => [
      key,
      `data:${mime};base64,${fs.readFileSync(path.join(root, "public", file)).toString("base64")}`,
    ]),
  );
  await page.evaluate(async (assets) => {
    window.ogAssets = Object.fromEntries(
      await Promise.all(
        Object.entries(assets).map(async ([key, src]) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          return [key, image];
        }),
      ),
    );
  }, assets);
  const cards = await page.evaluate(() =>
    req("src/content/work.ts").UNITS.map((u) => ({
      id: u.id,
      name: u.name,
      kind: u.kind,
      brief: u.brief,
    })),
  );
  if (requestedId && !cards.some((u) => u.id === requestedId))
    throw new Error(`Unknown work card: ${requestedId}`);
  if (requestedId)
    cards.splice(0, cards.length, ...cards.filter((u) => u.id === requestedId));
  for (const u of cards) {
    const details = await page.evaluate(
      ({ u, copy }) => {
        const { KINDS, layout, colorsOf } = req("src/components/universe/encoding.ts");
        const { lookOf, lookColors, reachOf } = req("src/components/universe/looks.ts");
        const { PORTRAITS } = req("src/components/universe/portraits.ts");
        const { drawBody, makeFrame } = req("src/components/universe/render.ts");
        const { mulberry32, CELL } = req("src/components/universe/helpers.ts");
        const g = document.querySelector("canvas").getContext("2d");
        g.fillStyle = "#000";
        g.fillRect(0, 0, 1200, 630);
        const victory = u.id === "hackathon-wins";
        const kind = KINDS[u.kind],
          look = lookOf(u.id, u.kind),
          colors = lookColors(look),
          category = colorsOf(kind.hue, kind.l, kind.c),
          accent = category[2],
          random = mulberry32(2304);
        for (let i = 0; i < 430; i++) {
          const x = random() * 1200,
            y = random() * 630;
          g.globalAlpha = 0.12 + random() * 0.52;
          g.fillStyle = i % 7 ? "#aebdc9" : accent;
          g.fillRect(x, y, 1, 1);
          if (i % 47 === 0) {
            g.fillRect(x - 3, y, 7, 1);
            g.fillRect(x, y - 3, 1, 7);
          }
        }
        g.globalAlpha = 1;
        const portrait = PORTRAITS[kind.body],
          [rx, ry] = reachOf(look, kind.body),
          cx = victory ? 1030 : 960,
          cy = victory ? 110 : 300,
          R =
            Math.min(450 / rx, 370 / ry) *
            (0.8 + 0.2 * look.scale) *
            (victory ? 0.95 : 1),
          cw = CELL.wide,
          ch = cw * 1.72;
        g.save();
        g.strokeStyle = colors[2];
        g.globalAlpha = victory ? 0.085 : 0.19;
        g.lineWidth = 0.7;
        for (const [a, b, tilt] of [
          [440, 265, -0.42],
          [490, 205, 0.6],
        ]) {
          g.beginPath();
          const scale = victory ? 0.95 : 1;
          g.ellipse(cx, cy, a * scale, b * scale, tilt, 0, Math.PI * 2);
          g.stroke();
        }
        g.restore();
        const seed = layout().placed.find((p) => p.id === u.id)?.seed ?? 0.4;
        const frame = makeFrame(0, 0, 0.35, null, cw / R, ch / R, seed, true);
        frame.look = look;
        const bodyAlpha = victory ? 0.32 : 1;
        const light = { cx, cy, R, colors, alpha: bodyAlpha, t: 0, calm: true, look };
        const extent = look.planet
          ? look.planet.ring || look.planet.moons > 1
            ? portrait.extent
            : 1.9
          : look.hole
            ? look.hole.disk + 0.1
            : portrait.extent;
        portrait.under?.(g, light);
        drawBody(g, kind.body, {
          w: 1200,
          h: 630,
          cx,
          cy,
          R,
          cw,
          ch,
          frame,
          colors,
          alpha: bodyAlpha,
          font: `${ch * 0.92}px "IBM Plex Mono"`,
          fn: portrait.fn,
          extent,
          light: portrait.mapLight ?? false,
        });
        portrait.over?.(g, light);
        const shade = g.createLinearGradient(0, 0, 790, 0);
        shade.addColorStop(0, "rgba(0,0,0,.12)");
        shade.addColorStop(0.64, "rgba(0,0,0,.60)");
        shade.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = shade;
        g.fillRect(0, 0, 790, 630);
        if (victory) {
          // Use the site's actual wordmark masks and pale blue dot.
          const { logoM, logoEet, winners } = window.ogAssets;
          const logoHeight = 28;
          g.drawImage(logoM, 60, 46, logoHeight * 1.208, logoHeight);
          g.drawImage(
            logoEet,
            60 + logoHeight * 1.208,
            46,
            logoHeight * 2.153,
            logoHeight,
          );
          g.fillStyle = "#2f9dff";
          g.beginPath();
          g.arc(
            60 + logoHeight * 3.547,
            46 + logoHeight * 0.839,
            logoHeight * 0.161,
            0,
            Math.PI * 2,
          );
          g.fill();
          g.fillStyle = accent;
          g.font = '400 13px "IBM Plex Mono"';
          g.fillText("MEET BHATT / AWARDS", 188, 70);
          g.font = '300 51px "IBM Plex Sans"';
          g.fillStyle = "#f4f6f8";
          const titleLead = copy[0].split("\n")[0] + " ";
          g.fillText(titleLead, 57, 139);
          const titleOffset = g.measureText(titleLead).width;
          g.fillStyle = accent;
          g.fillText(copy[0].split("\n")[1], 57 + titleOffset, 139);
          g.fillStyle = "#f4f6f8";
          g.font = '300 23px "IBM Plex Sans"';
          g.fillText(copy[3], 60, 179);
          const summitOffset = g.measureText(copy[3]).width;
          g.fillStyle = "#b1bec8";
          g.font = '400 15px "IBM Plex Mono"';
          g.fillText(" / " + copy[4], 60 + summitOffset + 14, 178);

          // The photograph leads the card; keep all seven faces and the summit screen.
          const photo = { x: 60, y: 203, w: 1080, h: 340 };
          const sourceHeight = (winners.width * photo.h) / photo.w;
          g.drawImage(
            winners,
            0,
            180,
            winners.width,
            sourceHeight,
            photo.x,
            photo.y,
            photo.w,
            photo.h,
          );
          g.strokeStyle = "rgba(165,210,140,.35)";
          g.lineWidth = 1;
          g.strokeRect(photo.x - 0.5, photo.y - 0.5, photo.w + 1, photo.h + 1);
          g.strokeStyle = accent;
          for (const [x, y, dx, dy] of [
            [photo.x, photo.y, 1, 1],
            [photo.x + photo.w, photo.y, -1, 1],
            [photo.x, photo.y + photo.h, 1, -1],
            [photo.x + photo.w, photo.y + photo.h, -1, -1],
          ]) {
            g.beginPath();
            g.moveTo(x, y + dy * 12);
            g.lineTo(x, y);
            g.lineTo(x + dx * 12, y);
            g.stroke();
          }
          g.fillStyle = "#c2cbd3";
          g.font = '400 17px "IBM Plex Mono"';
          g.fillText(copy[1], 60, 578);
          const awardOffset = g.measureText(copy[1]).width;
          g.fillStyle = accent;
          g.fillText(" / ", 60 + awardOffset + 16, 578);
          g.fillStyle = "#c2cbd3";
          g.fillText(copy[2], 60 + awardOffset + 63, 578);
          g.fillStyle = "#b1bec8";
          g.font = '400 11px "IBM Plex Mono"';
          g.textAlign = "right";
          g.fillText("TRACK WINNERS / SEOUL", 1140, 609);
          g.textAlign = "left";
          g.fillStyle = accent;
          g.font = '400 14px "IBM Plex Mono"';
          g.fillText("meetbhatt.com/work/hackathon-wins", 60, 609);
          return {
            body: kind.body,
            categoryAccent: accent,
            bodyColors: colors,
            look,
            seed,
            textBottom: 609,
          };
        }
        g.fillStyle = accent;
        g.font = '400 15px "IBM Plex Mono"';
        g.fillText("MEET BHATT / " + kind.label.toUpperCase(), 60, 80);
        const lines = copy[0].split("\n");
        let size = 70;
        while (size > 36) {
          g.font = `300 ${size}px "IBM Plex Sans"`;
          if (lines.every((line) => g.measureText(line).width < 565)) break;
          size--;
        }
        let y = lines.length > 1 ? 230 : 268;
        lines.forEach((line, i) => {
          g.fillStyle = i === lines.length - 1 ? accent : "#f4f6f8";
          g.fillText(line, 58, y);
          y += size * 1.1;
        });
        y += 15;
        g.font = '400 19px "IBM Plex Mono"';
        g.fillStyle = "#c2cbd3";
        function wrap(text, max) {
          const lines = [];
          let line = "";
          for (const word of text.split(" ")) {
            const next = line ? line + " " + word : word;
            if (g.measureText(next).width > max && line) {
              lines.push(line);
              line = word;
            } else line = next;
          }
          if (line) lines.push(line);
          return lines;
        }
        for (const line of wrap(copy[1], 550)) {
          g.fillText(line, 60, y);
          y += 29;
        }
        g.fillStyle = accent;
        g.fillRect(60, y + 13, 40, 3);
        y += 57;
        g.font = '400 17px "IBM Plex Mono"';
        g.fillStyle = "#b1bec8";
        for (const line of wrap(copy[2], 550)) {
          g.fillText(line, 60, y);
          y += 24;
        }
        g.font = '400 14px "IBM Plex Mono"';
        g.fillStyle = accent;
        g.fillText("meetbhatt.com", 60, 574);
        return {
          body: kind.body,
          categoryAccent: accent,
          bodyColors: colors,
          look,
          seed,
          textBottom: y,
        };
      },
      { u, copy: copy[u.id] },
    );
    await page.locator("canvas").screenshot({ path: path.join(out, u.id + ".png") });
    const sharp = require(path.join(root, "node_modules/sharp"));
    await sharp(path.join(out, u.id + ".png"))
      .jpeg({ quality: 95, mozjpeg: true })
      .toFile(path.join(out, u.id + ".jpg"));
    Object.assign(u, details, {
      copy: copy[u.id],
      canonical: "https://www.meetbhatt.com/work/" + u.id,
      status: "draft-pr",
      image: u.id + ".jpg",
      width: 1200,
      height: 630,
      alt:
        u.id === "hackathon-wins"
          ? `${u.name} — Meet Bhatt. Hackathon victories: ${copy[u.id][1]}; ${copy[u.id][2]}. ${copy[u.id][3]}, ${copy[u.id][4]}. Track winners with Hayley Pottle, beside the portfolio's supernova and Meet's logo.`
          : `${u.name} — Meet Bhatt. ${copy[u.id][1]}. The portfolio's ${details.body} rendered with its original colors and appearance.`,
    });
  }
  await browser.close();
  for (const u of cards) {
    const title = u.name + " — Meet Bhatt",
      imageUrl = "https://www.meetbhatt.com/og/work/" + u.image;
    u.imageUrl = imageUrl;
    u.openGraph = {
      type: "website",
      url: u.canonical,
      title,
      description: u.brief,
      siteName: "Meet Bhatt",
      locale: "en_US",
      images: [
        { url: imageUrl, width: 1200, height: 630, type: "image/jpeg", alt: u.alt },
      ],
    };
    u.twitter = {
      card: "summary_large_image",
      title,
      description: u.brief,
      creator: "@Meet2304",
      images: [{ url: imageUrl, alt: u.alt }],
    };
  }
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(cards, null, 2));
  const esc = (s) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  fs.writeFileSync(
    path.join(out, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portfolio OG · v3 review</title><style>body{background:#07090c;color:#e5eaf0;font:16px system-ui;margin:40px}main{max-width:1500px;margin:auto}h1{font-weight:400}p{color:#a3b2bf;line-height:1.6}section{display:grid;grid-template-columns:1fr 1fr;gap:30px}img{width:100%;border:1px solid #26303a}h2{font-size:18px;font-weight:400}a{color:#9dcced}@media(max-width:850px){section{grid-template-columns:1fr}}</style><main><p>MEET BHATT / OPEN GRAPH / V3</p><h1>The same universe, in every link.</h1><p>All 15 cards use the website's actual celestial renderer, individual appearance, palette and seed.<br>Category accents use the existing category colors; bodies retain their individual site colors. Expanded celestial compositions · Integrated for draft PR review.</p><section>${cards.map((u, i) => `<article><a href="${u.image}"><img src="${u.image}" alt="${esc(u.alt)}"></a><h2 style="color:${u.categoryAccent}">${String(i + 1).padStart(2, "0")} · ${esc(u.name)}</h2><a href="${u.canonical}">/work/${u.id}</a></article>`).join("")}</section></main></html>`,
  );
  console.log(
    JSON.stringify(
      {
        cards: cards.length,
        maxTextBottom: Math.max(...cards.map((c) => c.textBottom)),
        output: out,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
