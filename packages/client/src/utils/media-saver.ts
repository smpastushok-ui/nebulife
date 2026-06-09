// ---------------------------------------------------------------------------
// media-saver — save photos/videos directly to the device gallery on native.
//
// Replaces the old "write to Documents + open Share sheet" flow which forced
// users through share dialogs (and opened the raw blob URL in the browser
// when they cancelled). Uses @capacitor-community/media:
//   - iOS: saves straight to Photos with add-only permission
//     (NSPhotoLibraryAddUsageDescription is already in Info.plist).
//   - Android: saves into a "Nebulife" album via MediaStore
//     (albumIdentifier is required on Android).
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core';

const ALBUM_NAME = 'Nebulife';

async function getAndroidAlbumIdentifier(): Promise<string> {
  const { Media } = await import('@capacitor-community/media');
  const findAlbum = async () => {
    const { albums } = await Media.getAlbums();
    return albums.find((album) => album.name === ALBUM_NAME)?.identifier;
  };
  let identifier = await findAlbum();
  if (!identifier) {
    await Media.createAlbum({ name: ALBUM_NAME });
    identifier = await findAlbum();
  }
  if (!identifier) throw new Error('Failed to create Nebulife album');
  return identifier;
}

/**
 * Save a photo or video directly to the device gallery. Native only —
 * callers must check Capacitor.isNativePlatform() first.
 * The plugin accepts web URLs directly, so no staging download is needed.
 */
export async function saveMediaToGallery(mediaUrl: string, isVideo: boolean): Promise<void> {
  const { Media } = await import('@capacitor-community/media');
  const options = Capacitor.getPlatform() === 'android'
    ? { path: mediaUrl, albumIdentifier: await getAndroidAlbumIdentifier() }
    : { path: mediaUrl };
  if (isVideo) await Media.saveVideo(options);
  else await Media.savePhoto(options);
}

/** True when the share dialog was dismissed by the user (not a real failure). */
export function isShareCancelled(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return message.includes('cancel') || (err instanceof Error && err.name === 'AbortError');
}
