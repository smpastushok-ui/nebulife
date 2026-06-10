// ---------------------------------------------------------------------------
// share-caption — unified, human social captions for all share actions.
// ---------------------------------------------------------------------------
// Produces text like:
//   "<Name>. Я знайшов нове життя в Nebulife\n<link>"
//   "I found a new planet in Nebulife\n<link>"
// Localized via the i18n instance (works in non-React module helpers too).
// ---------------------------------------------------------------------------

import i18n from '../i18n/index.js';

export type ShareSubject =
  | 'life'      // lifeforms, flora, fauna
  | 'planet'    // planet photos / missions
  | 'system'    // star systems
  | 'cosmos'    // nebulae, galaxies, stars and other cosmic objects
  | 'anomaly'   // anomalies / cosmic events
  | 'world'     // surface landscapes / aerial worlds
  | 'discovery'; // generic fallback

/** Localized "I found new X in Nebulife" line (no link). */
export function shareLine(subject: ShareSubject, lang?: string): string {
  const lng = lang || i18n.language || 'uk';
  return i18n.t(`share.found_${subject}`, {
    lng,
    defaultValue: i18n.t('share.found_discovery', { lng }),
  });
}

/** Full share caption: "<Name>. <line>\n<url>" (name optional). */
export function buildShareCaption(opts: {
  name?: string | null;
  subject: ShareSubject;
  url: string;
  lang?: string;
}): string {
  const line = shareLine(opts.subject, opts.lang);
  const name = opts.name?.trim();
  const head = name ? `${name}. ${line}` : line;
  return `${head}\n${opts.url}`;
}

/** Map a discovery gallery category to a share subject. */
export function subjectFromGalleryCategory(category: string | undefined): ShareSubject {
  switch (category) {
    case 'flora':
    case 'fauna':
      return 'life';
    case 'anomalies':
      return 'anomaly';
    case 'landscapes':
      return 'world';
    case 'cosmos':
      return 'cosmos';
    default:
      return 'discovery';
  }
}
