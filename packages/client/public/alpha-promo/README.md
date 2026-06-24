# Alpha Promo Videos

Put vertical monetization promo videos in this folder.

Recommended format:
- `mp4` with H.264 video and AAC audio
- 9:16 vertical frame
- 720x1280 or 1080x1920
- 10-20 seconds
- optimized for mobile size
- lowercase file names with hyphens, for example `quarks-signal-01.mp4`

After adding a video file, register it in:

`packages/client/src/services/alpha-promo-manager.ts`

Example:

```ts
export const ALPHA_PROMO_VIDEOS: readonly AlphaPromoVideo[] = [
  alphaPromoVideo('quarks-signal-01', 'quarks-signal-01.mp4'),
  alphaPromoVideo('alpha-pass-01', 'alpha-pass-01.mp4'),
];
```

The game randomly selects one registered video when the Alpha promo is allowed.
If more than one video exists, it avoids showing the same video twice in a row.
