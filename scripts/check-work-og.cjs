/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS Node tooling, never bundled into the app. */
// Run against a production build: node scripts/check-work-og.cjs http://localhost:3100
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const origin = process.argv[2] || "http://localhost:3100";
const options = { headers: { "user-agent": "facebookexternalhit/1.1" } };
function metas(html, key) {
  return [...html.matchAll(/<meta\b[^>]*>/g)]
    .filter(
      ([tag]) => tag.includes(`property="${key}"`) || tag.includes(`name="${key}"`),
    )
    .map(([tag]) => tag.match(/content="([^"]*)"/)?.[1]);
}
async function htmlAt(route) {
  const response = await fetch(origin + route, options);
  assert.equal(response.status, 200, route);
  return response.text();
}
(async () => {
  const work = await htmlAt("/work");
  const slugs = [
    ...new Set([...work.matchAll(/href="\/work\/([a-z0-9-]+)"/g)].map((m) => m[1])),
  ].sort();
  const imageDir = path.join(__dirname, "../public/og/work");
  const files = fs
    .readdirSync(imageDir)
    .filter((f) => f.endsWith(".jpg"))
    .map((f) => f.slice(0, -4))
    .sort();
  assert(slugs.length > 0, "Work index must expose individual work pages");
  assert.deepEqual(files, slugs, "Every work page needs exactly one card");
  for (const slug of slugs) {
    const html = await htmlAt(`/work/${slug}`);
    const expected = `/og/work/${slug}.jpg`;
    for (const key of ["og:image", "twitter:image"]) {
      const images = metas(html, key);
      assert.equal(images.length, 1, `${slug}: exactly one ${key}`);
      assert.equal(new URL(images[0]).pathname, expected, `${slug}: ${key}`);
    }
    for (const key of [
      "og:title",
      "og:description",
      "og:image:alt",
      "twitter:title",
      "twitter:description",
      "twitter:image:alt",
    ]) {
      assert(metas(html, key)[0]?.length > 0, `${slug}: ${key}`);
    }
    assert.deepEqual(metas(html, "og:image:width"), ["1200"]);
    assert.deepEqual(metas(html, "og:image:height"), ["630"]);
    assert.deepEqual(metas(html, "twitter:card"), ["summary_large_image"]);
    assert.deepEqual(metas(html, "og:url"), [`https://www.meetbhatt.com/work/${slug}`]);
    const response = await fetch(origin + expected);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /image\/jpeg/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(
      bytes.equals(fs.readFileSync(path.join(imageDir, slug + ".jpg"))),
      `${slug}: served bytes`,
    );
    const image = await sharp(bytes).metadata();
    assert.equal(image.width, 1200);
    assert.equal(image.height, 630);
    assert(bytes.length < 1_000_000, `${slug}: keep sharing images under 1 MB`);
  }
  const home = await htmlAt("/");
  assert(new URL(metas(home, "og:image")[0]).pathname.endsWith("/opengraph-image.jpg"));
  assert(
    new URL(metas(home, "twitter:image")[0]).pathname.endsWith("/twitter-image.jpg"),
  );
  assert.equal((await fetch(origin + "/work/not-a-real-project", options)).status, 404);
  console.log(
    `Verified ${slugs.length} work pages: unique OG/X images, metadata, dimensions, image responses; landing cards preserved; unknown slug returns 404.`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
