// ---------------------------------------------------------------------------
// Arena Matchmaker + Room with full combat system, power-ups, buffs
// Phase 2: WebSocket server (Railway)
// ---------------------------------------------------------------------------

export type PowerUpType = 'WARP' | 'DAMAGE_UP' | 'SLOW_LASER' | 'SHIELD';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  z: number;
}

export interface PlayerBuff {
  type: PowerUpType;
  expiresAt: number;
}

export interface ServerPlayer {
  id: string;
  name: string;
  shipType: string;
  x: number;
  z: number;
  rotation: number;

  // Stats
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  lastDamageTakenAt: number;
  invulnerableUntil: number;

  // Movement
  baseSpeed: number;
  speedMult: number;

  // Combat
  baseDamage: number;
  damageMult: number;
  laserColor: 'green' | 'red' | 'blue';
  buffs: PlayerBuff[];
  slowExpiresAt: number;

  // Scoring
  kills: number;
  deaths: number;
  score: number;
  damageDealt: number;

  // Network
  send: (event: string, data: unknown) => void;
}

// Power-up visual config for client
export const POWERUP_CONFIG: Record<PowerUpType, { color: number; label: string }> = {
  WARP:       { color: 0x00eeff, label: 'WARP x1.5' },
  DAMAGE_UP:  { color: 0xff4444, label: 'DMG x1.5' },
  SLOW_LASER: { color: 0x4488ff, label: 'SLOW' },
  SHIELD:     { color: 0xaaddff, label: 'SHIELD' },
};

// ---------------------------------------------------------------------------
// Arena Room — full game logic
// ---------------------------------------------------------------------------

export class ArenaRoom {
  public id: string;
  public players: Map<string, ServerPlayer> = new Map();
  public powerUps: Map<string, PowerUp> = new Map();
  public readonly MAX_PLAYERS = 10;
  public createdAt = Date.now();

  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private powerUpSpawnInterval: ReturnType<typeof setInterval> | null = null;
  private powerUpCounter = 0;

  // Constants
  private readonly TICK_MS = 50; // 20 Hz
  private readonly SHIELD_REGEN_RATE = 5; // per second
  private readonly SHIELD_REGEN_DELAY = 4000; // ms after last damage
  private readonly RESPAWN_DELAY = 2000; // ms
  private readonly INVULNERABILITY_TIME = 3000; // ms
  private readonly POWERUP_SPAWN_INTERVAL = 15000; // ms
  private readonly MAX_POWERUPS = 5;
  private readonly POWERUP_COLLECT_RADIUS = 30; // units
  private readonly BUFF_DURATION = 10000; // ms
  private readonly ARENA_HALF = 1000;

  constructor(id: string) {
    this.id = id;
    this.updateInterval = setInterval(() => this.update(), this.TICK_MS);
    this.powerUpSpawnInterval = setInterval(() => this.spawnPowerUp(), this.POWERUP_SPAWN_INTERVAL);
  }

  // ── Player lifecycle ─────────────────────────────────────────────────

  addPlayer(player: ServerPlayer): void {
    player.maxHp = 100;
    player.maxShield = 50;
    player.baseDamage = 15;
    player.baseSpeed = 200;
    player.kills = 0;
    player.deaths = 0;
    player.score = 0;
    player.damageDealt = 0;

    this.respawnPlayer(player);
    this.players.set(player.id, player);
    player.send('room_joined', {
      roomId: this.id,
      playerCount: this.players.size,
      powerUps: Array.from(this.powerUps.values()),
    });
    this.broadcast('player_joined', { id: player.id, name: player.name, playerCount: this.players.size });
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.broadcast('player_left', { id: playerId, playerCount: this.players.size });
  }

  private respawnPlayer(player: ServerPlayer): void {
    player.hp = player.maxHp;
    player.shield = player.maxShield;
    player.buffs = [];
    player.slowExpiresAt = 0;
    player.speedMult = 1.0;
    player.damageMult = 1.0;
    player.laserColor = 'green';
    player.invulnerableUntil = Date.now() + this.INVULNERABILITY_TIME;
    player.lastDamageTakenAt = 0;

    // Safe spawn position (arena edge)
    const angle = Math.random() * Math.PI * 2;
    player.x = Math.cos(angle) * (this.ARENA_HALF * 0.7);
    player.z = Math.sin(angle) * (this.ARENA_HALF * 0.7);

    this.broadcast('player_respawned', {
      id: player.id,
      x: player.x,
      z: player.z,
      invulnerableUntil: player.invulnerableUntil,
    });
  }

  // ── Combat system ──────────────────────────────────────────────────

  onLaserHit(shooterId: string, targetId: string): void {
    if (shooterId === targetId) return;

    const shooter = this.players.get(shooterId);
    const target = this.players.get(targetId);
    const now = Date.now();

    if (!shooter || !target) return;
    if (target.hp <= 0) return; // Already dead
    if (now < target.invulnerableUntil) return;

    // Calculate damage
    let damage = shooter.baseDamage * shooter.damageMult;

    // Apply to shield first, then HP
    target.lastDamageTakenAt = now;
    let hpDamage = 0;

    if (target.shield > 0) {
      if (damage > target.shield) {
        const remaining = damage - target.shield;
        target.shield = 0;
        target.hp -= remaining;
        hpDamage = remaining;
      } else {
        target.shield -= damage;
      }
    } else {
      target.hp -= damage;
      hpDamage = damage;
    }

    // Score: only HP damage counts (prevents shield farming)
    if (hpDamage > 0) {
      shooter.score += Math.floor(hpDamage);
      shooter.damageDealt += hpDamage;
    }

    // Slow laser effect
    if (shooter.laserColor === 'blue') {
      target.slowExpiresAt = now + 1000; // 1s slow
      this.applyBuffEffects(target);
    }

    // Death check
    if (target.hp <= 0) {
      target.hp = 0;
      target.deaths++;
      shooter.kills++;
      shooter.score += 100; // Kill bonus

      this.broadcast('player_died', { victimId: target.id, killerId: shooter.id, killerName: shooter.name });

      // Auto-respawn
      setTimeout(() => {
        if (this.players.has(target.id)) this.respawnPlayer(target);
      }, this.RESPAWN_DELAY);
    }

    this.broadcast('player_health_update', {
      id: target.id,
      hp: Math.max(0, Math.floor(target.hp)),
      shield: Math.max(0, Math.floor(target.shield)),
    });
  }

  // ── Power-up system ────────────────────────────────────────────────

  private spawnPowerUp(): void {
    if (this.powerUps.size >= this.MAX_POWERUPS) return;
    if (this.players.size === 0) return; // Don't spawn in empty rooms

    const types: PowerUpType[] = ['WARP', 'DAMAGE_UP', 'SLOW_LASER', 'SHIELD'];
    const type = types[Math.floor(Math.random() * types.length)];

    const powerUp: PowerUp = {
      id: `pu_${this.id}_${this.powerUpCounter++}`,
      type,
      x: (Math.random() - 0.5) * this.ARENA_HALF * 1.6,
      z: (Math.random() - 0.5) * this.ARENA_HALF * 1.6,
    };

    this.powerUps.set(powerUp.id, powerUp);
    this.broadcast('powerup_spawned', powerUp);
  }

  /** Called by server when player position overlaps a power-up */
  private checkPowerUpCollection(): void {
    for (const player of this.players.values()) {
      if (player.hp <= 0) continue;

      for (const [puId, pu] of this.powerUps) {
        const dx = player.x - pu.x;
        const dz = player.z - pu.z;
        if (dx * dx + dz * dz < this.POWERUP_COLLECT_RADIUS ** 2) {
          this.collectPowerUp(player, puId);
          break; // 1 per tick per player
        }
      }
    }
  }

  private collectPowerUp(player: ServerPlayer, powerUpId: string): void {
    const powerUp = this.powerUps.get(powerUpId);
    if (!powerUp) return;

    this.powerUps.delete(powerUpId);
    this.broadcast('powerup_collected', { playerId: player.id, powerUpId });

    const expiresAt = Date.now() + this.BUFF_DURATION;

    // DAMAGE_UP and SLOW_LASER are mutually exclusive (both change laser color)
    if (powerUp.type === 'DAMAGE_UP' || powerUp.type === 'SLOW_LASER') {
      player.buffs = player.buffs.filter(b => b.type !== 'DAMAGE_UP' && b.type !== 'SLOW_LASER');
    }

    // Refresh or add buff
    const existing = player.buffs.findIndex(b => b.type === powerUp.type);
    if (existing >= 0) {
      player.buffs[existing].expiresAt = expiresAt;
    } else {
      player.buffs.push({ type: powerUp.type, expiresAt });
    }

    this.applyBuffEffects(player);
  }

  private applyBuffEffects(player: ServerPlayer): void {
    const now = Date.now();

    // Reset to base
    player.speedMult = 1.0;
    player.damageMult = 1.0;
    player.laserColor = 'green';

    for (const buff of player.buffs) {
      if (now > buff.expiresAt) continue;
      switch (buff.type) {
        case 'WARP':
          player.speedMult *= 1.5;
          break;
        case 'DAMAGE_UP':
          player.damageMult = 1.5;
          player.laserColor = 'red';
          break;
        case 'SLOW_LASER':
          player.laserColor = 'blue';
          break;
        case 'SHIELD':
          // Over-shield: double max shield capacity
          if (player.shield < player.maxShield * 2) {
            player.shield = player.maxShield * 2;
          }
          break;
      }
    }

    // Slow debuff (from enemy blue laser)
    if (player.slowExpiresAt > now) {
      player.speedMult *= 0.5;
    }

    this.broadcast('player_stats_updated', {
      id: player.id,
      speedMult: player.speedMult,
      damageMult: player.damageMult,
      laserColor: player.laserColor,
      hasHoloShield: player.buffs.some(b => b.type === 'SHIELD' && b.expiresAt > now),
    });
  }

  // ── Main tick ──────────────────────────────────────────────────────

  private update(): void {
    const now = Date.now();
    const dtSec = this.TICK_MS / 1000;

    for (const player of this.players.values()) {
      if (player.hp <= 0) continue;

      let stateChanged = false;

      // Shield regen (after 4s without damage)
      if (now - player.lastDamageTakenAt > this.SHIELD_REGEN_DELAY && player.shield < player.maxShield) {
        player.shield = Math.min(player.maxShield, player.shield + this.SHIELD_REGEN_RATE * dtSec);
        stateChanged = true;
      }

      // Expire buffs
      const before = player.buffs.length;
      player.buffs = player.buffs.filter(b => now <= b.expiresAt);
      if (player.buffs.length !== before) stateChanged = true;

      // Expire slow debuff
      if (player.slowExpiresAt > 0 && now > player.slowExpiresAt) {
        player.slowExpiresAt = 0;
        stateChanged = true;
      }

      if (stateChanged) {
        this.applyBuffEffects(player);
        this.broadcast('player_health_update', {
          id: player.id,
          hp: Math.floor(player.hp),
          shield: Math.floor(player.shield),
        });
      }
    }

    // Check power-up collection by proximity
    this.checkPowerUpCollection();
  }

  // ── Utils ──────────────────────────────────────────────────────────

  broadcast(event: string, data: unknown): void {
    for (const p of this.players.values()) {
      p.send(event, data);
    }
  }

  destroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.powerUpSpawnInterval) clearInterval(this.powerUpSpawnInterval);
    this.updateInterval = null;
    this.powerUpSpawnInterval = null;
    this.players.clear();
    this.powerUps.clear();
  }

  get isFull(): boolean { return this.players.size >= this.MAX_PLAYERS; }
  get isEmpty(): boolean { return this.players.size === 0; }
}

// ---------------------------------------------------------------------------
// Matchmaker
// ---------------------------------------------------------------------------

export class Matchmaker {
  private queue: ServerPlayer[] = [];
  private rooms: Map<string, ArenaRoom> = new Map();
  private roomCounter = 0;

  joinQueue(player: ServerPlayer): void {
    this.queue.push(player);
    player.send('queue_status', { position: this.queue.length });
    this.processQueue();
  }

  leaveQueue(playerId: string): void {
    this.queue = this.queue.filter(p => p.id !== playerId);
    this.updateQueuePositions();
  }

  private processQueue(): void {
    while (this.queue.length > 0) {
      let room = Array.from(this.rooms.values()).find(r => !r.isFull);

      if (!room) {
        this.roomCounter++;
        room = new ArenaRoom(`arena_${this.roomCounter}`);
        this.rooms.set(room.id, room);
        console.log(`[Matchmaker] New arena: ${room.id}`);
      }

      const player = this.queue.shift()!;
      room.addPlayer(player);
      this.updateQueuePositions();
    }
  }

  onPlayerLeave(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.removePlayer(playerId);

    if (room.isEmpty) {
      room.destroy();
      this.rooms.delete(roomId);
      console.log(`[Matchmaker] Arena ${roomId} destroyed (empty).`);
    } else {
      this.processQueue();
    }
  }

  private updateQueuePositions(): void {
    this.queue.forEach((p, i) => {
      p.send('queue_status', { position: i + 1 });
    });
  }

  getStats(): { rooms: number; players: number; queued: number } {
    let players = 0;
    for (const r of this.rooms.values()) players += r.players.size;
    return { rooms: this.rooms.size, players, queued: this.queue.length };
  }
}
