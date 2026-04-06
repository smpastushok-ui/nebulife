// ---------------------------------------------------------------------------
// Arena Matchmaker — Room Management for multiplayer arena
// Phase 2: WebSocket server (Railway/Fly.io)
// ---------------------------------------------------------------------------

export interface ArenaPlayer {
  id: string;
  name: string;
  shipType: string;
  send: (event: string, data: unknown) => void;
}

export class ArenaRoom {
  public id: string;
  public players: Map<string, ArenaPlayer> = new Map();
  public readonly MAX_PLAYERS = 10;
  public createdAt = Date.now();
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(id: string) {
    this.id = id;
    // Start physics tick at 20Hz (50ms)
    this.updateInterval = setInterval(() => this.tick(), 50);
  }

  addPlayer(player: ArenaPlayer): void {
    this.players.set(player.id, player);
    player.send('room_joined', { roomId: this.id, playerCount: this.players.size });
    // Notify all players in room
    this.broadcast('player_joined', { playerId: player.id, name: player.name, playerCount: this.players.size });
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.broadcast('player_left', { playerId, playerCount: this.players.size });
  }

  broadcast(event: string, data: unknown): void {
    for (const p of this.players.values()) {
      p.send(event, data);
    }
  }

  private tick(): void {
    // Server-authoritative physics update
    // TODO: process all player inputs, run physics, broadcast state
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.players.clear();
  }

  get isFull(): boolean { return this.players.size >= this.MAX_PLAYERS; }
  get isEmpty(): boolean { return this.players.size === 0; }
}

export class Matchmaker {
  private queue: ArenaPlayer[] = [];
  private rooms: Map<string, ArenaRoom> = new Map();
  private roomCounter = 0;

  /** Player presses "Play" — add to queue and try to match */
  joinQueue(player: ArenaPlayer): void {
    this.queue.push(player);
    player.send('queue_status', { position: this.queue.length });
    this.processQueue();
  }

  /** Remove player from queue (cancelled, disconnected) */
  leaveQueue(playerId: string): void {
    this.queue = this.queue.filter(p => p.id !== playerId);
    this.updateQueuePositions();
  }

  /** Main matching logic — fill rooms from queue */
  private processQueue(): void {
    while (this.queue.length > 0) {
      // Find first room with space
      let room = Array.from(this.rooms.values()).find(r => !r.isFull);

      // No available rooms — create new one
      if (!room) {
        this.roomCounter++;
        room = new ArenaRoom(`arena_${this.roomCounter}`);
        this.rooms.set(room.id, room);
        console.log(`[Matchmaker] New arena created: ${room.id}`);
      }

      // Pop first player from queue into room
      const player = this.queue.shift()!;
      room.addPlayer(player);
      this.updateQueuePositions();
    }
  }

  /** Player left or disconnected — clean up room */
  onPlayerLeave(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.removePlayer(playerId);

    if (room.isEmpty) {
      // Destroy empty room (prevents memory leak from idle physics loops)
      room.destroy();
      this.rooms.delete(roomId);
      console.log(`[Matchmaker] Arena ${roomId} destroyed (empty).`);
    } else {
      // Seat opened — try to fill from queue
      this.processQueue();
    }
  }

  private updateQueuePositions(): void {
    this.queue.forEach((p, i) => {
      p.send('queue_status', { position: i + 1 });
    });
  }

  /** Stats for monitoring */
  getStats(): { rooms: number; players: number; queued: number } {
    let players = 0;
    for (const r of this.rooms.values()) players += r.players.size;
    return { rooms: this.rooms.size, players, queued: this.queue.length };
  }
}
