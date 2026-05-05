// Generates short voice samples for each candidate voice so you can
// pick the best EN / UK pair before regenerating the full library.
//
// Usage:
//   BUILD_API_KEY=<key> npx tsx scripts/voice-samples.ts
//   BUILD_API_KEY=<key> npx tsx scripts/voice-samples.ts --base http://localhost:3000

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf-8');
  const re = /^([A-Z_][A-Z0-9_]*)=(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(.*?))\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = m[1];
    const raw = m[2] ?? m[3] ?? m[4] ?? '';
    const value = m[2] !== undefined ? raw.replace(/\\n/g, '\n').replace(/\\"/g, '"') : raw;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(join(ROOT, '.env.production.local'));
loadDotEnv(join(ROOT, '.env.local'));

const SAMPLES_DIR = join(ROOT, 'voice-samples');

// Sample texts — fact-rich content from real lessons so we can hear how each
// voice handles scientific terms, numbers, named entities.
const SAMPLE_UK = `Чорні діри. Об'єкти, з яких не вирвешся. Уявіть зорю, що в мільйон разів масивніша за Сонце, але стиснута до розміру міста. Гравітація на її поверхні така сильна, що навіть світло — найшвидше у Всесвіті — не може втекти. У квітні 2019 року телескоп Event Horizon Telescope опублікував перше зображення тіні чорної діри M87 з масою 6,5 мільярдів сонячних мас.`;

const SAMPLE_EN = `Black Holes. Objects you can't escape from. Imagine a star a million times more massive than the Sun, compressed to the size of a city. Gravity at its surface is so strong that even light, the fastest thing in the Universe, cannot escape. In April 2019, the Event Horizon Telescope published the first image of a black hole shadow at M87, with a mass of 6.5 billion solar masses.`;

// Voice candidates — best-in-class natural voices Google Cloud offers as of 2026.
const VOICE_CANDIDATES: Array<{ label: string; lang: 'uk-UA' | 'en-US'; voice: string; gender: 'female' | 'male' }> = [
  // English — Studio (real studio recordings, the most natural)
  { label: 'EN-female-Studio-O',    lang: 'en-US', voice: 'en-US-Studio-O',         gender: 'female' },
  { label: 'EN-male-Studio-Q',      lang: 'en-US', voice: 'en-US-Studio-Q',         gender: 'male'   },
  // English — Journey (latest natural neural)
  { label: 'EN-female-Journey-O',   lang: 'en-US', voice: 'en-US-Journey-O',        gender: 'female' },
  { label: 'EN-male-Journey-D',     lang: 'en-US', voice: 'en-US-Journey-D',        gender: 'male'   },
  // English — Chirp HD (newer than Chirp3)
  { label: 'EN-female-Chirp-HD-F',  lang: 'en-US', voice: 'en-US-Chirp-HD-F',       gender: 'female' },
  { label: 'EN-male-Chirp-HD-D',    lang: 'en-US', voice: 'en-US-Chirp-HD-D',       gender: 'male'   },
  // English — Chirp3 HD baseline (current)
  { label: 'EN-female-Chirp3-Leda', lang: 'en-US', voice: 'en-US-Chirp3-HD-Leda',   gender: 'female' },
  { label: 'EN-male-Chirp3-Charon', lang: 'en-US', voice: 'en-US-Chirp3-HD-Charon', gender: 'male'   },

  // Ukrainian — no Studio/Journey available, only Chirp variants
  { label: 'UK-female-Chirp3-Leda',     lang: 'uk-UA', voice: 'uk-UA-Chirp3-HD-Leda',     gender: 'female' },
  { label: 'UK-female-Chirp3-Aoede',    lang: 'uk-UA', voice: 'uk-UA-Chirp3-HD-Aoede',    gender: 'female' },
  { label: 'UK-female-Chirp3-Kore',     lang: 'uk-UA', voice: 'uk-UA-Chirp3-HD-Kore',     gender: 'female' },
  { label: 'UK-female-Chirp3-Zephyr',   lang: 'uk-UA', voice: 'uk-UA-Chirp3-HD-Zephyr',   gender: 'female' },
  { label: 'UK-male-Chirp3-Charon',     lang: 'uk-UA', voice: 'uk-UA-Chirp3-HD-Charon',   gender: 'male'   },
  { label: 'UK-male-Chirp3-Orus',       lang: 'uk-UA', voice: 'uk-UA-Chirp3-HD-Orus',     gender: 'male'   },
  { label: 'UK-male-Chirp3-Puck',       lang: 'uk-UA', voice: 'uk-UA-Chirp3-HD-Puck',     gender: 'male'   },
  { label: 'UK-male-Chirp3-Fenrir',     lang: 'uk-UA', voice: 'uk-UA-Chirp3-HD-Fenrir',   gender: 'male'   },
  // Older but might sound smoother
  { label: 'UK-female-Wavenet-A',       lang: 'uk-UA', voice: 'uk-UA-Wavenet-A',          gender: 'female' },
];

interface BuildOptions {
  baseUrl: string;
  apiKey: string;
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const opts: BuildOptions = {
    baseUrl: 'https://nebulife.space',
    apiKey: process.env.BUILD_API_KEY ?? '',
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base') opts.baseUrl = args[++i];
  }
  if (!opts.apiKey) throw new Error('BUILD_API_KEY env var is required');
  return opts;
}

async function callTts(
  baseUrl: string,
  apiKey: string,
  language: string,
  gender: string,
  voiceName: string,
  text: string,
  slug: string,
): Promise<{ url: string }> {
  const res = await fetch(`${baseUrl}/api/academy-library/generate-tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-academy-build-key': apiKey,
    },
    body: JSON.stringify({ slug, language: language === 'uk-UA' ? 'uk' : 'en', gender, text, voiceName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data as { url: string };
}

async function main() {
  const opts = parseArgs();
  mkdirSync(SAMPLES_DIR, { recursive: true });

  console.log(`Generating ${VOICE_CANDIDATES.length} voice samples...`);
  console.log(`Saving to ${SAMPLES_DIR}\n`);

  const results: { label: string; voice: string; url: string; size?: number }[] = [];

  for (const cand of VOICE_CANDIDATES) {
    const text = cand.lang === 'uk-UA' ? SAMPLE_UK : SAMPLE_EN;
    const slug = `voice-sample-${cand.label.toLowerCase()}`;
    process.stdout.write(`  → ${cand.label.padEnd(28)} ${cand.voice.padEnd(36)} ... `);
    try {
      const result = await callTts(opts.baseUrl, opts.apiKey, cand.lang, cand.gender, cand.voice, text, slug);
      results.push({ label: cand.label, voice: cand.voice, url: result.url });

      // Download the MP3 for local preview
      const mp3 = await fetch(result.url);
      if (mp3.ok) {
        const buf = Buffer.from(await mp3.arrayBuffer());
        const localPath = join(SAMPLES_DIR, `${cand.label}.mp3`);
        writeFileSync(localPath, buf);
        console.log(`OK ${(buf.length / 1024).toFixed(0)} KB → ${localPath}`);
      } else {
        console.log(`OK (cdn only)`);
      }
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\n=== Voice sample URLs ===');
  for (const r of results) {
    console.log(`  ${r.label.padEnd(28)} ${r.url}`);
  }
  console.log(`\nLocal files: ${SAMPLES_DIR}`);
  console.log(`Open in Finder: open "${SAMPLES_DIR}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
