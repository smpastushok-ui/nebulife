import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlanetModel, updatePlanetModel } from '../../../packages/server/src/db.js';
import { checkModelTask } from '../../../packages/server/src/tripo-client.js';

/**
 * GET /api/tripo/glb/:modelId
 *
 * Proxy endpoint for GLB model downloads.
 * Tripo3D's CDN doesn't set CORS headers, so the browser can't fetch GLB
 * files directly from their CloudFront URLs. This endpoint fetches the GLB
 * server-side and streams it to the client with proper CORS headers.
 *
 * If the signed Tripo CDN URL has expired, it re-checks the Tripo task
 * to get a fresh signed URL and updates the DB.
 *
 * Returns: binary GLB file with Content-Type: model/gltf-binary
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { modelId } = req.query;
  if (!modelId || typeof modelId !== 'string') {
    return res.status(400).json({ error: 'Missing modelId parameter' });
  }

  try {
    const model = await getPlanetModel(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.status !== 'ready' || !model.glb_url) {
      return res.status(404).json({ error: 'Model not ready or no GLB URL' });
    }

    let glbUrl = model.glb_url;

    // Try to fetch GLB from stored URL
    let glbResponse = await fetch(glbUrl);

    // If fetch failed (expired signed URL), try to get a fresh URL from Tripo
    if (!glbResponse.ok && model.tripo_task_id) {
      console.log(`GLB proxy: stored URL expired (${glbResponse.status}), refreshing from Tripo task ${model.tripo_task_id}`);
      try {
        const fresh = await checkModelTask(model.tripo_task_id);
        if (fresh.glbUrl) {
          // Save fresh URL to DB for next time
          await updatePlanetModel(modelId, { glb_url: fresh.glbUrl });
          glbUrl = fresh.glbUrl;
          glbResponse = await fetch(glbUrl);
        }
      } catch (refreshErr) {
        console.error('Failed to refresh GLB URL from Tripo:', refreshErr);
      }
    }

    if (!glbResponse.ok) {
      console.error(`Failed to fetch GLB: ${glbResponse.status} from ${glbUrl.substring(0, 80)}...`);
      return res.status(502).json({ error: 'Failed to fetch GLB from provider' });
    }

    const glbBuffer = Buffer.from(await glbResponse.arrayBuffer());

    // Set proper headers for GLB binary
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Length', glbBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1h (URLs expire)
    res.setHeader('Content-Disposition', `inline; filename="${modelId}.glb"`);

    return res.status(200).send(glbBuffer);
  } catch (err) {
    console.error('GLB proxy error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
