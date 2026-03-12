import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';

// ---------------------------------------------------------------------------
// Gemini AI Image Generation Client
// ---------------------------------------------------------------------------
// Uses Google Gemini (gemini-2.0-flash-preview-image-generation) for synchronous image generation.
// Returns base64 image data, which is then uploaded to Vercel Blob for
// persistent URL storage.
// ---------------------------------------------------------------------------

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';

/**
 * Supported aspect ratios by Gemini.
 * Mapped from closest screen ratio.
 */
const SUPPORTED_RATIOS: Array<{ label: string; value: number }> = [
  { label: '9:16', value: 9 / 16 },
  { label: '3:4', value: 3 / 4 },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
];

export interface GeminiGenerateImageRequest {
  prompt: string;
  screenWidth?: number;
  screenHeight?: number;
  aspectRatio?: string; // Override: '16:9' | '9:16' | '4:3' | '3:4' | '1:1'
}

export interface GeminiGenerateImageResult {
  imageUrl: string;     // Public Vercel Blob URL
  mimeType: string;     // e.g. 'image/png'
  aspectRatio: string;  // Aspect ratio used
}

/**
 * Compute the closest Gemini-supported aspect ratio from screen dimensions.
 */
export function computeAspectRatio(screenWidth: number, screenHeight: number): string {
  const ratio = screenWidth / screenHeight;
  let closest = SUPPORTED_RATIOS[0];
  let minDiff = Math.abs(ratio - SUPPORTED_RATIOS[0].value);

  for (const opt of SUPPORTED_RATIOS) {
    const diff = Math.abs(ratio - opt.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt;
    }
  }

  return closest.label;
}

/**
 * Generate an image using Gemini AI and upload to Vercel Blob.
 *
 * Flow:
 * 1. Call Gemini with prompt + aspect ratio
 * 2. Extract base64 image from response
 * 3. Upload to Vercel Blob for persistent public URL
 * 4. Return the public URL
 */
export async function generateImageWithGemini(
  req: GeminiGenerateImageRequest,
): Promise<GeminiGenerateImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY must be set');
  }

  // Determine aspect ratio
  const aspectRatio = req.aspectRatio ??
    (req.screenWidth && req.screenHeight
      ? computeAspectRatio(req.screenWidth, req.screenHeight)
      : '16:9');

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: req.prompt,
    config: {
      thinkingConfig: { thinkingBudget: 0 }, // MINIMAL — image generation needs no chain-of-thought
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: '2K', // Higher quality output (2048px on larger dimension)
      },
    },
  });

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error('Gemini returned no content parts');
  }

  const imagePart = parts.find(p => p.inlineData?.data);
  if (!imagePart?.inlineData) {
    throw new Error('Gemini returned no image data');
  }

  const { data: base64Data, mimeType } = imagePart.inlineData;
  if (!base64Data || !mimeType) {
    throw new Error('Gemini image data is empty');
  }

  // Convert base64 to Buffer
  const buffer = Buffer.from(base64Data, 'base64');

  // Upload to Vercel Blob
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `system-photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: mimeType,
  });

  return {
    imageUrl: blob.url,
    mimeType,
    aspectRatio,
  };
}
