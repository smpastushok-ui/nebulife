// ---------------------------------------------------------------------------
// ArenaControls — keyboard + mouse controls for Space Arena
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import type { InputState, Vec2 } from './ArenaTypes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isMobileDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Pre-allocated objects — no allocations in hot path
const _raycaster = new THREE.Raycaster();
const _ndcMouse = new THREE.Vector2();
const _yPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y=0 plane
const _rayHit = new THREE.Vector3();

// ---------------------------------------------------------------------------
// ArenaControls class
// ---------------------------------------------------------------------------

export class ArenaControls {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;

  // Internal state
  private keys = new Set<string>();
  private _moveDir: Vec2 = { x: 0, z: 0 };
  private _aimDir: Vec2 = { x: 0, z: 1 };
  private _firing = false;
  private _dash = false;

  // Bound event handlers stored for cleanup
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onContextMenuBound: (e: Event) => void;

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.domElement = domElement;
    this.camera = camera;

    // Bind all handlers once — store refs for later removeEventListener
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onContextMenuBound = (e) => e.preventDefault();

    this.attach();
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Return the current consolidated input state.
   * Called once per frame by ArenaEngine.
   */
  getInput(): InputState {
    this._computeMoveDir();
    return {
      moveDir: { x: this._moveDir.x, z: this._moveDir.z },
      aimDir:  { x: this._aimDir.x,  z: this._aimDir.z  },
      firing:  this._firing,
      dash:    this._dash,
    };
  }

  /**
   * Consume and clear the one-shot dash flag.
   * Should be called immediately after ArenaEngine reads the input.
   */
  consumeDash(): void {
    this._dash = false;
  }

  // ── Mobile joystick API ────────────────────────────────────────────────

  /**
   * Set movement direction from a joystick component.
   * vec should be in XZ space and will be normalized if length > 1.
   */
  setMoveInput(vec: Vec2): void {
    const lenSq = vec.x * vec.x + vec.z * vec.z;
    if (lenSq < 0.0001) {
      this._moveDir.x = 0;
      this._moveDir.z = 0;
    } else if (lenSq > 1) {
      const inv = 1 / Math.sqrt(lenSq);
      this._moveDir.x = vec.x * inv;
      this._moveDir.z = vec.z * inv;
    } else {
      this._moveDir.x = vec.x;
      this._moveDir.z = vec.z;
    }
  }

  /**
   * Set aim direction from a joystick component.
   * vec should be in XZ space and will be normalized.
   */
  setAimInput(vec: Vec2): void {
    const lenSq = vec.x * vec.x + vec.z * vec.z;
    if (lenSq < 0.0001) return; // keep last aim when joystick centered
    const inv = 1 / Math.sqrt(lenSq);
    this._aimDir.x = vec.x * inv;
    this._aimDir.z = vec.z * inv;
  }

  /** Remove all event listeners and free resources. */
  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    this.domElement.removeEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.removeEventListener('mousedown', this.onMouseDownBound);
    this.domElement.removeEventListener('mouseup', this.onMouseUpBound);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
    this.keys.clear();
  }

  /** Returns true if running on a touch device. */
  get isMobile(): boolean {
    return isMobileDevice();
  }

  // ── Private: event attachment ──────────────────────────────────────────

  private attach(): void {
    // Keyboard — global so that focus on the canvas is not required
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);

    // Mouse — scoped to the canvas element
    this.domElement.addEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.addEventListener('mousedown', this.onMouseDownBound);
    this.domElement.addEventListener('mouseup', this.onMouseUpBound);
    this.domElement.addEventListener('contextmenu', this.onContextMenuBound);
  }

  // ── Private: keyboard handlers ─────────────────────────────────────────

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this._dash = true;
    }

    // Prevent browser scroll via arrow keys / space
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  /** Derive normalized movement direction from current key state. */
  private _computeMoveDir(): void {
    if (isMobileDevice()) return; // mobile uses setMoveInput() from joystick

    let dx = 0;
    let dz = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    dz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  dz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dz !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dz *= inv;
    }

    this._moveDir.x = dx;
    this._moveDir.z = dz;
  }

  // ── Private: mouse handlers ────────────────────────────────────────────

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) this._firing = true;
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this._firing = false;
  }

  /**
   * Raycast mouse position onto the Y=0 world plane to derive aim direction
   * relative to the ship position.
   * The caller (ArenaEngine) owns the player position; we compute the world
   * hit point and store it as a direction from origin (engine will translate
   * by player pos if needed, but storing world-space suffices for atan2).
   */
  private onMouseMove(e: MouseEvent): void {
    if (isMobileDevice()) return;

    const rect = this.domElement.getBoundingClientRect();
    _ndcMouse.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
    _ndcMouse.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_ndcMouse, this.camera);

    if (_raycaster.ray.intersectPlane(_yPlane, _rayHit)) {
      // _rayHit is now the world point under the cursor on Y=0
      const len = Math.sqrt(_rayHit.x * _rayHit.x + _rayHit.z * _rayHit.z);
      if (len > 0.01) {
        this._aimDir.x = _rayHit.x / len;
        this._aimDir.z = _rayHit.z / len;
      }
    }
  }
}
