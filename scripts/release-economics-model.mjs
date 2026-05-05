#!/usr/bin/env node

const STORE_FEE_RATE = 0.30;

const assumptions = {
  launchCohortInstalls: 10_000,
  storeFeeRate: STORE_FEE_RATE,
  activeTripoPricing: 'bulk_130k',
  adPolicy: {
    startsAfter: 'new_planet_settlement',
    expectedSettledShareByD30: 0.55,
    maxInterstitialsPerSession: 6,
    rewardedDailyLimit: 10,
  },
  costsUsd: {
    geminiImage: 0.05,
    geminiText: 0.002,
    weeklyDigestImages: 0.50,
    emailPerThousand: 1.0,
  },
  kling: {
    usdPerGenerationUnit: 0.0035,
    unitsPerPhotoGeneration: 8,
  },
  tripo: {
    creditsPerShipModel: 40,
    pricing: {
      standard: { usd: 1, credits: 100 },
      bulk_130k: { usd: 1000, credits: 130000 },
    },
  },
  storeProducts: [
    { id: 'nebulife_quarks_100', quarks: 100, grossUsd: 0.99 },
    { id: 'nebulife_quarks_500', quarks: 500, grossUsd: 3.99 },
    { id: 'nebulife_quarks_2000', quarks: 2000, grossUsd: 12.99 },
  ],
  sinks: [
    { id: 'planet_alpha_photo', quarks: 25, unitCost: 'klingPhoto', note: 'Kling mission/planet photo' },
    { id: 'exosphere_skin', quarks: 50, unitCost: 'klingPhoto', note: 'Kling planet texture skin' },
    { id: 'system_alpha_photo', quarks: 100, unitCost: 'geminiImage', note: 'Gemini/Kling system photo fallback' },
    { id: 'ship_3d_model', quarks: 500, unitCost: 'tripoShipModel', note: 'Tripo text-to-model GLB, 40 credits' },
  ],
  averagePaidMix: {
    planet_alpha_photo: 0.54,
    exosphere_skin: 0.22,
    system_alpha_photo: 0.14,
    ship_3d_model: 0.10,
  },
  scenarios: {
    conservative: {
      d1: 0.25,
      d7: 0.08,
      d30: 0.025,
      payerConversion: 0.035,
      arppuGrossUsd: 4.2,
      paidActionsPerPayer: 3,
      freePhotosPerInstall: 1,
      rewardedAdsPerSettledDau: 0.6,
      interstitialsPerSettledDau: 0.55,
      rewardedEcpm: 8,
      interstitialEcpm: 2.5,
    },
    base: {
      d1: 0.35,
      d7: 0.14,
      d30: 0.06,
      payerConversion: 0.08,
      arppuGrossUsd: 8.5,
      paidActionsPerPayer: 5.5,
      freePhotosPerInstall: 1,
      rewardedAdsPerSettledDau: 1.1,
      interstitialsPerSettledDau: 1.0,
      rewardedEcpm: 11,
      interstitialEcpm: 3.5,
    },
    upside: {
      d1: 0.45,
      d7: 0.22,
      d30: 0.10,
      payerConversion: 0.15,
      arppuGrossUsd: 14.5,
      paidActionsPerPayer: 9,
      freePhotosPerInstall: 1,
      rewardedAdsPerSettledDau: 1.6,
      interstitialsPerSettledDau: 1.25,
      rewardedEcpm: 15,
      interstitialEcpm: 5,
    },
  },
};

const round = (value, digits = 2) => Number(value.toFixed(digits));
const net = (grossUsd) => grossUsd * (1 - STORE_FEE_RATE);
const tripoUsdPerCredit = (pricingKey) => {
  const pricing = assumptions.tripo.pricing[pricingKey];
  return pricing.usd / pricing.credits;
};
const tripoShipCostUsd = (pricingKey = assumptions.activeTripoPricing) =>
  assumptions.tripo.creditsPerShipModel * tripoUsdPerCredit(pricingKey);
const klingPhotoCostUsd = () =>
  assumptions.kling.usdPerGenerationUnit * assumptions.kling.unitsPerPhotoGeneration;
const unitCostUsd = (key) => {
  if (key === 'klingPhoto') return klingPhotoCostUsd();
  if (key === 'tripoShipModel') return tripoShipCostUsd();
  return assumptions.costsUsd[key];
};
const blendedNetUsdPerQuark = () => {
  const weighted = assumptions.storeProducts.reduce((acc, product) => {
    const weight = product.quarks === 100 ? 0.35 : product.quarks === 500 ? 0.45 : 0.20;
    acc.netUsd += net(product.grossUsd) * weight;
    acc.quarks += product.quarks * weight;
    return acc;
  }, { netUsd: 0, quarks: 0 });
  return weighted.netUsd / weighted.quarks;
};

function weightedPaidActionEconomics() {
  const blendedQuarkNet = blendedNetUsdPerQuark();
  return assumptions.sinks.reduce((acc, sink) => {
    const share = assumptions.averagePaidMix[sink.id] ?? 0;
    const costUsd = unitCostUsd(sink.unitCost);
    const netRevenueUsd = sink.quarks * blendedQuarkNet;
    const breakEvenQuarks = Math.ceil(costUsd / blendedQuarkNet);
    const targetMarginQuarks = Math.ceil((costUsd / (1 - 0.35)) / blendedQuarkNet);
    acc.actions.push({
      id: sink.id,
      quarks: sink.quarks,
      netRevenueUsd: round(netRevenueUsd, 3),
      unitCostUsd: round(costUsd, 4),
      grossMarginUsd: round(netRevenueUsd - costUsd, 3),
      grossMarginPct: round((netRevenueUsd - costUsd) / Math.max(0.01, netRevenueUsd), 3),
      breakEvenQuarks,
      recommendedMinQuarksFor35PctMargin: targetMarginQuarks,
      paidMixShare: share,
      note: sink.note,
    });
    acc.blendedNetRevenueUsd += netRevenueUsd * share;
    acc.blendedCostUsd += costUsd * share;
    return acc;
  }, { actions: [], blendedNetRevenueUsd: 0, blendedCostUsd: 0 });
}

function modelScenario(name, s) {
  const installs = assumptions.launchCohortInstalls;
  const dau30 = installs * s.d30;
  const settledDau30 = dau30 * assumptions.adPolicy.expectedSettledShareByD30;
  const payers = installs * s.payerConversion;
  const iapGrossRevenue = payers * s.arppuGrossUsd;
  const iapNetRevenue = net(iapGrossRevenue);
  const paidActionEconomics = weightedPaidActionEconomics();
  const paidActionCost = payers * s.paidActionsPerPayer * paidActionEconomics.blendedCostUsd;
  const freePhotoCost = installs * s.freePhotosPerInstall * klingPhotoCostUsd();
  const rewardedAdRevenue30d = (settledDau30 * s.rewardedAdsPerSettledDau * s.rewardedEcpm / 1000) * 30;
  const interstitialAdRevenue30d = (settledDau30 * s.interstitialsPerSettledDau * s.interstitialEcpm / 1000) * 30;
  const adRevenue30d = rewardedAdRevenue30d + interstitialAdRevenue30d;
  const totalNetRevenue = iapNetRevenue + adRevenue30d;
  const aiCost = freePhotoCost + paidActionCost;
  const grossProfit = totalNetRevenue - aiCost;
  const netArpu30 = totalNetRevenue / installs;
  const aiCostPerInstall = aiCost / installs;
  const breakEvenPayerConversion = aiCost / Math.max(0.01, installs * s.arppuGrossUsd * (1 - STORE_FEE_RATE));

  return {
    name,
    installs,
    retention: { d1: s.d1, d7: s.d7, d30: s.d30 },
    dau30: Math.round(dau30),
    settledDau30: Math.round(settledDau30),
    payers: Math.round(payers),
    payerConversion: s.payerConversion,
    iapGrossRevenueUsd: round(iapGrossRevenue),
    iapNetRevenueUsd: round(iapNetRevenue),
    rewardedAdRevenue30dUsd: round(rewardedAdRevenue30d),
    interstitialAdRevenue30dUsd: round(interstitialAdRevenue30d),
    totalNetRevenue30dUsd: round(totalNetRevenue),
    freePhotoCostUsd: round(freePhotoCost),
    paidActionCostUsd: round(paidActionCost),
    totalAiCostUsd: round(aiCost),
    grossProfit30dUsd: round(grossProfit),
    grossMarginPct: round(grossProfit / Math.max(0.01, totalNetRevenue), 3),
    netArpu30Usd: round(netArpu30, 4),
    aiCostPerInstallUsd: round(aiCostPerInstall, 4),
    adArpdauSettledUsd: round((adRevenue30d / 30) / Math.max(1, settledDau30), 4),
    breakEvenPayerConversion: round(breakEvenPayerConversion, 4),
  };
}

const paidActionEconomics = weightedPaidActionEconomics();
const scenarios = Object.entries(assumptions.scenarios).map(([name, scenario]) => modelScenario(name, scenario));

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  assumptions,
  monetizationPlan: {
    ads: [
      'Rewarded and interstitial ads are gated until the player settles on the new planet.',
      'Rewarded ads stay opt-in and capped at 10 per UTC day.',
      'Interstitials remain cooldown-based and capped per session; premium disables them.',
    ],
    paidActionEconomics: paidActionEconomics.actions,
    blendedPaidAction: {
      netRevenueUsd: round(paidActionEconomics.blendedNetRevenueUsd, 3),
      aiCostUsd: round(paidActionEconomics.blendedCostUsd, 3),
      marginUsd: round(paidActionEconomics.blendedNetRevenueUsd - paidActionEconomics.blendedCostUsd, 3),
      marginPct: round((paidActionEconomics.blendedNetRevenueUsd - paidActionEconomics.blendedCostUsd) / Math.max(0.01, paidActionEconomics.blendedNetRevenueUsd), 3),
      blendedNetUsdPerQuark: round(blendedNetUsdPerQuark(), 4),
    },
    pricingRecommendations: paidActionEconomics.actions
      .filter((action) => action.quarks < action.recommendedMinQuarksFor35PctMargin)
      .map((action) => ({
        id: action.id,
        currentQuarks: action.quarks,
        breakEvenQuarks: action.breakEvenQuarks,
        recommendedMinQuarksFor35PctMargin: action.recommendedMinQuarksFor35PctMargin,
        reason: 'Current price does not reach 35% margin after store fee and AI unit cost.',
      })),
    quarkPacksAfterStoreFee: assumptions.storeProducts.map((product) => ({
      ...product,
      netUsd: round(net(product.grossUsd), 2),
      netUsdPerQuark: round(net(product.grossUsd) / product.quarks, 4),
    })),
    tripoPricing: Object.entries(assumptions.tripo.pricing).map(([id, pricing]) => ({
      id,
      usdPerCredit: round(tripoUsdPerCredit(id), 5),
      shipModelCostUsd: round(tripoShipCostUsd(id), 4),
      creditsPerShipModel: assumptions.tripo.creditsPerShipModel,
      active: id === assumptions.activeTripoPricing,
    })),
    klingPricing: {
      usdPerGenerationUnit: assumptions.kling.usdPerGenerationUnit,
      unitsPerPhotoGeneration: assumptions.kling.unitsPerPhotoGeneration,
      photoGenerationCostUsd: round(klingPhotoCostUsd(), 4),
    },
    launchKpis: [
      'D1 retention >= 35%, D7 >= 14%, D30 >= 6% for base plan.',
      'Payer conversion >= 8% or paid action volume must increase.',
      'Free photo cost per install should stay near $0.028 while Kling generation cost holds.',
      'Settled-player ad ARPDAU should reach $0.015+ before increasing interstitial frequency.',
    ],
  },
  scenarios,
  releaseRisks: [
    'Free first photo is much cheaper with current Kling pricing, but still scales linearly with installs.',
    'Ads begin only after new-planet settlement, so launch ad revenue is delayed by progression speed.',
    'If AdMob fill is weak on iOS launch, rewarded ARPDAU should be treated as upside, not base.',
    'Ship GLB margin depends on buying Tripo credits in bulk and keeping retry/failure rate low.',
  ],
}, null, 2));
