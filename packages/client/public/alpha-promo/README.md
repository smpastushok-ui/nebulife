# Alpha Promo Videos

Put vertical monetization promo videos in this folder.

Recommended format — ship BOTH files per video:
- `<name>.webm` — VP9 video + Opus audio, primary/smaller (CRF ~30-34)
- `<name>.mp4` — H.264 video + AAC audio, fallback (same content, re-encoded)
- 9:16 vertical frame, 720x1280 or 1080x1920
- 7-20 seconds, optimized for mobile size
- lowercase file names with hyphens, for example `quarks-signal-01.webm` / `.mp4`

Why both formats: WebM/VP9 is not reliably supported across all iOS versions
in WKWebView (partial support before iOS 17.4, and WKWebView-specific bugs
have been reported even on iOS 17/18 — see videojs/video.js#8895). The player
renders the WebM as the first `<source>` and the MP4 as a fallback `<source>`,
so playback stays reliable everywhere while still saving bandwidth on modern
devices that decode WebM fine.

After adding video files, register them in:

`packages/client/src/services/alpha-promo-manager.ts`

Example:

```ts
export const ALPHA_PROMO_VIDEOS: readonly AlphaPromoVideo[] = [
  alphaPromoVideo('quarks-signal-01', 'quarks-signal-01.webm', 'quarks-signal-01.mp4'),
  alphaPromoVideo('alpha-pass-01', 'alpha-pass-01.webm', 'alpha-pass-01.mp4'),
];
```

The game randomly selects one registered video when the Alpha promo is allowed.
If more than one video exists, it avoids showing the same video twice in a row.
