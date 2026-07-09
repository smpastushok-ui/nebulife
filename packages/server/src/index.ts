// @nebulife/server — exports for use in Vercel serverless functions

export {
  // Player
  createPlayer,
  createPlayerWithAuth,
  getPlayer,
  getPremiumStatus,
  hasActivePremiumAlpha,
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
  // Planet Skins (shared Kling texture maps)
  savePlanetSkin,
  getPlanetSkin,
  getPlanetSkinById,
  getPlanetSkinsForSystem,
  updatePlanetSkin,
  // Surface Buildings
  saveSurfaceBuilding,
  getSurfaceBuildings,
  removeSurfaceBuilding,
  upgradeSurfaceBuilding,
  // Surface State (fog, harvested cells, bot/drone positions)
  getSurfaceState,
  saveSurfaceState,
  // Surface Maps (AI-generated planet photos)
  saveSurfaceMap,
  getSurfaceMap,
  getSurfaceMapById,
  updateSurfaceMap,
  playerHasSurfacePhoto,
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
  getSystemPhotoBySystemId,
  updateSystemPhoto,
  getPlayerSystemPhotos,
  // System Missions (video)
  saveSystemMission,
  getSystemMission,
  getActiveSystemMission,
  updateSystemMission,
  getPlayerSystemMissions,
  // Lifeforms (Genesis module)
  saveLifeform,
  getLifeformById,
  getPlayerLifeforms,
  updateLifeformName,
  updateLifeformPhoto,
  updateLifeformVideo,
  // Messages (chat)
  saveMessage,
  getMessages,
  getPlayerDMChannels,
  getMessageReadStates,
  markMessageChannelRead,
  searchPlayers,
  // Universe
  getTotalPlayerCount,
  // Reports & Chat Bans
  saveReport,
  getPendingReports,
  updateReport,
  chatBanPlayer,
  isChatBanned,
  // Player Feedback (level 12+ likes/dislikes prompt)
  savePlayerFeedback,
  listPlayerFeedback,
  // Daily Content
  getAllPlayerIds,
  getPlayersRegisteredBefore,
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
  getDigestPendingEmails,
  getDigestPendingPushes,
  getDigestEmailRecipients,
  getDigestPushRecipients,
  markDigestEmailsSent,
  markDigestPushesSent,
  updateFcmToken,
  updatePlayerAvatar,
  getDueDailyReminderCandidates,
  enqueuePushNotification,
  claimPendingPushNotifications,
  markPushNotificationSent,
  markPushNotificationFailed,
  markPushNotificationCancelled,
  // Ad Rewards
  getAdRewardCount,
  addAdReward,
  // Idempotency
  acquireIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
  // IAP grant failures
  logIapGrantFailure,
  // Account Deletion
  deletePlayerData,
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
  assignPlayerToClusterTx,
  getClusterCount,
  updateClusterPosition,
  // Cluster shared state (migration 013)
  getSystemPlanetClaims,
  getPlayerPlanetClaims,
  claimPlanet,
  releasePlanetClaim,
  getSystemPlanetDestructions,
  recordPlanetDestruction,
  updatePlayerPresence,
  getClusterOnlineMembers,
  // Quark economy (Game Bible §0.4-bis)
  STARTER_QUARKS,
  DAILY_LOGIN_BONUS,
  claimDailyLoginBonus,
  // Polls (community voting)
  createPoll,
  getActivePoll,
  getPollById,
  listPolls,
  closePoll,
  castVote,
  getPlayerVoteForPoll,
  getPollResultsPublic,
  getPollResultsAdmin,
  // Ship Models (3D)
  saveShipModel,
  getShipModel,
  getShipModels,
  updateShipModel,
  // Creature Models (Biosphere)
  createCreatureModel,
  getCreatureModel,
  listCreaturesByPlanet,
  countPlayerCreatures,
  updateCreatureModel,
  // Creature Evolution (daily care, growth stages, generations — migration 041)
  countPlayerOffspring,
  careForCreature,
  spawnOffspring,
  // Creature Hybridization ("дослід схрещування" — migration 042)
  createHybridCreature,
  // Megastructures ("Мегаструктури кластера" — migration 043)
  getOrCreateClusterMegastructure,
  getMegastructureContributionToday,
  contributeToMegastructure,
  getMegastructureBuilders,
  // Saga Chapters ("Сага Ткача" — migration 044)
  createSagaChapter,
  listSagaChapters,
  countSagaChapters,
  hasSagaChapter,
  hasRecentSagaChapter,
} from './db.js';

export type {
  PlayerRow,
  DiscoveryRow,
  KlingTaskRow,
  ExpeditionRow,
  PlanetModelRow,
  PlanetSkinRow,
  SurfaceBuildingRow,
  SurfaceMapRow,
  SurfaceStateRow,
  PaymentIntentRow,
  PlayerAliasRow,
  SystemPhotoRow,
  SystemMissionRow,
  LifeformRow,
  MessageRow,
  DMChannelInfo,
  ReportRow,
  PlayerFeedbackRow,
  WeeklyDigestRow,
  PushQueueRow,
  ClaimedPushNotification,
  EnqueuePushInput,
  AcademyProgressRow,
  AcademyLessonRow,
  ClusterRow,
  // Cluster shared state types
  PlanetClaimRow,
  PlanetDestructionRow,
  PlayerPresenceRow,
  ClusterOnlineMember,
  // Polls
  PollOption,
  PollRow,
  PollVoteRow,
  CastVoteResult,
  PollResultOption,
  PollVoterRow,
  ShipModelRow,
  CreatureModelRow,
  CareOutcome,
  SpawnOffspringInput,
  SpawnOffspringOutcome,
  CreateHybridInput,
  CreateHybridOutcome,
  MegastructureRow,
  ContributeOutcome,
  MegastructureBuilderView,
  SagaChapterRow,
} from './db.js';

// Weekly Digest Generator
export { generateWeeklyNewsText, generateDigestImage, getCurrentWeekMonday, verifyNewsItems } from './digest-generator.js';
export type { DigestNewsItem } from './digest-generator.js';

// Push notifications
export { sendDigestPush, sendPush } from './push-client.js';
export type { DigestPushPayload, PushPayload } from './push-client.js';
export {
  enqueueDigestReadyPush,
  enqueueMissionPhotoReadyPush,
  enqueuePlanetSkinReadyPush,
  enqueueSystemMissionReadyPush,
  enqueueShipModelReadyPush,
  enqueueDailySpaceReminderPush,
} from './push-events.js';

// Email
export { sendDigestEmail } from './email-client.js';
export type { DigestEmailPayload } from './email-client.js';

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

// Tripo 3D model generation
export {
  createModelTask,
  checkModelTask,
  createShipModelTask,
  createShipTextModelTask,
  createCreatureModelTask,
  isTripoTaskCreationError,
  isFinalTripoFailure,
} from './tripo-client.js';

export type {
  TripoCreateTaskResponse,
  TripoTaskCreationError,
  TripoTaskStatus,
  TripoTaskStatusResponse,
} from './tripo-client.js';

// GLB durable storage (Vercel Blob) — used by ship + creature pipelines
export { storeGlbFromUrl, tryStoreGlbFromUrl } from './glb-storage.js';
export type { StoredGlb } from './glb-storage.js';

// Biosphere creature prompt helpers
export {
  CREATURE_GENERATION_COST_QUARKS,
  MAX_CREATURES_PER_PLANET,
  buildCreatureImagePrompt,
  buildOffspringDescription,
  buildHybridDescription,
  buildHybridImagePrompt,
} from './creature-prompt.js';

// Surface prompt builder
export { buildSurfacePrompt } from './surface-prompt-builder.js';

// Planet 3D model prompt builder
export { buildPlanetModelPrompt } from './planet-model-prompt-builder.js';

// Planet skin prompt builder
export { buildPlanetSkinPrompt, PLANET_SKIN_EXOSPHERE_COST_QUARKS } from './planet-skin-prompt-builder.js';
export type { PlanetSkinKind } from './planet-skin-prompt-builder.js';

// System photo/mission prompt builder
export { buildSystemPhotoPrompt, buildMissionVideoPrompt, buildGeminiSystemPhotoPrompt } from './system-photo-prompt-builder.js';

// Lifeform prompt builder (Genesis module)
export { buildLifeformPhotoPrompt, buildLifeformVideoPrompt } from './lifeform-prompt-builder.js';
export type { LifeformRarity } from './lifeform-prompt-builder.js';

// Gemini AI image generation + moderation + A.S.T.R.A. chat + daily content
export { generateImageWithGemini, generateImageWithGeminiFromImages, computeAspectRatio, moderateMessage, chatWithAstra, generateDailyQuiz, generateDailyFunFact, generateSagaChapterText } from './gemini-client.js';
export type { GeminiGenerateImageRequest, GeminiGenerateImageFromImagesRequest, GeminiGenerateImageResult, ModerationResult, ModerationVerdict, AstraMessage, AstraChatResult } from './gemini-client.js';

// "Сага Ткача" — narrator + illustration prompt builders (migration 044)
export { buildSagaChapterPrompt, parseSagaChapterResponse } from './saga-prompt.js';
export type { SagaChapterPromptResult, ParsedSagaChapter } from './saga-prompt.js';

// A.S.T.R.A. system prompt
export { ASTRA_SYSTEM_PROMPT } from './astra-prompt.js';

// Education generator
export { generateEducationPackage, generateLessonImage } from './education-generator.js';
export type { GeneratedLesson } from './education-generator.js';

// Surface photo analyzer
export { analyzePhotoForZones } from './surface-analyzer.js';

// Firebase Auth
export { verifyFirebaseToken, deleteFirebaseUser } from './firebase-admin.js';
export { authenticate, authenticateToken } from './auth-middleware.js';
export type { AuthResult } from './auth-middleware.js';

// Rate limiter
export { checkRateLimit, RATE_LIMITS, getClientIP } from './rate-limiter.js';

// Photo tokens (HMAC-signed tokens for ad-rewarded photo generation)
export { generatePhotoToken, verifyPhotoToken } from './photo-token.js';

// Google Cloud Text-to-Speech
export { synthesizeSpeech, synthesizeLongText } from './google-tts-client.js';
export type { SynthesizeRequest, SynthesizeResult, TtsLanguage, TtsGender } from './google-tts-client.js';

// Gemini TTS (legacy — natural voices, language-agnostic but Vercel-timeout-prone)
export { synthesizeWithGemini, synthesizeLongTextWithGemini } from './gemini-tts-client.js';
export type { GeminiSynthesizeRequest, GeminiSynthesizeResult } from './gemini-tts-client.js';

// ElevenLabs TTS (preferred — streaming, multilingual, A.S.T.R.A. narrator)
export { synthesizeWithElevenLabs, synthesizeLongTextWithElevenLabs } from './elevenlabs-tts-client.js';
export type { ElevenLabsSynthesizeRequest, ElevenLabsSynthesizeResult } from './elevenlabs-tts-client.js';

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
