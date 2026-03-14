import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  deductQuarks,
  savePlanetModel,
  savePaymentIntent,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { buildPlanetModelPrompt } from '../../packages/server/src/planet-model-prompt-builder.js';
import type { Planet, Star } from '@nebulife/core';

const MODEL_PRICE_QUARKS = 49;

/**
 * POST /api/payment/create
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, planetId, systemId, planetData?, starData? }
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

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { playerId, planetId, systemId, planetData, starData } = req.body;

    if (!playerId || !planetId || !systemId) {
      return res.status(400).json({ error: 'Missing required fields: playerId, planetId, systemId' });
    }

    // Verify player owns this playerId
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
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

      // Save model with paid status + planet/star data for prompt generation
      await savePlanetModel({
        id: modelId,
        playerId,
        planetId,
        systemId,
        planetData: planetData ?? undefined,
        starData: starData ?? undefined,
      });

      // Import here to avoid circular deps
      const { updatePlanetModel } = await import('../../packages/server/src/db.js');
      const { generateImage } = await import('../../packages/server/src/kling-client.js');

      await updatePlanetModel(modelId, {
        payment_status: 'paid',
        status: 'generating_photo',
      });

      // Build rich planet-specific prompt (white background sphere for Tripo3D)
      const klingPrompt = planetData && starData
        ? buildPlanetModelPrompt(planetData as Planet, starData as Star)
        : `Single alien planet sphere, photorealistic, isolated on pure white background, no stars, scientific visualization, 4K`;

      // Create Kling task immediately and store ID — status endpoint will drive the rest
      const { taskId: klingTaskId } = await generateImage({ prompt: klingPrompt, aspectRatio: '1:1' });
      await updatePlanetModel(modelId, { kling_task_id: klingTaskId });

      return res.status(200).json({
        modelId,
        paid: true,
        quarksRemaining: updated.quarks,
      });
    }

    // 3. Not enough quarks — create MonoPay invoice for deficit
    const deficit = MODEL_PRICE_QUARKS - playerQuarks;
    const reference = `model_${modelId}`;

    // Save planet model with pending status + planet/star data
    await savePlanetModel({
      id: modelId,
      playerId,
      planetId,
      systemId,
      paymentId: reference,
      planetData: planetData ?? undefined,
      starData: starData ?? undefined,
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

function getBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'nebulife.space';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
