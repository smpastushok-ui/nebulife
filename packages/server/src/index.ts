// @nebulife/server — exports for use in Vercel serverless functions

export {
  // Player
  createPlayer,
  getPlayer,
  updatePlayer,
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
} from './db.js';

export {
  generateImage,
  checkTaskStatus,
} from './kling-client.js';

export type {
  KlingGenerateRequest,
  KlingGenerateResponse,
  KlingTaskStatusResponse,
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

// Surface photo analyzer
export { analyzePhotoForZones } from './surface-analyzer.js';
