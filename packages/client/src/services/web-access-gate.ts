/** Temporary web access bypass for demos / video capture. Set VITE_WEB_ACCESS_OPEN=1. */
export function isWebAccessTemporarilyOpen(): boolean {
  const flag = import.meta.env.VITE_WEB_ACCESS_OPEN;
  return flag === '1' || flag === 'true';
}
