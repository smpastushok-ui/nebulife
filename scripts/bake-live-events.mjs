// Bake live cosmic event art (Higgsfield Nano Banana 2 output) into bundled
// WebP assets at packages/client/public/cosmic-events/live/. Dimensions match
// the existing common cosmic-event assets (1024x1820, ~9:16 portrait).
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("packages/client/public/cosmic-events/live");
const MAX_BYTES = 300 * 1024;

const EVENTS = [
  { id: "rogue-flyby", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_103312_c48bdec9-b693-4225-9ae6-132375450d2f.png", jobId: "c48bdec9-b693-4225-9ae6-132375450d2f" },
  { id: "supernova-echo", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_103325_a81d2f45-7b8e-4b49-9dc4-4f4c9e85fc74.png", jobId: "a81d2f45-7b8e-4b49-9dc4-4f4c9e85fc74" },
  { id: "interstellar-visitor", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_103328_a00ca3be-f834-46d7-815f-262699f3766b.png", jobId: "a00ca3be-f834-46d7-815f-262699f3766b" },
  // Regenerated with explicit alien-continent constraints — the first take
  // (job 2ed37e80) rendered recognizable Earth landmasses.
  { id: "aurora-storm", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_103555_8bee0946-79f2-44c5-b0b5-212384a8043c.png", jobId: "8bee0946-79f2-44c5-b0b5-212384a8043c" },
];

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function optimizeToBudget(inputBuffer, outPath) {
  let quality = 82;
  let buf;
  for (; quality >= 40; quality -= 6) {
    buf = await sharp(inputBuffer)
      .resize(1024, 1820, { fit: "cover" })
      .webp({ quality })
      .toBuffer();
    if (buf.length <= MAX_BYTES) break;
  }
  fs.writeFileSync(outPath, buf);
  return { size: buf.length, quality };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const ev of EVENTS) {
    process.stdout.write(`Downloading ${ev.id}... `);
    const raw = await downloadBuffer(ev.url);
    const outPath = path.join(OUT_DIR, `${ev.id}.webp`);
    const { size, quality } = await optimizeToBudget(raw, outPath);
    console.log(`done (${(size / 1024).toFixed(1)} KB @ q${quality}) job=${ev.jobId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
