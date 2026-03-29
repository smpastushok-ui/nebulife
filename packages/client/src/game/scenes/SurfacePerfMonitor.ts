/**
 * SurfacePerfMonitor.ts
 * Performance monitoring overlay for the surface scene.
 * Activated by URL parameter ?perf=1 — invisible in production.
 *
 * Tracks:
 *   - Init timings (one-shot): pixijs, api, textures, ground, fog, buildings, total
 *   - Per-frame timings (rolling): total frame, bot, bldg-fx, hub-fx
 *   - FPS (rolling average over 60 frames)
 *   - PixiJS object counts
 */

import type { Application } from 'pixi.js';

export class SurfacePerfMonitor {
  public readonly enabled: boolean;

  // Init marks: label → [startTime, endTime | null]
  private _marks = new Map<string, [number, number | null]>();

  // Per-frame section timings (latest)
  private _frameSections = new Map<string, number>();

  // FPS tracking
  private _frameTimes: number[] = [];
  private _lastFrameStart = 0;
  private _fps = 0;
  private _avgFrameMs = 0;

  // DOM overlay
  private _overlay: HTMLDivElement | null = null;
  private _updateTimer: ReturnType<typeof setInterval> | null = null;

  // PixiJS app reference for object counting
  private _app: Application | null = null;

  constructor() {
    this.enabled = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('perf');
  }

  setApp(app: Application): void { this._app = app; }

  // ─── Init marks ──────────────────────────────────────────────────────────

  markStart(label: string): void {
    if (!this.enabled) return;
    this._marks.set(label, [performance.now(), null]);
  }

  markEnd(label: string): number {
    if (!this.enabled) return 0;
    const m = this._marks.get(label);
    if (!m) return 0;
    m[1] = performance.now();
    return m[1] - m[0];
  }

  markSkip(label: string): void {
    if (!this.enabled) return;
    this._marks.set(label, [-1, -1]); // sentinel for "skipped"
  }

  private _getMarkMs(label: string): string {
    const m = this._marks.get(label);
    if (!m) return '-';
    if (m[0] === -1) return 'SKIP';
    if (m[1] === null) return '...';
    return `${(m[1] - m[0]).toFixed(0)}ms`;
  }

  // ─── Per-frame timing ────────────────────────────────────────────────────

  frameStart(): void {
    if (!this.enabled) return;
    this._lastFrameStart = performance.now();
    this._frameSections.clear();
  }

  sectionStart(label: string): void {
    if (!this.enabled) return;
    this._frameSections.set(`_s_${label}`, performance.now());
  }

  sectionEnd(label: string): void {
    if (!this.enabled) return;
    const start = this._frameSections.get(`_s_${label}`);
    if (start !== undefined) {
      this._frameSections.set(label, performance.now() - start);
      this._frameSections.delete(`_s_${label}`);
    }
  }

  sectionSkip(label: string): void {
    if (!this.enabled) return;
    this._frameSections.set(label, -1); // sentinel for "skipped"
  }

  frameEnd(): void {
    if (!this.enabled) return;
    const now = performance.now();
    const frameMs = now - this._lastFrameStart;
    this._frameTimes.push(frameMs);
    if (this._frameTimes.length > 60) this._frameTimes.shift();

    const sum = this._frameTimes.reduce((a, b) => a + b, 0);
    this._avgFrameMs = sum / this._frameTimes.length;
    this._fps = this._avgFrameMs > 0 ? 1000 / this._avgFrameMs : 0;
  }

  private _getSectionMs(label: string): string {
    const v = this._frameSections.get(label);
    if (v === undefined) return '-';
    if (v === -1) return 'SKIP';
    return `${v.toFixed(1)}ms`;
  }

  // ─── Object counting ─────────────────────────────────────────────────────

  private _countObjects(): { sprites: number; graphics: number; total: number } {
    if (!this._app) return { sprites: 0, graphics: 0, total: 0 };
    let sprites = 0, graphics = 0, total = 0;
    const walk = (obj: any) => {
      total++;
      if (obj.constructor?.name === 'Sprite') sprites++;
      else if (obj.constructor?.name === 'Graphics') graphics++;
      if (obj.children) for (const c of obj.children) walk(c);
    };
    walk(this._app.stage);
    return { sprites, graphics, total };
  }

  // ─── DOM Overlay ─────────────────────────────────────────────────────────

  mount(container: HTMLElement): void {
    if (!this.enabled) return;

    this._overlay = document.createElement('div');
    Object.assign(this._overlay.style, {
      position: 'absolute',
      top: '8px',
      left: '8px',
      background: 'rgba(2,5,16,0.88)',
      color: '#44ff88',
      fontFamily: 'monospace',
      fontSize: '11px',
      lineHeight: '1.5',
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #334455',
      zIndex: '99999',
      pointerEvents: 'none',
      whiteSpace: 'pre',
      minWidth: '220px',
    });
    container.style.position = 'relative';
    container.appendChild(this._overlay);

    // Update overlay every 500ms
    this._updateTimer = setInterval(() => this._renderOverlay(), 500);
    this._renderOverlay();
  }

  private _renderOverlay(): void {
    if (!this._overlay) return;

    const obj = this._countObjects();

    const lines = [
      `SURFACE PERF`,
      `FPS: ${this._fps.toFixed(1)}  Frame: ${this._avgFrameMs.toFixed(1)}ms`,
      ``,
      `Init:`,
      `  pixijs:     ${this._getMarkMs('pixijs-init')}`,
      `  api:        ${this._getMarkMs('api-load')}`,
      `  textures:   ${this._getMarkMs('texture-load')}`,
      `  ground:     ${this._getMarkMs('ground-layer')}`,
      `  fog:        ${this._getMarkMs('fog-init')}`,
      `  buildings:  ${this._getMarkMs('bldg-rebuild')}`,
      `  bots:       ${this._getMarkMs('bot-spawn')}`,
      `  TOTAL:      ${this._getMarkMs('total-init')}`,
      ``,
      `Frame:`,
      `  bot:        ${this._getSectionMs('bot')}`,
      `  bldg-fx:    ${this._getSectionMs('bldg-fx')}`,
      `  hub-fx:     ${this._getSectionMs('hub-fx')}`,
      `  harvest:    ${this._getSectionMs('harvest')}`,
      `  fog-reveal: ${this._getSectionMs('fog-reveal')}`,
      ``,
      `Objects: ${obj.sprites}sp ${obj.graphics}gfx (${obj.total} total)`,
    ];

    this._overlay.textContent = lines.join('\n');
  }

  destroy(): void {
    if (this._updateTimer) clearInterval(this._updateTimer);
    this._overlay?.remove();
    this._overlay = null;
  }
}
