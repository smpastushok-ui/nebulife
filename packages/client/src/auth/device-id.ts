import { Device } from '@capacitor/device';

// ---------------------------------------------------------------------------
// Stable per-install device identifier — a RECOVERY KEY for guest progress.
//
// Capacitor Device.getId() survives in-place app updates, so the server can
// re-link a guest's player row when the Firebase anonymous UID changes (lost
// WebView session). It is NOT an auth credential — the Firebase token still
// gates every API call. Resolved once and cached for the session.
//
// Caveats: on Android the id resets on reinstall / clear-data; on iOS it is
// identifierForVendor (survives reinstall while another vendor app remains).
// ---------------------------------------------------------------------------

let cached: string | null | undefined;
let inflight: Promise<string | null> | null = null;

export async function getDeviceId(): Promise<string | null> {
  if (cached !== undefined) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { identifier } = await Device.getId();
      cached = identifier && identifier.trim() ? identifier.trim() : null;
    } catch {
      cached = null;
    }
    inflight = null;
    return cached;
  })();
  return inflight;
}
