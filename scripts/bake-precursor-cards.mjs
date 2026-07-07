import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("packages/client/public/precursor-cards");
const MAX_BYTES = 150 * 1024;

const CARDS = [
  { id: "signal-origin", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000336_e7e88582-cbea-4402-be8e-970d58676e27.png", jobId: "e7e88582-cbea-4402-be8e-970d58676e27" },
  { id: "signal-weaver", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000416_d22d2c30-942f-4adc-a9ab-c9aabe1312c0.png", jobId: "d22d2c30-942f-4adc-a9ab-c9aabe1312c0" },
  { id: "signal-engine", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000503_1b8219e7-fee2-461f-996b-277458ef401c.png", jobId: "1b8219e7-fee2-461f-996b-277458ef401c" },
  { id: "signal-archive", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000506_3830edc8-e9ba-441b-bf20-4fcc6a549491.png", jobId: "3830edc8-e9ba-441b-bf20-4fcc6a549491" },
  { id: "signal-gate", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000509_d2e72274-486e-418a-9eef-8188497b9bd9.png", jobId: "d2e72274-486e-418a-9eef-8188497b9bd9" },
  { id: "signal-lattice", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000513_892e3b92-0682-4fe4-a040-e676bee44564.png", jobId: "892e3b92-0682-4fe4-a040-e676bee44564" },
  { id: "signal-helix", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000516_8d653c16-a74b-419c-b65c-898740dc90bb.png", jobId: "8d653c16-a74b-419c-b65c-898740dc90bb" },
  { id: "signal-mirror", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000520_b3bd9d3c-b74b-4e36-910b-4cbd340ac700.png", jobId: "b3bd9d3c-b74b-4e36-910b-4cbd340ac700" },
  { id: "signal-beacon", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000529_b9edb94e-9a9f-40be-a9d5-78b013e74d9c.png", jobId: "b9edb94e-9a9f-40be-a9d5-78b013e74d9c" },
  { id: "signal-echo", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000532_13dc8303-4473-447b-8154-0f789241d08a.png", jobId: "13dc8303-4473-447b-8154-0f789241d08a" },
  { id: "signal-pulse", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000536_995dd128-3b49-4c4d-9e7d-cb35565141de.png", jobId: "995dd128-3b49-4c4d-9e7d-cb35565141de" },
  { id: "signal-dust", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000539_b780b3bd-a85f-4e01-be31-06427330e920.png", jobId: "b780b3bd-a85f-4e01-be31-06427330e920" },
  { id: "signal-ice", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000541_76d9b0f7-a957-4240-b95a-b6cfd43075c9.png", jobId: "76d9b0f7-a957-4240-b95a-b6cfd43075c9" },
  { id: "signal-drift", url: "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000638_d6f208f0-7eb9-49b3-94a1-38d1d7ea1761.png", jobId: "d6f208f0-7eb9-49b3-94a1-38d1d7ea1761" },
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
      .resize(768, 1024, { fit: "cover" })
      .webp({ quality })
      .toBuffer();
    if (buf.length <= MAX_BYTES) break;
  }
  fs.writeFileSync(outPath, buf);
  return { size: buf.length, quality };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const card of CARDS) {
    process.stdout.write(`Downloading ${card.id}... `);
    const raw = await downloadBuffer(card.url);
    const outPath = path.join(OUT_DIR, `${card.id}.webp`);
    const { size, quality } = await optimizeToBudget(raw, outPath);
    console.log(`done (${(size / 1024).toFixed(1)} KB @ q${quality})`);
    results.push({ id: card.id, jobId: card.jobId, url: card.url, sizeBytes: size, quality });
  }
  console.log("\nSummary:");
  for (const r of results) {
    console.log(`${r.id}: ${(r.sizeBytes / 1024).toFixed(1)} KB (q${r.quality}) job=${r.jobId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
