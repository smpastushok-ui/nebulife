import { Application, Container } from 'pixi.js';

export class CameraController {
  private app: Application;
  private target: Container | null = null;
  private isDragging = false;
  private dragStartPos: { x: number; y: number } | null = null;
  private lastPos = { x: 0, y: 0 };
  private scale = 1;
  private minScale = 0.1;
  private maxScale = 5;
  private panBounds: { radius: number } | null = null;

  // Smooth zoom state
  private targetScale = 1;
  private zoomCenterX = 0;
  private zoomCenterY = 0;
  private zoomWorldX = 0;
  private zoomWorldY = 0;
  private _isZooming = false;
  private zoomSettleTimer = 0;

  // Pinch-to-zoom state
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartScale = 0;
  private pinchMidX = 0;
  private pinchMidY = 0;
  private isPinching = false;

  // Click guard: prevent accidental clicks after drag/pinch
  private _dragEndTime = 0;

  // Input toggle for cinematic mode
  private inputEnabled = true;

  // Smooth animation state
  private animating = false;
  private animStartTime = 0;
  private animDuration = 0;
  private animStartX = 0;
  private animStartY = 0;
  private animStartScale = 0;
  private animEndX = 0;
  private animEndY = 0;
  private animEndScale = 0;

  private onWheel: (e: WheelEvent) => void;
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onPointerLeave: (e: PointerEvent) => void;
  private onTouchStart: (e: TouchEvent) => void;

  constructor(app: Application) {
    this.app = app;

    // ── Smooth wheel zoom ────────────────────────────────
    this.onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const target = this.getUsableTarget();
      if (!target || !this.inputEnabled) return;

      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      this.targetScale = Math.max(this.minScale, Math.min(this.maxScale, this.targetScale * factor));

      // Store zoom center in screen coords + world coords for smooth interpolation
      const rect = this.app.canvas.getBoundingClientRect();
      this.zoomCenterX = e.clientX - rect.left;
      this.zoomCenterY = e.clientY - rect.top;
      this.zoomWorldX = (this.zoomCenterX - target.x) / this.scale;
      this.zoomWorldY = (this.zoomCenterY - target.y) / this.scale;

      this._isZooming = true;
      this.zoomSettleTimer = 0;
    };

    // ── Pointer down ────────────────────────────────────
    this.onPointerDown = (e: PointerEvent) => {
      if (!this.inputEnabled) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 2) {
        // Start pinch
        this.startPinch();
      } else if (this.pointers.size === 1) {
        this.isDragging = false;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.lastPos = { x: e.clientX, y: e.clientY };
      }
    };

    // ── Pointer move ────────────────────────────────────
    this.onPointerMove = (e: PointerEvent) => {
      if (!this.inputEnabled || !this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Pinch zoom (2 fingers)
      if (this.pointers.size >= 2 && this.isPinching) {
        this.updatePinch();
        return;
      }

      // Single-finger drag/pan
      const target = this.getUsableTarget();
      if (!this.dragStartPos || !target || this.isPinching) return;
      // Require 5px movement before starting drag (prevents click conflicts)
      if (!this.isDragging) {
        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;
        if (dx * dx + dy * dy < 25) return;
        this.isDragging = true;
      }
      const dx = e.clientX - this.lastPos.x;
      const dy = e.clientY - this.lastPos.y;
      target.x += dx;
      target.y += dy;
      this.clampPan();
      this.lastPos = { x: e.clientX, y: e.clientY };
    };

    // ── Pointer up ──────────────────────────────────────
    this.onPointerUp = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);

      if (this.isPinching) {
        if (this.pointers.size < 2) {
          this.isPinching = false;
          this._dragEndTime = Date.now();
          // Pinch applied zoom directly — stop smooth zoom to prevent snap
          this.targetScale = this.scale;
          this._isZooming = false;
          this.zoomSettleTimer = 0;
        }
        // If one finger remains, re-init drag from current pos
        if (this.pointers.size === 1) {
          const remaining = this.pointers.values().next().value!;
          this.dragStartPos = { x: remaining.x, y: remaining.y };
          this.lastPos = { x: remaining.x, y: remaining.y };
          this.isDragging = false;
        }
        return;
      }

      if (this.isDragging) {
        this._dragEndTime = Date.now();
      }
      this.isDragging = false;
      this.dragStartPos = null;
    };

    // ── Pointer leave ───────────────────────────────────
    this.onPointerLeave = (e: PointerEvent) => {
      this.onPointerUp(e);
    };
    this.onTouchStart = (e: TouchEvent) => e.preventDefault();

    const canvas = this.app.canvas;
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    // Prevent default touch gestures (Safari pinch-to-zoom page, etc.)
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
  }

  private getUsableTarget(): Container | null {
    const target = this.target;
    if (!target) return null;
    if ((target as unknown as { destroyed?: boolean }).destroyed) {
      this.detach();
      return null;
    }
    try {
      if (!target.position || !target.scale) {
        this.detach();
        return null;
      }
    } catch {
      this.detach();
      return null;
    }
    return target;
  }

  // ── Pinch helpers ──────────────────────────────────────

  private startPinch() {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return;
    this.isPinching = true;
    this.isDragging = false;
    this.dragStartPos = null;
    this.pinchStartDist = this.pointerDist(pts[0], pts[1]);
    this.pinchStartScale = this.scale;
    const rect = this.app.canvas.getBoundingClientRect();
    this.pinchMidX = (pts[0].x + pts[1].x) / 2 - rect.left;
    this.pinchMidY = (pts[0].y + pts[1].y) / 2 - rect.top;
    this._isZooming = true;
  }

  private updatePinch() {
    const target = this.getUsableTarget();
    if (!target) return;
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return;

    const dist = this.pointerDist(pts[0], pts[1]);
    const ratio = dist / this.pinchStartDist;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.pinchStartScale * ratio));

    // Zoom toward pinch midpoint
    const rect = this.app.canvas.getBoundingClientRect();
    const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
    const midY = (pts[0].y + pts[1].y) / 2 - rect.top;

    const worldX = (this.pinchMidX - target.x) / this.scale;
    const worldY = (this.pinchMidY - target.y) / this.scale;

    this.scale = newScale;
    this.targetScale = newScale;
    target.scale.set(this.scale);

    target.x = midX - worldX * this.scale;
    target.y = midY - worldY * this.scale;

    // Pan with midpoint movement
    const panDx = midX - this.pinchMidX;
    const panDy = midY - this.pinchMidY;
    // Don't add pan — zoom-to-midpoint already handles repositioning
    this.pinchMidX = midX;
    this.pinchMidY = midY;

    this.clampPan();
    this.zoomSettleTimer = 0;
  }

  private pointerDist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Public API ─────────────────────────────────────────

  /**
   * True if user was dragging/pinching recently (within 300ms).
   * Scene click handlers should check this to block accidental clicks.
   */
  get recentlyInteracted(): boolean {
    return this.isDragging || this.isPinching || (Date.now() - this._dragEndTime < 300);
  }

  /** True while zoom animation is in progress (wheel or pinch). Scenes can pause animations. */
  get isZooming(): boolean {
    return this._isZooming;
  }

  attach(container: Container) {
    this.target = container;
    this.scale = this.target.scale.x || 1;
    this.targetScale = this.scale;
    this.target.scale.set(this.scale);
  }

  detach() {
    this.target = null;
    this._isZooming = false;
    this.zoomSettleTimer = 0;
    this.isDragging = false;
    this.isPinching = false;
    this.dragStartPos = null;
    this.pointers.clear();
  }

  destroy() {
    const canvas = this.app.canvas;
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('touchstart', this.onTouchStart);
    this.target = null;
  }

  /** Smoothly animate camera to center on a world position at a target scale */
  animateTo(worldX: number, worldY: number, targetScaleVal: number, durationMs = 500) {
    if (!this.target) return;
    this.animating = true;
    this.animStartTime = Date.now();
    this.animDuration = durationMs;
    this.animStartX = this.target.x;
    this.animStartY = this.target.y;
    this.animStartScale = this.scale;
    this.animEndScale = Math.max(this.minScale, Math.min(this.maxScale, targetScaleVal));
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.animEndX = w / 2 - worldX * this.animEndScale;
    this.animEndY = h / 2 - worldY * this.animEndScale;
  }

  /** Call from ticker each frame to drive camera animations + smooth zoom */
  update(deltaMs: number) {
    // ── Smooth zoom interpolation ────────────────────────
    const zoomTarget = this.getUsableTarget();
    if (this._isZooming && zoomTarget && !this.isPinching) {
      const diff = this.targetScale - this.scale;
      if (Math.abs(diff) > 0.001) {
        const lerpSpeed = Math.min(1, 8 * (deltaMs / 1000));
        const prevScale = this.scale;
        this.scale += diff * lerpSpeed;
        zoomTarget.scale.set(this.scale);

        // Maintain zoom center
        zoomTarget.x = this.zoomCenterX - this.zoomWorldX * this.scale;
        zoomTarget.y = this.zoomCenterY - this.zoomWorldY * this.scale;
        this.clampPan();
      } else {
        this.scale = this.targetScale;
        zoomTarget.scale.set(this.scale);
        zoomTarget.x = this.zoomCenterX - this.zoomWorldX * this.scale;
        zoomTarget.y = this.zoomCenterY - this.zoomWorldY * this.scale;
        this.clampPan();

        // Keep isZooming true for a short settle period
        this.zoomSettleTimer += deltaMs;
        if (this.zoomSettleTimer > 200) {
          this._isZooming = false;
        }
      }
    }

    // ── Camera animations (animateTo) ────────────────────
    const animTarget = this.getUsableTarget();
    if (!this.animating || !animTarget) return;

    const elapsed = Date.now() - this.animStartTime;
    let t = Math.min(1, elapsed / this.animDuration);
    // Ease out cubic
    t = 1 - Math.pow(1 - t, 3);

    animTarget.x = this.animStartX + (this.animEndX - this.animStartX) * t;
    animTarget.y = this.animStartY + (this.animEndY - this.animStartY) * t;
    this.scale = this.animStartScale + (this.animEndScale - this.animStartScale) * t;
    this.targetScale = this.scale;
    animTarget.scale.set(this.scale);

    if (t >= 1) {
      this.animating = false;
    }
  }

  reset() {
    this.animating = false;
    this.scale = 1;
    this.targetScale = 1;
    this._isZooming = false;
    if (this.target) {
      this.target.scale.set(1);
      const w = this.app.screen.width;
      const h = this.app.screen.height;
      this.target.x = w / 2;
      this.target.y = h / 2;
    }
  }

  /** Override the minimum zoom scale */
  setMinScale(val: number) {
    this.minScale = val;
  }

  /** Set circular pan boundary (world-space radius from origin). null = unlimited. */
  setPanBounds(radius: number | null) {
    this.panBounds = radius !== null ? { radius } : null;
  }

  /** Clamp target position so world origin stays within screen bounds */
  private clampPan() {
    if (!this.target || !this.panBounds) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const cx = w / 2;
    const cy = h / 2;
    const originScreenX = this.target.x;
    const originScreenY = this.target.y;
    const dx = originScreenX - cx;
    const dy = originScreenY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.panBounds.radius * this.scale;
    if (dist > maxDist) {
      const ratio = maxDist / dist;
      this.target.x = cx + dx * ratio;
      this.target.y = cy + dy * ratio;
    }
  }

  /** Get current zoom scale */
  getCurrentScale(): number {
    return this.scale;
  }

  /** Programmatic zoom: factor > 1 = zoom in, < 1 = zoom out. Zooms toward screen center. */
  zoomBy(factor: number) {
    if (!this.target) return;
    this.targetScale = Math.max(this.minScale, Math.min(this.maxScale, this.targetScale * factor));
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.zoomCenterX = w / 2;
    this.zoomCenterY = h / 2;
    this.zoomWorldX = (this.zoomCenterX - this.target.x) / this.scale;
    this.zoomWorldY = (this.zoomCenterY - this.target.y) / this.scale;
    this._isZooming = true;
    this.zoomSettleTimer = 0;
  }

  /** Smoothly center camera on world origin (0,0) at current scale */
  centerOnOrigin() {
    if (!this.target) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.animateTo(0, 0, this.scale, 400);
  }

  /** Smoothly animate to origin AND fit a given world-radius on screen.
   *  Use when the centre button should also zoom in to a meaningful
   *  frame (e.g. home star + Ring 1 on the galaxy scene). */
  focusOnOrigin(worldRadius: number, durationMs = 600) {
    if (!this.target) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const halfScreen = Math.min(w, h) / 2;
    const padding = 0.85;
    const targetScale = worldRadius > 0
      ? Math.min(this.maxScale, Math.max(this.minScale, (halfScreen * padding) / worldRadius))
      : this.scale;
    this.animateTo(0, 0, targetScale, durationMs);
  }

  /** Enable/disable user input (wheel, drag, pinch) without detaching.
   *  Programmatic animateTo() still works when disabled. */
  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
  }


  /** Reset and fit a given world-radius (px) on screen with padding */
  resetToFit(worldRadius: number) {
    if (!this.target) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const halfScreen = Math.min(w, h) / 2;
    const padding = 0.85;
    this.scale = worldRadius > 0
      ? Math.min(this.maxScale, Math.max(this.minScale, (halfScreen * padding) / worldRadius))
      : 1;
    this.targetScale = this.scale;
    this.target.scale.set(this.scale);
    this.target.x = w / 2;
    this.target.y = h / 2;
  }
}
