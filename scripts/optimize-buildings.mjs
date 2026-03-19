/**
 * optimize-buildings.mjs
 *
 * Generates LOD variants for all base GLB building models.
 * Usage: npm run optimize-buildings
 *
 * For each {type}.glb in public/buildings/:
 *   {type}_mid.glb  — 1K textures + Draco compression
 *   {type}_lo.glb   — 512px textures + Draco compression
 *
 * Files with _mid or _lo suffix are skipped (already processed).
 *
 * Requires: @gltf-transform/core, @gltf-transform/extensions,
 *           @gltf-transform/functions, sharp
 */

import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, dedup, prune, flatten, join, textureCompress, cloneDocument } from '@gltf-transform/functions';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import sharp from 'sharp';
import draco3d from 'draco3d';
import { readdirSync } from 'fs';
import { resolve, basename } from 'path';

const BUILDINGS_DIR = resolve('packages/client/public/buildings');

const dracoEncoder = await draco3d.createEncoderModule();
const dracoDecoder = await draco3d.createDecoderModule();

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({
    'draco3d.encoder': dracoEncoder,
    'draco3d.decoder': dracoDecoder,
  });

const files = readdirSync(BUILDINGS_DIR).filter(
  f => f.endsWith('.glb') && !f.includes('_mid') && !f.includes('_lo')
);

if (files.length === 0) {
  console.log('No base GLB files found in', BUILDINGS_DIR);
  process.exit(0);
}

console.log(`Found ${files.length} model(s):`, files.join(', '));
console.log('');

for (const file of files) {
  const name = basename(file, '.glb');
  const srcPath = `${BUILDINGS_DIR}/${file}`;

  console.log(`Processing: ${file}`);

  let doc;
  try {
    doc = await io.read(srcPath);
  } catch (err) {
    console.error(`  ERROR reading ${file}:`, err.message);
    continue;
  }

  // --- MID LOD: 1K + Draco ---
  try {
    const midDoc = cloneDocument(doc);
    await midDoc.transform(
      dedup(),
      flatten(),
      join(),
      prune(),
      textureCompress({ encoder: sharp, resize: [1024, 1024] }),
      draco({ method: 'edgebreaker', encodeSpeed: 5, decodeSpeed: 5 }),
    );
    const midPath = `${BUILDINGS_DIR}/${name}_mid.glb`;
    await io.write(midPath, midDoc);
    console.log(`  -> ${name}_mid.glb (1K + Draco)`);
  } catch (err) {
    console.error(`  ERROR generating _mid:`, err.message);
  }

  // --- LO LOD: 512px + Draco ---
  try {
    const loDoc = cloneDocument(doc);
    await loDoc.transform(
      dedup(),
      flatten(),
      join(),
      prune(),
      textureCompress({ encoder: sharp, resize: [512, 512] }),
      draco({ method: 'edgebreaker', encodeSpeed: 5, decodeSpeed: 5 }),
    );
    const loPath = `${BUILDINGS_DIR}/${name}_lo.glb`;
    await io.write(loPath, loDoc);
    console.log(`  -> ${name}_lo.glb (512px + Draco)`);
  } catch (err) {
    console.error(`  ERROR generating _lo:`, err.message);
  }

  console.log('');
}

console.log('Done.');
