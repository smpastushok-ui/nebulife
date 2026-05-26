import { useEffect, useRef, useState } from 'react';

/** Append a cache-busting query param without breaking existing search params. */
function withCacheBust(url: string, attempt: number): string {
  if (attempt <= 0) return url;
  const token = `_nr=${Date.now()}`;
  return url.includes('?') ? `${url}&${token}` : `${url}?${token}`;
}

async function verifyImageBlob(blob: Blob): Promise<void> {
  if (blob.size < 512) {
    throw new Error('Image blob too small');
  }

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    if (bitmap.width < 16 || bitmap.height < 16) {
      bitmap.close();
      throw new Error('Image dimensions invalid');
    }
    bitmap.close();
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth < 16 || img.naturalHeight < 16) {
          reject(new Error('Image dimensions invalid'));
          return;
        }
        void img.decode().then(() => resolve()).catch(() => resolve());
      };
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchVerifiedBlob(url: string, attempt: number): Promise<Blob> {
  const res = await fetch(withCacheBust(url, attempt), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const blob = await res.blob();
  await verifyImageBlob(blob);
  return blob;
}

/**
 * Loads gallery / discovery images as a verified blob URL.
 * Avoids Android WebView showing a half-decoded progressive JPEG from cache.
 */
export function useReliableImage(sourceUrl: string | null | undefined) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!sourceUrl);
  const [failed, setFailed] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sourceUrl) {
      setDisplayUrl(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;

    const revokeObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    const load = async () => {
      setLoading(true);
      setFailed(false);
      revokeObjectUrl();
      setDisplayUrl(null);

      for (let attempt = 0; attempt < 3; attempt++) {
        if (cancelled) return;
        try {
          const blob = await fetchVerifiedBlob(sourceUrl, attempt);
          if (cancelled) return;
          const nextUrl = URL.createObjectURL(blob);
          objectUrlRef.current = nextUrl;
          setDisplayUrl(nextUrl);
          setLoading(false);
          setFailed(false);
          return;
        } catch {
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          }
        }
      }

      if (!cancelled) {
        setDisplayUrl(sourceUrl);
        setLoading(false);
        setFailed(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
      revokeObjectUrl();
    };
  }, [sourceUrl]);

  return {
    displayUrl,
    loading,
    failed,
  };
}
