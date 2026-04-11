import type { VercelRequest, VercelResponse } from '@vercel/node';

// 3D planet model generation removed. This endpoint is no longer active.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({ error: 'Feature removed' });
}
