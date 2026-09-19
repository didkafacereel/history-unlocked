/**
 * Image generation providers, tried in order of configuration:
 *
 *  1. HF_TOKEN            → Hugging Face Inference Providers (FLUX.1-schnell
 *                           by default, override via HF_IMAGE_MODEL).
 *  2. POLLINATIONS_TOKEN  → Pollinations (token required since their 2026
 *                           move away from anonymous access).
 *
 * No token at all is a configuration error — the generator fails fast with
 * setup instructions instead of burning retries on 402s.
 */

export interface ImageRequest {
  prompt: string;
  seed: number;
  width: number;
  height: number;
}

export async function generateImage(request: ImageRequest): Promise<Buffer> {
  if (process.env.HF_TOKEN) {
    return viaHuggingFace(request);
  }
  if (process.env.POLLINATIONS_TOKEN) {
    return viaPollinations(request);
  }
  throw new Error(
    'No image provider configured. Set HF_TOKEN (free at https://hf.co/settings/tokens, ' +
      'uses FLUX.1-schnell) or POLLINATIONS_TOKEN (https://auth.pollinations.ai). ' +
      'Existing images are reused without any token.',
  );
}

export function activeProviderName(): string {
  if (process.env.HF_TOKEN) {
    return `huggingface:${process.env.HF_IMAGE_MODEL ?? 'black-forest-labs/FLUX.1-schnell'}`;
  }
  if (process.env.POLLINATIONS_TOKEN) {
    return 'pollinations';
  }
  return 'none (reuse-only)';
}

async function viaHuggingFace({ prompt, seed, width, height }: ImageRequest): Promise<Buffer> {
  const { InferenceClient } = await import('@huggingface/inference');
  const client = new InferenceClient(process.env.HF_TOKEN);

  const blob = await client.textToImage(
    {
      provider: 'auto',
      model: process.env.HF_IMAGE_MODEL ?? 'black-forest-labs/FLUX.1-schnell',
      inputs: prompt,
      parameters: { width, height, seed, num_inference_steps: 6 },
    },
    { outputType: 'blob' },
  );
  return Buffer.from(await blob.arrayBuffer());
}

async function viaPollinations({ prompt, seed, width, height }: ImageRequest): Promise<Buffer> {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.POLLINATIONS_TOKEN}` },
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    throw new Error(`Pollinations responded ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5_000) {
    throw new Error(`Pollinations returned a suspiciously small payload (${buffer.length} B)`);
  }
  return buffer;
}
