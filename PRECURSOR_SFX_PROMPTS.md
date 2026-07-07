# Precursor Signals — acquisition SFX prompts

4 selectable acquisition stingers for "Сигнали Предтеч" (card gallery → sound
picker, slot 1-4, default 1). Played once, at the moment the card flips
face-up in `PrecursorAcquisitionOverlay`.

Status: **already generated** via ElevenLabs (server-side `ELEVENLABS_API_KEY`
was available) and committed to
`packages/client/public/sfx/precursor/acquire-{1..4}.mp3` (+`.webm`). These
prompts are kept here so the owner can re-roll any variant by hand if desired.

Regenerate with:

```bash
node scripts/sfx/generate.mjs --group precursor          # only missing files
node scripts/sfx/generate.mjs --group precursor --force  # re-roll all 4
node scripts/sfx/generate.mjs --only precursor/acquire-2 --force --prompt "..."  # re-roll one, custom prompt
```

The manifest entry lives in `scripts/sfx/prompts.json` under `"precursor"`.

## Slot 1 — Crystalline ping

> A single crystalline ping, a bright glassy bell-like chime with a long
> shimmering decay, clean and precise, a moment of discovery, one-shot

Duration: ~2.5s · one-shot (no loop)

## Slot 2 — Low ancient hum swell

> A low ancient hum slowly swelling into a warm resonant drone, deep and
> vast like an old machine waking up, dignified and mysterious, one-shot

Duration: ~3s · one-shot (no loop)

## Slot 3 — Radio-burst decode

> A short radio burst decoding into a clean confirmation tone, digital
> data-static resolving into a clear bright pulse, a signal being
> successfully decrypted, one-shot

Duration: ~2.5s · one-shot (no loop)

## Slot 4 — Harmonic choir pulse

> A harmonic choir pulse, layered ethereal vocal-like pad tones swelling
> together in a single consonant chord, otherworldly and reverent, one-shot

Duration: ~3s · one-shot (no loop)

## Fallback behavior

If a slot's mp3 is ever missing, `playSfx()` in `SfxPlayer.ts` fails silently
(caught `.catch()` on `audio.play()`) — the acquisition animation still plays
in full, just without sound for that slot.
