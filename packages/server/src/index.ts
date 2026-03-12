// @nebulife/server — exports for use in Vercel serverless functions

export {
  // Player
  createPlayer,
  createPlayerWithAuth,
  getPlayer,
  updatePlayer,
  // Auth
  getPlayerByFirebaseUid,
  linkFirebaseToPlayer,
  checkCallsignAvailable,
  setCallsign,
  updatePlayerAuth,
  // Discoveries
  saveDiscovery,
  getDiscoveries,
  getDiscovery,
  updateDiscoveryPhoto,
  deleteDiscovery,
  // Kling tasks
  saveKlingTask,
  getKlingTask,
  updateKlingTask,
  // Expeditions
  saveExpedition,
  getExpeditions,
  completeExpedition,
  // Planet Models (3D)
  savePlanetModel,
  getPlanetModel,
  getPlanetModelByPayment,
  getPlanetModels,
  updatePlanetModel,
  // Surface Buildings
  saveSurfaceBuilding,
  getSurfaceBuildings,
  removeSurfaceBuilding,
  upgradeSurfaceBuilding,
  // Surface Maps (AI-generated planet photos)
  saveSurfaceMap,
  getSurfaceMap,
  getSurfaceMapById,
  updateSurfaceMap,
  // Quarks
  deductQuarks,
  creditQuarks,
  // Payment Intents
  savePaymentIntent,
  getPaymentIntent,
  updatePaymentIntentStatus,
  // Player Aliases (custom names)
  getPlayerAliases,
  setPlayerAlias,
  removePlayerAlias,
  // System Photos (telescope)
  saveSystemPhoto,
  getSystemPhoto,
  getSystemPhotoById,
  updateSystemPhoto,
  getPlayerSystemPhotos,
  // System Missions (video)
  saveSystemMission,
  getSystemMission,
  getActiveSystemMission,
  updateSystemMission,
  getPlayerSystemMissions,
  // Messages (chat)
  saveMessage,
  getMessages,
  getPlayerDMChannels,
  searchPlayers,
} from './db.js';

export type {
  PlayerRow,
  DiscoveryRow,
  KlingTaskRow,
  ExpeditionRow,
  PlanetModelRow,
  SurfaceBuildingRow,
  SurfaceMapRow,
  PaymentIntentRow,
  PlayerAliasRow,
  SystemPhotoRow,
  SystemMissionRow,
  MessageRow,
  DMChannelInfo,
} from './db.js';

export {
  generateImage,
  checkTaskStatus,
  generateVideo,
  checkVideoTaskStatus,
} from './kling-client.js';

export type {
  KlingGenerateRequest,
  KlingGenerateResponse,
  KlingTaskStatusResponse,
  KlingVideoGenerateRequest,
  TaskStatus,
} from './kling-client.js';

export {
  createModelTask,
  checkModelTask,
} from './tripo-client.js';

export type {
  TripoCreateTaskResponse,
  TripoTaskStatus,
  TripoTaskStatusResponse,
} from './tripo-client.js';

// Surface prompt builder
export { buildSurfacePrompt } from './surface-prompt-builder.js';

// Planet 3D model prompt builder
export { buildPlanetModelPrompt } from './planet-model-prompt-builder.js';

// System photo/mission prompt builder
export { buildSystemPhotoPrompt, buildMissionVideoPrompt, buildGeminiSystemPhotoPrompt } from './system-photo-prompt-builder.js';

// Gemini AI image generation
export { generateImageWithGemini, computeAspectRatio } from './gemini-client.js';
export type { GeminiGenerateImageRequest, GeminiGenerateImageResult } from './gemini-client.js';

// Surface photo analyzer
export { analyzePhotoForZones } from './surface-analyzer.js';

// Firebase Auth
export { verifyFirebaseToken } from './firebase-admin.js';
export { authenticate, authenticateToken } from './auth-middleware.js';
export type { AuthResult } from './auth-middleware.js';
