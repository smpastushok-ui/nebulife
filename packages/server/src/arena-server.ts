// ---------------------------------------------------------------------------
// Arena WebSocket Server — entry point for Railway deployment
// Standalone process: handles matchmaking + game state broadcast
// ---------------------------------------------------------------------------

import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Matchmaker } from './arena-matchmaker.js';
import type { ArenaPlayer } from './arena-matchmaker.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

// HTTP server (required by ws)
const httpServer = createServer((req, res) => {
  // Health check endpoint for Railway
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', ...matchmaker.getStats() }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

// WebSocket server
const wss = new WebSocketServer({ server: httpServer });
const matchmaker = new Matchmaker();

// Track connected players
const playerSockets = new Map<string, WebSocket>();
const socketToPlayer = new Map<WebSocket, { id: string; roomId: string | null }>();

let nextPlayerId = 1;

wss.on('connection', (ws: WebSocket) => {
  const playerId = `player_${nextPlayerId++}`;
  console.log(`[Arena] Player connected: ${playerId}`);

  // Create player object with send wrapper
  const player: ArenaPlayer = {
    id: playerId,
    name: `Player ${nextPlayerId}`,
    shipType: 'default',
    send: (event: string, data: unknown) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
      }
    },
  };

  playerSockets.set(playerId, ws);
  socketToPlayer.set(ws, { id: playerId, roomId: null });

  // Send welcome message
  player.send('welcome', { playerId });

  // Handle incoming messages
  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(playerId, msg, player);
    } catch (err) {
      console.error(`[Arena] Bad message from ${playerId}:`, err);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`[Arena] Player disconnected: ${playerId}`);
    const info = socketToPlayer.get(ws);
    if (info?.roomId) {
      matchmaker.onPlayerLeave(info.roomId, playerId);
    } else {
      matchmaker.leaveQueue(playerId);
    }
    playerSockets.delete(playerId);
    socketToPlayer.delete(ws);
  });
});

function handleMessage(playerId: string, msg: { event: string; data?: any }, player: ArenaPlayer) {
  switch (msg.event) {
    case 'join_queue':
      matchmaker.joinQueue(player);
      break;

    case 'leave_queue':
      matchmaker.leaveQueue(playerId);
      break;

    case 'input':
      // Forward player input to their room
      // msg.data = { moveX, moveZ, aimX, aimZ, firing, missile, dash, gravPush }
      // TODO: forward to ArenaRoom for server-authoritative physics
      break;

    default:
      console.log(`[Arena] Unknown event from ${playerId}: ${msg.event}`);
  }
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`[Arena] WebSocket server running on port ${PORT}`);
  console.log(`[Arena] Health check: http://localhost:${PORT}/health`);
});
