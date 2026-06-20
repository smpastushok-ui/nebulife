// ---------------------------------------------------------------------------
// InterstitialManager — disabled compatibility shim
// ---------------------------------------------------------------------------

// =============================================================================
// ADS_DISABLED_FOR_TESTING — INTERSTITIAL ads switch (this file only).
// When true: no interstitials, no AdMob init through this path.
//
// Current policy: INTERSTITIAL (interruptive full-screen) ads are intentionally
// DISABLED — they interrupt gameplay without giving the player anything. Only
// opt-in REWARDED ads (watch → get quarks / AI generation) remain enabled, via
// the separate flag in ads-service.ts.
// =============================================================================
class InterstitialManager {
  private _isPremium = false;
  public sessionStartTime = Date.now();

  canShow(): boolean {
    return false;
  }

  async tryShow(): Promise<boolean> {
    return false;
  }

  async prepareNext(): Promise<void> {
    return;
  }

  setPremium(active: boolean): void {
    this._isPremium = active;
  }

  get isPremiumActive(): boolean {
    return this._isPremium;
  }
}

export const interstitialManager = new InterstitialManager();
