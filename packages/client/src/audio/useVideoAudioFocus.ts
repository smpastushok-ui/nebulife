// ---------------------------------------------------------------------------
// useVideoAudioFocus — duck background audio while a <video> with sound plays.
//
// Returns play/pause/ended handlers for a <video> element. Internally balanced
// (enter once, exit once) so repeated play/pause/seek events can't drift the
// global reference counter, and focus is always released on unmount.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef } from 'react';
import { enterVideoAudioFocus, exitVideoAudioFocus } from './SfxPlayer.js';

export function useVideoAudioFocus() {
  const active = useRef(false);

  const enter = useCallback(() => {
    if (active.current) return;
    active.current = true;
    enterVideoAudioFocus();
  }, []);

  const exit = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    exitVideoAudioFocus();
  }, []);

  // Always release focus if the component unmounts mid-playback.
  useEffect(() => exit, [exit]);

  return { enterVideoFocus: enter, exitVideoFocus: exit };
}
