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
  private onPointerUp: () => void;

  constructor(app: Application) {
    this.app = app;

    this.onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!this.target) return;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));

      // Zoom toward cursor position
      const rect = this.app.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - this.target.x) / this.scale;
      const worldY = (mouseY - this.target.y) / this.scale;

      this.scale = newScale;
      this.target.scale.set(this.scale);

      this.target.x = mouseX - worldX * this.scale;
      this.target.y = mouseY - worldY * this.scale;
    };

    this.onPointerDown = (e: PointerEvent) => {
      this.isDragging = false;
      this.dragStartPos = { x: e.clientX, y: e.clientY };
      this.lastPos = { x: e.clientX, y: e.clientY };
    };

    this.onPointerMove = (e: PointerEvent) => {
      if (!this.dragStartPos || !this.target) return;
      // Require 3px movement before starting drag (prevents click conflicts)
      if (!this.isDragging) {
        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;
        if (dx * dx + dy * dy < 9) return;
        this.isDragging = true;
      }
      const dx = e.clientX - this.lastPos.x;
      const dy = e.clientY - this.lastPos.y;
      this.target.x += dx;
      this.target.y += dy;
      this.lastPos = { x: e.clientX, y: e.clientY };
    };

    this.onPointerUp = () => {
      this.isDragging = false;
      this.dragStartPos = null;
    };

    const canvas = this.app.canvas;
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
  }

  attach(container: Container) {
    this.target = container;
    this.target.scale.set(this.scale);
  }

  detach() {
    this.target = null;
  }

  destroy() {
    const canvas = this.app.canvas;
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.target = null;
  }

  /** Smoothly animate camera to center on a world position at a target scale */
  animateTo(worldX: number, worldY: number, targetScale: number, durationMs = 500) {
    if (!this.target) return;
    this.animating = true;
    this.animStartTime = Date.now();
    this.animDuration = durationMs;
    this.animStartX = this.target.x;
    this.animStartY = this.target.y;
    this.animStartScale = this.scale;
    this.animEndScale = Math.max(this.minScale, Math.min(this.maxScale, targetScale));
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.animEndX = w / 2 - worldX * this.animEndScale;
    this.animEndY = h / 2 - worldY * this.animEndScale;
  }

  /** Call from ticker each frame to drive camera animations */
  update(_deltaMs: number) {
    if (!this.animating || !this.target) return;

    const elapsed = Date.now() - this.animStartTime;
    let t = Math.min(1, elapsed / this.animDuration);
    // Ease out cubic
    t = 1 - Math.pow(1 - t, 3);

    this.target.x = this.animStartX + (this.animEndX - this.animStartX) * t;
    this.target.y = this.animStartY + (this.animEndY - this.animStartY) * t;
    this.scale = this.animStartScale + (this.animEndScale - this.animStartScale) * t;
    this.target.scale.set(this.scale);

    if (t >= 1) {
      this.animating = false;
    }
  }

  reset() {
    this.animating = false;
    this.scale = 1;
    if (this.target) {
      this.target.scale.set(1);
      // Center the view
      const w = this.app.screen.width;
      const h = this.app.screen.height;
      this.target.x = w / 2;
      this.target.y = h / 2;
    }
  }

  /** Reset and fit a given world-radius (px) on screen with padding */
  resetToFit(worldRadius: number) {
    if (!this.target) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const halfScreen = Math.min(w, h) / 2;
    const padding = 0.85; // 15% padding from edges
    this.scale = worldRadius > 0
      ? Math.min(this.maxScale, Math.max(this.minScale, (halfScreen * padding) / worldRadius))
      : 1;
    this.target.scale.set(this.scale);
    this.target.x = w / 2;
    this.target.y = h / 2;
  }
}
