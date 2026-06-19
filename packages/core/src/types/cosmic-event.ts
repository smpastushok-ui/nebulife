/**
 * Backend-authored cosmic event (a real or in-lore astronomical happening) the
 * player can anticipate from their orbital telescope / observatory. Authored in
 * the `cosmic_events` Neon table and surfaced read-only to the client. Title is
 * bilingual; imagery is optional (photo first, video later).
 */
export interface CosmicEvent {
  /** Stable id (table primary key as string). */
  id: string;
  titleUk: string;
  titleEn: string;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  /** Event time as epoch milliseconds (UTC). */
  eventTime: number;
  /** Public image URL (Vercel Blob), or null when not yet available. */
  photoUrl?: string | null;
  /** Public video URL (Vercel Blob), or null. */
  videoUrl?: string | null;
}
