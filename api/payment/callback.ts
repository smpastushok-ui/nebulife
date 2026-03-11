import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import {
  getPaymentIntent,
  updatePaymentIntentStatus,
  creditQuarks,
  deductQuarks,
  getPlanetModelByPayment,
  getPlanetModel,
  updatePlanetModel,
} from '../../packages/server/src/db.js';
import { generateImage } from '../../packages/server/src/kling-client.js';
import { buildPlanetModelPrompt } from '../../packages/server/src/planet-model-prompt-builder.js';
import type { Planet, Star } from '@nebulife/core';

/**
 * POST /api/payment/callback
 *
 * Monobank webhook (server-to-server).
 * Intent-based flow:
 *   - 'topup' → creditQuarks
 *   - 'purchase_model' → creditQuarks + deductQuarks(fullPrice) + start generation
 *   - Legacy (no intent) → fallback to planet_model lookup
 */

// Cache for Monobank public key (refreshed every 60 min)
let cachedPubKey: string | null = null;
let pubKeyFetchedAt = 0;

async function getMonoPubKey(): Promise<string> {
  const now = Date.now();
  if (cachedPubKey && now - pubKeyFetchedAt < 3600_000) {
    return cachedPubKey;
  }

  const monoToken = process.env.MONO_TOKEN;
  if (!monoToken) throw new Error('MONO_TOKEN not set');

  const res = await fetch('https://api.monobank.ua/api/merchant/pubkey', {
    headers: { 'X-Token': monoToken },
  });

  if (!res.ok) throw new Error(`Failed to fetch Monobank pubkey: ${res.status}`);

  const data = (await res.json()) as { key: string };
  cachedPubKey = data.key;
  pubKeyFetchedAt = now;
  return data.key;
}

function verifySignature(body: string, xSign: string, pubKeyBase64: string): boolean {
  try {
    const pubKeyDer = Buffer.from(pubKeyBase64, 'base64');
    const publicKey = crypto.createPublicKey({
      key: pubKeyDer,
      format: 'der',
      type: 'spki',
    });

    const verify = crypto.createVerify('SHA256');
    verify.update(body);
    return verify.verify(publicKey, xSign, 'base64');
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get raw body for signature verification
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const xSign = req.headers['x-sign'] as string | undefined;

    if (!xSign) {
      console.error('Mono callback: missing X-Sign header');
      return res.status(400).json({ error: 'Missing X-Sign header' });
    }

    // 2. Verify Monobank signature
    const pubKey = await getMonoPubKey();
    if (!verifySignature(rawBody, xSign, pubKey)) {
      console.error('Mono callback: invalid signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // 3. Parse webhook data
    const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { reference, status: paymentStatus, invoiceId } = webhookData;

    console.log(`Mono callback: ref=${reference}, status=${paymentStatus}, invoice=${invoiceId}`);

    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }

    // 4. Try intent-based flow first
    const intent = await getPaymentIntent(reference);

    if (paymentStatus === 'success') {
      if (intent) {
        // New intent-based flow
        return await handleIntentSuccess(intent.reference, intent, res);
      }

      // Legacy fallback: direct planet model lookup
      const model = await getPlanetModelByPayment(reference);
      if (model) {
        return await handleLegacyModelSuccess(model.id, model.planet_id, model.system_id, res);
      }

      console.error(`Mono callback: no intent or model found for ref=${reference}`);
      return res.status(404).json({ error: 'Payment reference not found' });
    }

    if (paymentStatus === 'failure' || paymentStatus === 'expired' || paymentStatus === 'reversed') {
      if (intent) {
        await updatePaymentIntentStatus(reference, 'failed');
      }
      // Also update model if it exists
      const model = await getPlanetModelByPayment(reference);
      if (model) {
        await updatePlanetModel(model.id, {
          payment_status: 'failed',
          status: 'payment_failed',
        });
      }
      return res.status(200).json({ status: 'payment_failed' });
    }

    // Other statuses (created, processing, hold) — acknowledge
    return res.status(200).json({ status: 'acknowledged' });
  } catch (err) {
    console.error('Payment callback error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

/**
 * Handle intent-based payment success.
 */
async function handleIntentSuccess(
  reference: string,
  intent: { player_id: string; amount_quarks: number; purpose: string; purchase_meta: Record<string, unknown> | null },
  res: VercelResponse,
) {
  // Credit quarks from payment
  await creditQuarks(intent.player_id, intent.amount_quarks);
  await updatePaymentIntentStatus(reference, 'completed');

  if (intent.purpose === 'topup') {
    // Simple top-up — done
    console.log(`Topup completed: ${intent.player_id} +${intent.amount_quarks} quarks`);
    return res.status(200).json({ status: 'ok', type: 'topup' });
  }

  if (intent.purpose === 'purchase_model') {
    // Purchase: credit quarks done, now deduct full price and start generation
    const meta = intent.purchase_meta;
    if (!meta) {
      console.error('purchase_model intent missing purchase_meta');
      return res.status(200).json({ status: 'ok', type: 'purchase_model', warning: 'missing meta' });
    }

    const fullPrice = (meta.fullPrice as number) || 49;
    const modelId = meta.modelId as string;
    const planetId = meta.planetId as string;
    const systemId = meta.systemId as string;

    // Deduct full price from balance
    const deducted = await deductQuarks(intent.player_id, fullPrice);
    if (!deducted) {
      console.error(`Failed to deduct ${fullPrice} quarks for model ${modelId}`);
      return res.status(200).json({ status: 'ok', warning: 'deduction_failed' });
    }

    // Start generation: mark paid, create Kling task, store ID for status endpoint to drive
    await updatePlanetModel(modelId, {
      payment_status: 'paid',
      status: 'generating_photo',
    });

    const model = await getPlanetModel(modelId);
    const klingPrompt = model?.planet_data && model?.star_data
      ? buildPlanetModelPrompt(model.planet_data as unknown as Planet, model.star_data as unknown as Star)
      : `Single alien planet sphere, photorealistic, isolated on pure white background, no stars, scientific visualization, 4K`;
    const { taskId: klingTaskId } = await generateImage({ prompt: klingPrompt, aspectRatio: '1:1' });
    await updatePlanetModel(modelId, { kling_task_id: klingTaskId });

    console.log(`Purchase model completed: ${modelId}, player ${intent.player_id}`);
    return res.status(200).json({ status: 'ok', type: 'purchase_model' });
  }

  if (intent.purpose === 'purchase_surface') {
    // Surface generation purchase — just credit quarks (surface endpoint handles the rest)
    console.log(`Surface purchase top-up completed: ${intent.player_id} +${intent.amount_quarks} quarks`);
    return res.status(200).json({ status: 'ok', type: 'purchase_surface' });
  }

  return res.status(200).json({ status: 'ok' });
}

/**
 * Legacy fallback for old-style planet model payments (without payment_intents).
 */
async function handleLegacyModelSuccess(
  modelId: string,
  planetId: string,
  systemId: string,
  res: VercelResponse,
) {
  await updatePlanetModel(modelId, {
    payment_status: 'paid',
    status: 'generating_photo',
  });

  const legacyModel = await getPlanetModel(modelId);
  const klingPrompt = legacyModel?.planet_data && legacyModel?.star_data
    ? buildPlanetModelPrompt(legacyModel.planet_data as unknown as Planet, legacyModel.star_data as unknown as Star)
    : `Single alien planet sphere, photorealistic, isolated on pure white background, no stars, scientific visualization, 4K`;
  const { taskId: klingTaskId } = await generateImage({ prompt: klingPrompt, aspectRatio: '1:1' });
  await updatePlanetModel(modelId, { kling_task_id: klingTaskId });

  return res.status(200).json({ status: 'ok' });
}

