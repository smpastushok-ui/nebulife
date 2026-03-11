import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlanetModel } from '../../../packages/server/src/db.js';

/**
 * GET /api/tripo/glb/:modelId
 *
 * Proxy endpoint for GLB model downloads.
 * Tripo3D's CDN doesn't set CORS headers, so the browser can't fetch GLB
 * files directly from their CloudFront URLs. This endpoint fetches the GLB
 * server-side and streams it to the client with proper CORS headers.
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

    // Fetch GLB from Tripo CDN (server-side, no CORS issues)
    const glbResponse = await fetch(model.glb_url);
    if (!glbResponse.ok) {
      console.error(`Failed to fetch GLB from Tripo: ${glbResponse.status}`);
      return res.status(502).json({ error: 'Failed to fetch GLB from provider' });
    }

    const glbBuffer = Buffer.from(await glbResponse.arrayBuffer());

    // Set proper headers for GLB binary
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Length', glbBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
    res.setHeader('Content-Disposition', `inline; filename="${modelId}.glb"`);

    return res.status(200).send(glbBuffer);
  } catch (err) {
    console.error('GLB proxy error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
