export type PremiumHelpId =
  | 'system-alpha-photo'
  | 'system-mission-video'
  | 'planet-skin'
  | 'planet-photo-exosphere'
  | 'planet-photo-biosphere'
  | 'planet-photo-aerial'
  | 'mission-alpha-photo'
  | 'custom-ship'
  | 'astra-charge'
  | 'quarks'
  | 'premium-subscription'
  | 'rewarded-ads'
  | 'colony-resource-boost'
  | 'colony-time-boost'
  | 'alpha-harvester';

export type PremiumHelpPreview = 'photo' | 'planet' | 'ship' | 'boost' | 'ads' | 'astra' | 'quarks';

export interface PremiumHelpContent {
  titleKey: string;
  shortKey: string;
  benefitsKey: string;
  whyPaidKey: string;
  resultKey: string;
  preview?: PremiumHelpPreview;
}

export const PREMIUM_HELP_CONTENT: Record<PremiumHelpId, PremiumHelpContent> = {
  'system-alpha-photo': {
    titleKey: 'premium_help.system_alpha_photo.title',
    shortKey: 'premium_help.system_alpha_photo.short',
    benefitsKey: 'premium_help.system_alpha_photo.benefits',
    whyPaidKey: 'premium_help.system_alpha_photo.why_paid',
    resultKey: 'premium_help.system_alpha_photo.result',
    preview: 'photo',
  },
  'system-mission-video': {
    titleKey: 'premium_help.system_mission_video.title',
    shortKey: 'premium_help.system_mission_video.short',
    benefitsKey: 'premium_help.system_mission_video.benefits',
    whyPaidKey: 'premium_help.system_mission_video.why_paid',
    resultKey: 'premium_help.system_mission_video.result',
    preview: 'photo',
  },
  'planet-skin': {
    titleKey: 'premium_help.planet_skin.title',
    shortKey: 'premium_help.planet_skin.short',
    benefitsKey: 'premium_help.planet_skin.benefits',
    whyPaidKey: 'premium_help.planet_skin.why_paid',
    resultKey: 'premium_help.planet_skin.result',
    preview: 'planet',
  },
  'planet-photo-exosphere': {
    titleKey: 'premium_help.planet_photo_exosphere.title',
    shortKey: 'premium_help.planet_photo_exosphere.short',
    benefitsKey: 'premium_help.planet_photo_exosphere.benefits',
    whyPaidKey: 'premium_help.planet_photo_exosphere.why_paid',
    resultKey: 'premium_help.planet_photo_exosphere.result',
    preview: 'photo',
  },
  'planet-photo-biosphere': {
    titleKey: 'premium_help.planet_photo_biosphere.title',
    shortKey: 'premium_help.planet_photo_biosphere.short',
    benefitsKey: 'premium_help.planet_photo_biosphere.benefits',
    whyPaidKey: 'premium_help.planet_photo_biosphere.why_paid',
    resultKey: 'premium_help.planet_photo_biosphere.result',
    preview: 'photo',
  },
  'planet-photo-aerial': {
    titleKey: 'premium_help.planet_photo_aerial.title',
    shortKey: 'premium_help.planet_photo_aerial.short',
    benefitsKey: 'premium_help.planet_photo_aerial.benefits',
    whyPaidKey: 'premium_help.planet_photo_aerial.why_paid',
    resultKey: 'premium_help.planet_photo_aerial.result',
    preview: 'photo',
  },
  'mission-alpha-photo': {
    titleKey: 'premium_help.mission_alpha_photo.title',
    shortKey: 'premium_help.mission_alpha_photo.short',
    benefitsKey: 'premium_help.mission_alpha_photo.benefits',
    whyPaidKey: 'premium_help.mission_alpha_photo.why_paid',
    resultKey: 'premium_help.mission_alpha_photo.result',
    preview: 'photo',
  },
  'custom-ship': {
    titleKey: 'premium_help.custom_ship.title',
    shortKey: 'premium_help.custom_ship.short',
    benefitsKey: 'premium_help.custom_ship.benefits',
    whyPaidKey: 'premium_help.custom_ship.why_paid',
    resultKey: 'premium_help.custom_ship.result',
    preview: 'ship',
  },
  'astra-charge': {
    titleKey: 'premium_help.astra_charge.title',
    shortKey: 'premium_help.astra_charge.short',
    benefitsKey: 'premium_help.astra_charge.benefits',
    whyPaidKey: 'premium_help.astra_charge.why_paid',
    resultKey: 'premium_help.astra_charge.result',
    preview: 'astra',
  },
  quarks: {
    titleKey: 'premium_help.quarks.title',
    shortKey: 'premium_help.quarks.short',
    benefitsKey: 'premium_help.quarks.benefits',
    whyPaidKey: 'premium_help.quarks.why_paid',
    resultKey: 'premium_help.quarks.result',
    preview: 'quarks',
  },
  'premium-subscription': {
    titleKey: 'premium_help.premium_subscription.title',
    shortKey: 'premium_help.premium_subscription.short',
    benefitsKey: 'premium_help.premium_subscription.benefits',
    whyPaidKey: 'premium_help.premium_subscription.why_paid',
    resultKey: 'premium_help.premium_subscription.result',
    preview: 'boost',
  },
  'rewarded-ads': {
    titleKey: 'premium_help.rewarded_ads.title',
    shortKey: 'premium_help.rewarded_ads.short',
    benefitsKey: 'premium_help.rewarded_ads.benefits',
    whyPaidKey: 'premium_help.rewarded_ads.why_paid',
    resultKey: 'premium_help.rewarded_ads.result',
    preview: 'ads',
  },
  'colony-resource-boost': {
    titleKey: 'premium_help.colony_resource_boost.title',
    shortKey: 'premium_help.colony_resource_boost.short',
    benefitsKey: 'premium_help.colony_resource_boost.benefits',
    whyPaidKey: 'premium_help.colony_resource_boost.why_paid',
    resultKey: 'premium_help.colony_resource_boost.result',
    preview: 'boost',
  },
  'colony-time-boost': {
    titleKey: 'premium_help.colony_time_boost.title',
    shortKey: 'premium_help.colony_time_boost.short',
    benefitsKey: 'premium_help.colony_time_boost.benefits',
    whyPaidKey: 'premium_help.colony_time_boost.why_paid',
    resultKey: 'premium_help.colony_time_boost.result',
    preview: 'boost',
  },
  'alpha-harvester': {
    titleKey: 'premium_help.alpha_harvester.title',
    shortKey: 'premium_help.alpha_harvester.short',
    benefitsKey: 'premium_help.alpha_harvester.benefits',
    whyPaidKey: 'premium_help.alpha_harvester.why_paid',
    resultKey: 'premium_help.alpha_harvester.result',
    preview: 'boost',
  },
};
