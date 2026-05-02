import { Application, Container, Graphics } from 'pixi.js';
import {
  RAID_ACTIVE_ENEMIES_HIGH,
  RAID_ACTIVE_ENEMIES_MID,
  RAID_ALLY_DAMAGE,
  RAID_ALLY_HP,
  RAID_ALLY_SHIELD,
  RAID_DRONE_HP,
  RAID_ENEMY_DAMAGE,
  RAID_PLAYER_HP,
  RAID_PLAYER_SHIELD,
  RAID_PROJECTILE_DAMAGE,
  RAID_PROJECTILE_LIFETIME,
  RAID_PROJECTILE_SPEED,
  RAID_REWARD_BASE_XP,
  RAID_REWARD_XP_PER_KILL,
  RAID_REWARD_XP_PER_MODULE,
  RAID_SHIELD_REGEN_DELAY,
  RAID_SHIELD_REGEN_RATE,
  RAID_SPEED,
  RAID_WAVES,
  RAID_WINGMEN,
} from './RaidConstants.js';
import type { RaidCallbacks, RaidPhase, RaidResult, RaidSnapshot, RaidTeam } from './RaidTypes.js';
import { getDeviceTier } from '../../utils/device-tier.js';

type SectorAction = 'center' | 'missile' | 'warp' | 'dodge' | 'gravity';

interface PixiShip {
  id: number;
  team: RaidTeam;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  radius: number;
  fireCooldown: number;
  shieldDelay: number;
  alive: boolean;
  view: Container;
}

interface PixiModule {
  id: string;
  type: 'hangar_bay' | 'shield_emitter' | 'turret_cluster' | 'reactor_core';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  alive: boolean;
  fireCooldown: number;
  view: Container;
}

interface PixiProjectile {
  active: boolean;
  team: RaidTeam;
  damage: number;
  age: number;
  lifetime: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  view: Graphics;
}

const WORLD_W = 2200;
const WORLD_H = 1400;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  return len > 0.0001 ? { x: x / len, y: y / len } : { x: 0, y: -1 };
}

function drawShip(color: number, scale = 1): Container {
  const root = new Container();
  const g = new Graphics();
  g.poly([0, -18 * scale, 12 * scale, 14 * scale, 0, 8 * scale, -12 * scale, 14 * scale]);
  g.fill(color);
  g.stroke({ color: 0xaabbcc, alpha: 0.45, width: 1 });
  g.moveTo(-7 * scale, 11 * scale);
  g.lineTo(7 * scale, 11 * scale);
  g.stroke({ color: 0x7bb8ff, alpha: 0.55, width: 2 });
  root.addChild(g);
  return root;
}

function drawDrone(): Container {
  const root = new Container();
  const g = new Graphics();
  g.poly([0, 14, 13, -10, 0, -4, -13, -10]);
  g.fill(0xcc4444);
  g.stroke({ color: 0xff8844, alpha: 0.55, width: 1 });
  root.addChild(g);
  return root;
}

function drawModule(type: PixiModule['type']): Container {
  const root = new Container();
  const color = type === 'reactor_core' ? 0xff8844 : type === 'shield_emitter' ? 0x4488aa : type === 'turret_cluster' ? 0xddaa44 : 0x667788;
  const g = new Graphics();
  if (type === 'reactor_core') {
    g.circle(0, 0, 38).fill({ color, alpha: 0.78 }).stroke({ color: 0xffcc88, alpha: 0.7, width: 2 });
    g.circle(0, 0, 16).stroke({ color: 0xffcc88, alpha: 0.6, width: 2 });
  } else {
    g.roundRect(-34, -18, 68, 36, 4).fill({ color, alpha: 0.72 }).stroke({ color: 0xaabbcc, alpha: 0.35, width: 1 });
  }
  root.addChild(g);
  return root;
}

export class RaidEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: RaidCallbacks;
  private readonly tier = getDeviceTier();
  private readonly maxActiveEnemies = this.tier === 'high' || this.tier === 'ultra' ? RAID_ACTIVE_ENEMIES_HIGH : RAID_ACTIVE_ENEMIES_MID;
  private app: Application | null = null;
  private world = new Container();
  private background = new Graphics();
  private carrier = new Container();
  private player: PixiShip | null = null;
  private wingmen: PixiShip[] = [];
  private enemies: PixiShip[] = [];
  private modules: PixiModule[] = [];
  private projectiles: PixiProjectile[] = [];
  private keys = new Set<string>();
  private moveInput = { x: 0, y: 0 };
  private aimInput = { x: 0, y: -1 };
  private sectorAction: SectorAction = 'center';
  private phase: RaidPhase = 'approach';
  private startedAt = 0;
  private kills = 0;
  private modulesDestroyed = 0;
  private nextWaveIndex = 0;
  private snapshotTimer = 0;
  private ended = false;

  constructor(container: HTMLElement, callbacks: RaidCallbacks, _shipId: string) {
    this.container = container;
    this.callbacks = callbacks;
  }

  async init(): Promise<void> {
    this.startedAt = performance.now();
    this.app = new Application();
    await this.app.init({
      background: 0x020510,
      resizeTo: this.container,
      antialias: this.tier !== 'low',
      resolution: Math.min(window.devicePixelRatio || 1, this.tier === 'low' ? 1 : 1.4),
      autoDensity: true,
    });
    this.container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.background, this.world);
    this.createBackdrop();
    this.createCarrier();
    this.createPlayer();
    this.createWingmen();
    this.createProjectilePool();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.layout);
    this.layout();
    this.app.ticker.add(this.update);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.layout);
    this.app?.ticker.remove(this.update);
    this.app?.destroy(true);
    this.app = null;
  }

  setMobileMove(x: number, y: number): void {
    this.moveInput = { x, y };
  }

  setMobileAim(x: number, y: number, firing: boolean): void {
    this.aimInput = normalize(x, -Math.max(0.25, 1 - Math.abs(y) * 0.2));
    if (firing) this.firePlayerBurst();
  }

  setMobileSector(sector: SectorAction): void {
    this.sectorAction = sector;
    if (sector === 'missile') this.firePlayerBurst(true);
  }

  triggerDash(): void {
    if (!this.player?.alive) return;
    this.player.vx += this.aimInput.x * 420;
    this.player.vy += this.aimInput.y * 420;
  }

  fireMissile(): void {
    this.firePlayerBurst(true);
  }

  getSnapshot(): RaidSnapshot {
    const reactor = this.modules.find((module) => module.type === 'reactor_core');
    const objective = this.phase === 'reactor'
      ? 'raid.objective_reactor'
      : this.modules.some((module) => module.type === 'shield_emitter' && module.alive)
        ? 'raid.objective_shields'
        : 'raid.objective_waves';
    return {
      phase: this.phase,
      elapsedSec: Math.floor((performance.now() - this.startedAt) / 1000),
      playerHp: Math.max(0, Math.ceil(this.player?.hp ?? 0)),
      playerMaxHp: this.player?.maxHp ?? RAID_PLAYER_HP,
      playerShield: Math.max(0, Math.ceil(this.player?.shield ?? 0)),
      playerMaxShield: this.player?.maxShield ?? RAID_PLAYER_SHIELD,
      alliedAlive: this.wingmen.filter((ship) => ship.alive).length + (this.player?.alive ? 1 : 0),
      enemiesActive: this.enemies.filter((ship) => ship.alive).length,
      kills: this.kills,
      modulesDestroyed: this.modulesDestroyed,
      modulesTotal: this.modules.length,
      reactorHp: Math.max(0, Math.ceil(reactor?.hp ?? 0)),
      reactorMaxHp: reactor?.maxHp ?? 1,
      objective,
    };
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = this.controlKeyFromEvent(event);
    this.keys.add(key);
    if (key === ' ' || key === 'shift') this.triggerDash();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(this.controlKeyFromEvent(event));
  };

  private controlKeyFromEvent(event: KeyboardEvent): string {
    switch (event.code) {
      case 'KeyW': return 'w';
      case 'KeyA': return 'a';
      case 'KeyS': return 's';
      case 'KeyD': return 'd';
      case 'KeyF': return 'f';
      default: return event.key.toLowerCase();
    }
  }

  private readonly layout = (): void => {
    if (!this.app) return;
    const scale = Math.min(this.app.renderer.width / WORLD_W, this.app.renderer.height / WORLD_H);
    this.world.scale.set(scale);
    this.world.position.set(this.app.renderer.width / 2, this.app.renderer.height / 2);
  };

  private createBackdrop(): void {
    this.background.clear();
    this.background.rect(0, 0, Math.max(1, this.container.clientWidth), Math.max(1, this.container.clientHeight)).fill(0x020510);
    for (let i = 0; i < 130; i++) {
      const x = ((i * 137) % 1000) / 1000 * Math.max(1, this.container.clientWidth);
      const y = ((i * 277) % 1000) / 1000 * Math.max(1, this.container.clientHeight);
      const a = 0.18 + ((i * 17) % 40) / 100;
      this.background.circle(x, y, i % 5 === 0 ? 1.5 : 0.8).fill({ color: 0x88aacc, alpha: a });
    }
  }

  private createCarrier(): void {
    const hull = new Graphics();
    hull.poly([-360, -70, -230, -145, 260, -120, 390, 0, 260, 120, -230, 145, -360, 70]);
    hull.fill({ color: 0x172334, alpha: 0.95 });
    hull.stroke({ color: 0x446688, alpha: 0.65, width: 3 });
    hull.moveTo(-260, 0).lineTo(280, 0).stroke({ color: 0x334455, alpha: 0.65, width: 2 });
    this.carrier.addChild(hull);
    this.carrier.position.set(0, -410);
    this.world.addChild(this.carrier);

    const moduleData: Array<[PixiModule['id'], PixiModule['type'], number, number, number]> = [
      ['bay-l', 'hangar_bay', -250, -55, 85],
      ['bay-r', 'hangar_bay', -250, 55, 85],
      ['shield-l', 'shield_emitter', -70, -95, 110],
      ['shield-r', 'shield_emitter', -70, 95, 110],
      ['turret-l', 'turret_cluster', 130, -88, 95],
      ['turret-r', 'turret_cluster', 130, 88, 95],
      ['reactor', 'reactor_core', 255, 0, 240],
    ];
    for (const [id, type, x, y, hp] of moduleData) {
      const view = drawModule(type);
      view.position.set(x, y - 410);
      this.modules.push({ id, type, x, y: y - 410, hp, maxHp: hp, radius: type === 'reactor_core' ? 46 : 38, alive: true, fireCooldown: 1 + Math.abs(x) / 300, view });
      this.world.addChild(view);
    }
  }

  private createPlayer(): void {
    const view = drawShip(0x7bb8ff, 1.1);
    this.player = { id: 1, team: 'allied', x: 0, y: 460, vx: 0, vy: 0, hp: RAID_PLAYER_HP, maxHp: RAID_PLAYER_HP, shield: RAID_PLAYER_SHIELD, maxShield: RAID_PLAYER_SHIELD, radius: 20, fireCooldown: 0, shieldDelay: 0, alive: true, view };
    this.world.addChild(view);
  }

  private createWingmen(): void {
    for (let i = 0; i < RAID_WINGMEN; i++) {
      const view = drawShip(0x88ccaa, 0.82);
      const ship: PixiShip = { id: 10 + i, team: 'allied', x: (i - 1.5) * 110, y: 540 + (i % 2) * 50, vx: 0, vy: 0, hp: RAID_ALLY_HP, maxHp: RAID_ALLY_HP, shield: RAID_ALLY_SHIELD, maxShield: RAID_ALLY_SHIELD, radius: 16, fireCooldown: i * 0.25, shieldDelay: 0, alive: true, view };
      this.wingmen.push(ship);
      this.world.addChild(view);
    }
  }

  private createProjectilePool(): void {
    const count = this.tier === 'low' ? 90 : 140;
    for (let i = 0; i < count; i++) {
      const view = new Graphics();
      view.visible = false;
      this.projectiles.push({ active: false, team: 'allied', damage: RAID_PROJECTILE_DAMAGE, age: 0, lifetime: RAID_PROJECTILE_LIFETIME, radius: 5, x: 0, y: 0, vx: 0, vy: 0, view });
      this.world.addChild(view);
    }
  }

  private spawnWave(count: number): void {
    const active = this.enemies.filter((enemy) => enemy.alive).length;
    const spawnCount = Math.max(0, Math.min(count, this.maxActiveEnemies - active));
    for (let i = 0; i < spawnCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const view = drawDrone();
      const ship: PixiShip = {
        id: 1000 + this.enemies.length,
        team: 'enemy',
        x: side * (520 + (i % 4) * 60),
        y: -190 - Math.floor(i / 2) * 70,
        vx: -side * 60,
        vy: 70,
        hp: RAID_DRONE_HP,
        maxHp: RAID_DRONE_HP,
        shield: 0,
        maxShield: 0,
        radius: 17,
        fireCooldown: 0.8 + (i % 5) * 0.18,
        shieldDelay: 0,
        alive: true,
        view,
      };
      this.enemies.push(ship);
      this.world.addChild(view);
    }
  }

  private readonly update = (): void => {
    if (!this.app || this.ended) return;
    const dt = Math.min(0.05, this.app.ticker.deltaMS / 1000);
    const elapsed = (performance.now() - this.startedAt) / 1000;
    while (this.nextWaveIndex < RAID_WAVES.length && elapsed >= RAID_WAVES[this.nextWaveIndex].at) {
      this.spawnWave(RAID_WAVES[this.nextWaveIndex].count);
      this.nextWaveIndex++;
      if (this.phase === 'approach') this.phase = 'waves';
    }

    this.updatePlayer(dt);
    this.updateWingmen(dt);
    this.updateEnemies(dt);
    this.updateModules(dt);
    this.updateProjectiles(dt);
    this.updateViews();

    const shieldAlive = this.modules.some((module) => module.type === 'shield_emitter' && module.alive);
    const reactor = this.modules.find((module) => module.type === 'reactor_core');
    if (!shieldAlive && this.phase !== 'victory' && this.phase !== 'defeat') this.phase = 'reactor';
    if (reactor && !reactor.alive) this.endRaid(true);
    if (this.player && !this.player.alive) this.endRaid(false);

    this.snapshotTimer += dt;
    if (this.snapshotTimer >= 0.15) {
      this.snapshotTimer = 0;
      this.callbacks.onStatsUpdate?.(this.getSnapshot());
    }
  };

  private updatePlayer(dt: number): void {
    const player = this.player;
    if (!player?.alive) return;
    const keyX = (this.keys.has('a') || this.keys.has('arrowleft') ? -1 : 0) + (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0);
    const keyY = (this.keys.has('w') || this.keys.has('arrowup') ? -1 : 0) + (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0);
    const input = normalize(keyX + this.moveInput.x, keyY + this.moveInput.y);
    player.vx += input.x * RAID_SPEED * 3.2 * dt;
    player.vy += input.y * RAID_SPEED * 3.2 * dt;
    player.vx *= 0.91;
    player.vy *= 0.91;
    player.x = clamp(player.x + player.vx * dt, -760, 760);
    player.y = clamp(player.y + player.vy * dt, -120, 590);
    player.fireCooldown -= dt;
    if (this.keys.has('f') || this.keys.has('enter')) this.firePlayerBurst();
    this.regenShield(player, dt);
  }

  private updateWingmen(dt: number): void {
    const targets = this.enemies.filter((enemy) => enemy.alive);
    for (let i = 0; i < this.wingmen.length; i++) {
      const ship = this.wingmen[i];
      if (!ship.alive) continue;
      const anchorX = (i - 1.5) * 120 + (this.player?.x ?? 0) * 0.25;
      const anchorY = 500 + (i % 2) * 55;
      ship.vx += (anchorX - ship.x) * dt * 1.5;
      ship.vy += (anchorY - ship.y) * dt * 1.5;
      ship.vx *= 0.9;
      ship.vy *= 0.9;
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      ship.fireCooldown -= dt;
      const target = targets[i % Math.max(1, targets.length)] ?? this.modules.find((module) => module.alive && module.type !== 'reactor_core');
      if (target && ship.fireCooldown <= 0) {
        this.fireProjectile(ship.x, ship.y - 12, target.x - ship.x, target.y - ship.y, 'allied', RAID_ALLY_DAMAGE);
        ship.fireCooldown = 0.55 + i * 0.05;
      }
      this.regenShield(ship, dt);
    }
  }

  private updateEnemies(dt: number): void {
    const player = this.player;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const target = player?.alive ? player : this.wingmen.find((ship) => ship.alive);
      if (!target) continue;
      const dir = normalize(target.x - enemy.x, target.y - enemy.y);
      enemy.vx += dir.x * 160 * dt;
      enemy.vy += dir.y * 160 * dt;
      enemy.vx *= 0.94;
      enemy.vy *= 0.94;
      enemy.x = clamp(enemy.x + enemy.vx * dt, -880, 880);
      enemy.y = clamp(enemy.y + enemy.vy * dt, -520, 620);
      enemy.fireCooldown -= dt;
      if (enemy.fireCooldown <= 0) {
        this.fireProjectile(enemy.x, enemy.y + 10, dir.x, dir.y, 'enemy', RAID_ENEMY_DAMAGE);
        enemy.fireCooldown = 1.3;
      }
    }
  }

  private updateModules(dt: number): void {
    const target = this.player?.alive ? this.player : this.wingmen.find((ship) => ship.alive);
    if (!target) return;
    for (const module of this.modules) {
      if (!module.alive || module.type === 'reactor_core') continue;
      module.fireCooldown -= dt;
      if (module.fireCooldown <= 0) {
        this.fireProjectile(module.x, module.y + 15, target.x - module.x, target.y - module.y, 'enemy', RAID_ENEMY_DAMAGE + 2);
        module.fireCooldown = module.type === 'turret_cluster' ? 0.85 : 1.7;
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age > p.lifetime || Math.abs(p.x) > 1100 || Math.abs(p.y) > 800) {
        this.releaseProjectile(p);
        continue;
      }
      if (p.team === 'allied') this.hitEnemyTargets(p);
      else this.hitAlliedTargets(p);
    }
  }

  private hitEnemyTargets(p: PixiProjectile): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || Math.hypot(enemy.x - p.x, enemy.y - p.y) > enemy.radius + p.radius) continue;
      this.damageShip(enemy, p.damage, 'player');
      this.releaseProjectile(p);
      return;
    }
    const shieldsAlive = this.modules.some((module) => module.type === 'shield_emitter' && module.alive);
    for (const module of this.modules) {
      if (!module.alive) continue;
      if (module.type === 'reactor_core' && shieldsAlive) continue;
      if (Math.hypot(module.x - p.x, module.y - p.y) > module.radius + p.radius) continue;
      module.hp -= p.damage;
      if (module.hp <= 0) {
        module.alive = false;
        module.view.alpha = 0.18;
        this.modulesDestroyed++;
      }
      this.releaseProjectile(p);
      return;
    }
  }

  private hitAlliedTargets(p: PixiProjectile): void {
    const allied = [this.player, ...this.wingmen].filter(Boolean) as PixiShip[];
    for (const ship of allied) {
      if (!ship.alive || Math.hypot(ship.x - p.x, ship.y - p.y) > ship.radius + p.radius) continue;
      this.damageShip(ship, p.damage, 'wingman');
      this.releaseProjectile(p);
      return;
    }
  }

  private damageShip(ship: PixiShip, damage: number, source: 'player' | 'wingman'): void {
    const shieldHit = Math.min(ship.shield, damage);
    ship.shield -= shieldHit;
    ship.hp -= damage - shieldHit;
    ship.shieldDelay = RAID_SHIELD_REGEN_DELAY;
    if (ship.hp <= 0) {
      ship.alive = false;
      ship.view.visible = false;
      if (ship.team === 'enemy') {
        this.kills++;
        this.callbacks.onKill?.({ kills: this.kills, source });
      }
    }
  }

  private regenShield(ship: PixiShip, dt: number): void {
    if (ship.shieldDelay > 0) {
      ship.shieldDelay -= dt;
      return;
    }
    ship.shield = Math.min(ship.maxShield, ship.shield + RAID_SHIELD_REGEN_RATE * dt);
  }

  private firePlayerBurst(heavy = false): void {
    const player = this.player;
    if (!player?.alive || player.fireCooldown > 0) return;
    this.fireProjectile(player.x - 7, player.y - 18, this.aimInput.x - 0.04, this.aimInput.y, 'allied', heavy ? RAID_PROJECTILE_DAMAGE * 2.1 : RAID_PROJECTILE_DAMAGE);
    this.fireProjectile(player.x + 7, player.y - 18, this.aimInput.x + 0.04, this.aimInput.y, 'allied', heavy ? RAID_PROJECTILE_DAMAGE * 2.1 : RAID_PROJECTILE_DAMAGE);
    player.fireCooldown = heavy || this.sectorAction === 'missile' ? 0.38 : 0.18;
  }

  private fireProjectile(x: number, y: number, dx: number, dy: number, team: RaidTeam, damage: number): void {
    const p = this.projectiles.find((projectile) => !projectile.active);
    if (!p) return;
    const dir = normalize(dx, dy);
    p.active = true;
    p.team = team;
    p.damage = damage;
    p.age = 0;
    p.x = x;
    p.y = y;
    p.vx = dir.x * RAID_PROJECTILE_SPEED * 0.55;
    p.vy = dir.y * RAID_PROJECTILE_SPEED * 0.55;
    p.view.clear();
    p.view.circle(0, 0, team === 'allied' ? 3.2 : 3.8).fill(team === 'allied' ? 0x7bb8ff : 0xff8844);
    p.view.visible = true;
  }

  private releaseProjectile(p: PixiProjectile): void {
    p.active = false;
    p.view.visible = false;
  }

  private updateViews(): void {
    if (this.player) {
      this.player.view.position.set(this.player.x, this.player.y);
      this.player.view.rotation = Math.atan2(this.aimInput.x, -this.aimInput.y);
    }
    for (const ship of this.wingmen) {
      ship.view.position.set(ship.x, ship.y);
      ship.view.rotation = -0.08 + (ship.id % 3) * 0.08;
    }
    for (const enemy of this.enemies) {
      enemy.view.position.set(enemy.x, enemy.y);
      enemy.view.rotation = Math.PI + Math.sin((performance.now() + enemy.id * 97) * 0.001) * 0.35;
    }
    for (const p of this.projectiles) {
      if (p.active) p.view.position.set(p.x, p.y);
    }
    for (const module of this.modules) {
      if (!module.alive) continue;
      const pct = clamp(module.hp / module.maxHp, 0, 1);
      module.view.scale.set(0.82 + pct * 0.18);
    }
  }

  private endRaid(victory: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.phase = victory ? 'victory' : 'defeat';
    const result: RaidResult = {
      victory,
      kills: this.kills,
      modulesDestroyed: this.modulesDestroyed,
      elapsedSec: Math.floor((performance.now() - this.startedAt) / 1000),
      xp: victory ? RAID_REWARD_BASE_XP + this.kills * RAID_REWARD_XP_PER_KILL + this.modulesDestroyed * RAID_REWARD_XP_PER_MODULE : Math.floor(this.kills * RAID_REWARD_XP_PER_KILL * 0.5),
      minerals: victory ? 240 + this.modulesDestroyed * 40 : Math.floor(this.kills * 3),
      isotopes: victory ? 30 + this.modulesDestroyed * 5 : 0,
      techFragments: victory ? 1 : 0,
    };
    this.callbacks.onStatsUpdate?.(this.getSnapshot());
    this.callbacks.onRaidEnd?.(result);
  }
}
