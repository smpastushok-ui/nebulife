import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  deductQuarks,
  savePlanetModel,
  savePaymentIntent,
} from '../../packages/server/src/db.js';

const MODEL_PRICE_QUARKS = 49;

/**
 * POST /api/payment/create
 *
 * Body: { playerId, planetId, systemId }
 *
 * Quarks-first purchase logic:
 * 1. If player has enough quarks → deduct and start generation immediately
 * 2. If not → create MonoPay invoice for the deficit amount
 *
 * Returns:
 *   { modelId, paid: true, quarksRemaining }
 *   OR
 *   { modelId, paid: false, deficit, invoiceId, payUrl, quarksRemaining }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId, planetId, systemId } = req.body;

    if (!playerId || !planetId || !systemId) {
      return res.status(400).json({ error: 'Missing required fields: playerId, planetId, systemId' });
    }

    // 1. Get player to check quark balance
    const player = await getPlayer(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const modelId = `pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 2. Try to pay with quarks (treat null/undefined as 0)
    const playerQuarks = player.quarks ?? 0;
    if (playerQuarks >= MODEL_PRICE_QUARKS) {
      // Enough quarks — deduct atomically
      const updated = await deductQuarks(playerId, MODEL_PRICE_QUARKS);
      if (!updated) {
        // Race condition: balance changed between check and deduction
        return res.status(409).json({ error: 'Insufficient quarks (race condition)' });
      }

      // Save model with paid status
      await savePlanetModel({
        id: modelId,
        playerId,
        planetId,
        systemId,
      });

      // Import here to avoid circular deps, and start pipeline
      const { updatePlanetModel } = await import('../../packages/server/src/db.js');
      await updatePlanetModel(modelId, {
        payment_status: 'paid',
        status: 'generating_photo',
      });

      // Start generation pipeline async
      startGenerationPipeline(modelId, planetId, systemId).catch((err) => {
        console.error(`Generation pipeline error for model ${modelId}:`, err);
        updatePlanetModel(modelId, { status: 'failed' }).catch(() => {});
      });

      return res.status(200).json({
        modelId,
        paid: true,
        quarksRemaining: updated.quarks,
      });
    }

    // 3. Not enough quarks — create MonoPay invoice for deficit
    const deficit = MODEL_PRICE_QUARKS - playerQuarks;
    const reference = `model_${modelId}`;

    // Save planet model with pending status
    await savePlanetModel({
      id: modelId,
      playerId,
      planetId,
      systemId,
      paymentId: reference,
    });

    // Save payment intent so callback knows what to do
    await savePaymentIntent({
      reference,
      playerId,
      amountQuarks: deficit,
      purpose: 'purchase_model',
      purchaseMeta: {
        modelId,
        planetId,
        systemId,
        fullPrice: MODEL_PRICE_QUARKS,
      },
    });

    // Create Monobank invoice for the deficit
    const monoToken = process.env.MONO_TOKEN;
    if (!monoToken) {
      return res.status(500).json({ error: 'MONO_TOKEN not configured' });
    }

    const baseUrl = getBaseUrl(req);
    const invoiceBody = {
      amount: deficit * 100, // kopiykas
      ccy: 980,
      merchantPaymInfo: {
        reference,
        destination: `Nebulife — 3D модель (${deficit} кварків)`,
        comment: `Поповнення ${deficit} ⚛ для 3D моделі`,
      },
      redirectUrl: `${baseUrl}/?payment=success&modelId=${modelId}`,
      webHookUrl: `${baseUrl}/api/payment/callback`,
    };

    const monoRes = await fetch('https://api.monobank.ua/api/merchant/invoice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': monoToken,
      },
      body: JSON.stringify(invoiceBody),
    });

    if (!monoRes.ok) {
      const errText = await monoRes.text();
      console.error('Monobank invoice error:', monoRes.status, errText);
      return res.status(502).json({ error: 'Failed to create payment invoice' });
    }

    const monoData = (await monoRes.json()) as { invoiceId: string; pageUrl: string };

    return res.status(200).json({
      modelId,
      paid: false,
      deficit,
      invoiceId: monoData.invoiceId,
      payUrl: monoData.pageUrl,
      quarksRemaining: player.quarks,
    });
  } catch (err) {
    console.error('Payment create error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

/**
 * Start the Kling → Tripo pipeline (async, runs after handler responds).
 */
async function startGenerationPipeline(modelId: string, planetId: string, systemId: string) {
  const { updatePlanetModel } = await import('../../packages/server/src/db.js');
  const { generateImage, checkTaskStatus } = await import('../../packages/server/src/kling-client.js');
  const { createModelTask, checkModelTask } = await import('../../packages/server/src/tripo-client.js');

  // Step 1: Generate planet photo with Kling AI
  const prompt = `Hyperrealistic photograph of an alien planet surface and atmosphere from space orbit, planet ID: ${planetId}, star system: ${systemId}. Dramatic lighting, volumetric clouds, detailed terrain, photorealistic quality, cinematic composition, 8K resolution.`;

  const { taskId: klingTaskId } = await generateImage({
    prompt,
    aspectRatio: '1:1',
  });

  // Step 2: Poll Kling until complete
  let imageUrl: string | undefined;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const result = await checkTaskStatus(klingTaskId);
    if (result.status === 'succeed' && result.imageUrl) {
      imageUrl = result.imageUrl;
      break;
    }
    if (result.status === 'failed') {
      throw new Error('Kling photo generation failed');
    }
  }

  if (!imageUrl) throw new Error('Kling photo generation timed out');

  await updatePlanetModel(modelId, {
    kling_photo_url: imageUrl,
    status: 'generating_3d',
  });

  // Step 3: Send to Tripo3D
  const { taskId: tripoTaskId } = await createModelTask(imageUrl);
  await updatePlanetModel(modelId, { tripo_task_id: tripoTaskId });

  // Step 4: Poll Tripo until complete
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const result = await checkModelTask(tripoTaskId);
    if (result.status === 'success' && result.glbUrl) {
      await updatePlanetModel(modelId, {
        glb_url: result.glbUrl,
        status: 'ready',
        completed_at: new Date().toISOString(),
      });
      return;
    }
    if (result.status === 'failed' || result.status === 'cancelled') {
      throw new Error(`Tripo3D generation ${result.status}`);
    }
  }

  throw new Error('Tripo3D generation timed out');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'nebulife.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
