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
  // Universe
  getTotalPlayerCount,
  // Reports & Chat Bans
  saveReport,
  getPendingReports,
  updateReport,
  chatBanPlayer,
  isChatBanned,
  // Daily Content
  getAllPlayerIds,
  getDailyContent,
  saveDailyContent,
  // A.S.T.R.A. Tokens
  getAstraUsage,
  addAstraUsage,
  addAstraPurchasedTokens,
  // Weekly Digest
  getWeeklyDigest,
  saveWeeklyDigest,
  getPendingDigest,
  updateDigestImage,
  getLatestCompleteDigest,
  // Ad Rewards
  getAdRewardCount,
  addAdReward,
  // Academy
  getAcademyProgress,
  createAcademyProgress,
  updateAcademyProgress,
  getCachedLesson,
  saveCachedLesson,
  getOnboardedPlayerIds,
  // Clusters (low-level DB)
  findAvailableCluster,
  createCluster,
  incrementClusterPlayerCount,
  decrementClusterPlayerCount,
  getClusterById,
  getClusterByGroupIndex,
  getClusterPlayers,
  setPlayerCluster,
  getClusterCount,
  updateClusterPosition,
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
  ReportRow,
  WeeklyDigestRow,
  AcademyProgressRow,
  AcademyLessonRow,
  ClusterRow,
} from './db.js';

// Weekly Digest Generator
export { generateWeeklyNewsText, generateDigestImage, getCurrentWeekMonday } from './digest-generator.js';
export type { DigestNewsItem } from './digest-generator.js';

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

// Gemini AI image generation + moderation + A.S.T.R.A. chat + daily content
export { generateImageWithGemini, computeAspectRatio, moderateMessage, chatWithAstra, generateDailyQuiz, generateDailyFunFact } from './gemini-client.js';
export type { GeminiGenerateImageRequest, GeminiGenerateImageResult, ModerationResult, ModerationVerdict, AstraMessage, AstraChatResult } from './gemini-client.js';

// A.S.T.R.A. system prompt
export { ASTRA_SYSTEM_PROMPT } from './astra-prompt.js';

// Education generator
export { generateEducationPackage, generateLessonImage } from './education-generator.js';
export type { GeneratedLesson } from './education-generator.js';

// Surface photo analyzer
export { analyzePhotoForZones } from './surface-analyzer.js';

// Firebase Auth
export { verifyFirebaseToken } from './firebase-admin.js';
export { authenticate, authenticateToken } from './auth-middleware.js';
export type { AuthResult } from './auth-middleware.js';

// Rate limiter
export { checkRateLimit, RATE_LIMITS, getClientIP } from './rate-limiter.js';

// Cluster Manager
export {
  findOrCreateClusterForPlayer,
  assignPlayerToCluster,
  removePlayerFromCluster,
  getClusterForPlayer,
  getClusterMembers,
  getClusterStats,
} from './cluster-manager.js';
export type { ClusterInfo, ClusterMemberInfo } from './cluster-manager.js';
