// ---------------------------------------------------------------------------
// Fast text moderation — non-AI stop-list applied at message-send time.
// ---------------------------------------------------------------------------
// Blocks the worst, unambiguous content (severe slurs, hate, sexual
// exploitation) instantly and for free, before anything is stored. Nuanced /
// context-dependent cases are NOT handled here — those still rely on player
// reports → Gemini (api/cron/moderate). Keep this list conservative: it is
// better to under-block (and let a report catch it) than to false-positive on
// innocent words.
// ---------------------------------------------------------------------------

export interface QuickModerationResult {
  blocked: boolean;
  category?: string;
}

// Common character substitutions used to dodge filters (leetspeak / symbols).
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't',
  '@': 'a', '$': 's', '!': 'i', '€': 'e',
};

interface BanEntry {
  /** Lowercase, normalized term (latin or cyrillic). */
  term: string;
  category: 'slur' | 'hate' | 'sexual_minor' | 'profanity';
  /** Match as a word prefix (token.startsWith) — for heavily-inflected stems. */
  stem?: boolean;
  /** Also match against the de-spaced text to catch obfuscation (f u c k). */
  obf?: boolean;
  /** Match as a substring of the whole cleaned string (multi-word phrases). */
  phrase?: boolean;
}

// Curated baseline. Extend as needed. Cyrillic entries use `stem` because the
// language is highly inflected; latin slurs use exact-token + `obf` to avoid
// the "Scunthorpe problem" (e.g. matching "ass" inside "class").
const BANNED: BanEntry[] = [
  // ── sexual exploitation of minors (zero tolerance) ──────────────────────
  { term: 'childporn', category: 'sexual_minor', obf: true, phrase: true },
  { term: 'child porn', category: 'sexual_minor', phrase: true },
  { term: 'pedophile', category: 'sexual_minor', obf: true },
  { term: 'pedophil', category: 'sexual_minor', stem: true },
  { term: 'paedophile', category: 'sexual_minor', obf: true },
  { term: 'pedo', category: 'sexual_minor', obf: true },
  { term: 'loli', category: 'sexual_minor', obf: true },
  { term: 'shota', category: 'sexual_minor', obf: true },
  { term: 'педофил', category: 'sexual_minor', stem: true },
  { term: 'педофіл', category: 'sexual_minor', stem: true },

  // ── racial / ethnic / homophobic slurs ──────────────────────────────────
  { term: 'nigger', category: 'slur', obf: true },
  { term: 'nigga', category: 'slur', obf: true },
  { term: 'faggot', category: 'slur', obf: true },
  { term: 'retard', category: 'slur', obf: true },
  { term: 'kike', category: 'slur', obf: true },
  { term: 'tranny', category: 'slur', obf: true },
  { term: 'жид', category: 'slur' },
  { term: 'пидор', category: 'slur', stem: true },
  { term: 'пидар', category: 'slur', stem: true },
  { term: 'педик', category: 'slur', stem: true },

  // ── strong profanity ────────────────────────────────────────────────────
  { term: 'motherfucker', category: 'profanity', obf: true },
  { term: 'fuck', category: 'profanity', obf: true },
  { term: 'fuk', category: 'profanity', obf: true },
  { term: 'cunt', category: 'profanity', obf: true },
  { term: 'whore', category: 'profanity', obf: true },
  { term: 'shit', category: 'profanity', obf: true },
  { term: 'bitch', category: 'profanity', obf: true },
  { term: 'asshole', category: 'profanity', obf: true },
  { term: 'bastard', category: 'profanity', obf: true },
  { term: 'сука', category: 'profanity' },
  { term: 'хуй', category: 'profanity', stem: true },
  { term: 'хуёв', category: 'profanity', stem: true },
  { term: 'хуев', category: 'profanity', stem: true },
  { term: 'пизд', category: 'profanity', stem: true },
  { term: 'пізд', category: 'profanity', stem: true },
  { term: 'ебат', category: 'profanity', stem: true },
  { term: 'ебан', category: 'profanity', stem: true },
  { term: 'ебал', category: 'profanity', stem: true },
  { term: 'еблан', category: 'profanity', stem: true },
  { term: 'іба', category: 'profanity', stem: true },
  { term: 'ебу', category: 'profanity', stem: true },
  { term: 'долбоеб', category: 'profanity', stem: true },
  { term: 'бляд', category: 'profanity', stem: true },
  { term: 'блят', category: 'profanity', stem: true },
  { term: 'залуп', category: 'profanity', stem: true },
  { term: 'мудак', category: 'profanity', stem: true },
  { term: 'гандон', category: 'profanity', stem: true },
  { term: 'гондон', category: 'profanity', stem: true },
];

interface Normalized {
  cleaned: string;
  tokens: string[];
  collapsed: string;
}

function normalize(input: string): Normalized {
  // NFC only — do NOT NFKD-strip combining marks: that corrupts distinct
  // Cyrillic letters (й→и, ё→е, ї→і) and would let "хуйло" slip past.
  let s = input.toLowerCase().normalize('NFC');
  // Fold near-identical Cyrillic vowels so one stem covers uk/ru spellings
  // (єбати↔ебати, ёбаный↔ебаный, їбати↔ібати). Matching-only, never displayed.
  s = s.replace(/є/g, 'е').replace(/ё/g, 'е').replace(/ї/g, 'і');
  s = s.replace(/[0134579@$!€]/g, (c) => LEET[c] ?? c);
  // Collapse 3+ repeats: "fuuuuck" -> "fuuck", "хуууй" -> "хууй".
  s = s.replace(/(.)\1{2,}/g, '$1$1');
  // Keep latin + cyrillic letters and apostrophes; everything else is a gap.
  const cleaned = s.replace(/[^a-zа-яёіїєґ']+/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = cleaned ? cleaned.split(' ') : [];
  const collapsed = tokens.join('');
  return { cleaned, tokens, collapsed };
}

/**
 * Returns `{ blocked: true, category }` if the text trips the stop-list.
 * Designed to be cheap and called on every outbound chat message.
 */
export function quickModerate(content: string): QuickModerationResult {
  if (!content) return { blocked: false };
  const { cleaned, tokens, collapsed } = normalize(content);
  if (!cleaned) return { blocked: false };

  for (const entry of BANNED) {
    if (entry.phrase) {
      const needle = entry.term.replace(/\s+/g, ' ');
      if (cleaned.includes(needle)) return { blocked: true, category: entry.category };
      if (entry.obf && collapsed.includes(needle.replace(/\s+/g, ''))) {
        return { blocked: true, category: entry.category };
      }
      continue;
    }

    for (const tok of tokens) {
      if (entry.stem ? tok.startsWith(entry.term) : tok === entry.term) {
        return { blocked: true, category: entry.category };
      }
    }

    if (entry.obf && collapsed.includes(entry.term)) {
      return { blocked: true, category: entry.category };
    }
  }

  return { blocked: false };
}
