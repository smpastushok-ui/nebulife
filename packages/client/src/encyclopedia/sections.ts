// Encyclopedia section catalog — order shown in the table of contents.

import type { SectionMeta } from './types.js';

export const SECTIONS: SectionMeta[] = [
  {
    id: 'astronomy',
    title: { uk: 'Астрономія', en: 'Astronomy' },
    description: {
      uk: 'Спостережна наука про небесні тіла — від античних карт до JWST.',
      en: 'The observational science of celestial objects — from ancient charts to JWST.',
    },
  },
  {
    id: 'astrophysics',
    title: { uk: 'Астрофізика', en: 'Astrophysics' },
    description: {
      uk: 'Фізика космосу: гравітація, відносність, чорні діри, нейтронні зорі.',
      en: 'Physics of the cosmos: gravity, relativity, black holes, neutron stars.',
    },
  },
  {
    id: 'cosmology',
    title: { uk: 'Космологія', en: 'Cosmology' },
    description: {
      uk: 'Великий вибух, темна матерія, темна енергія і доля Всесвіту.',
      en: 'The Big Bang, dark matter, dark energy, and the fate of the Universe.',
    },
  },
  {
    id: 'planetology',
    title: { uk: 'Планетологія', en: 'Planetology' },
    description: {
      uk: 'Планети Сонячної системи, екзопланети, моря і вулкани інших світів.',
      en: 'Solar system planets, exoplanets, oceans and volcanoes of other worlds.',
    },
  },
  {
    id: 'astrobiology',
    title: { uk: 'Астробіологія', en: 'Astrobiology' },
    description: {
      uk: 'Походження життя і пошуки його за межами Землі.',
      en: 'Origin of life and the search for it beyond Earth.',
    },
  },
  {
    id: 'space-tech',
    title: { uk: 'Космічна техніка', en: 'Space Technology' },
    description: {
      uk: 'Ракети, орбіти, скафандри, рушії — як ми долаємо гравітацію.',
      en: 'Rockets, orbits, suits, propulsion — how we beat gravity.',
    },
  },
  {
    id: 'crewed-missions',
    title: { uk: 'Пілотовані польоти', en: 'Crewed Spaceflight' },
    description: {
      uk: 'Від Гагаріна до Artemis: люди в космосі.',
      en: 'From Gagarin to Artemis: humans in space.',
    },
  },
  {
    id: 'robotic-missions',
    title: { uk: 'Беспілотні місії', en: 'Robotic Missions' },
    description: {
      uk: 'Voyager, Hubble, JWST, Perseverance — наші очі і руки в космосі.',
      en: 'Voyager, Hubble, JWST, Perseverance — our eyes and hands in space.',
    },
  },
  {
    id: 'applied-space',
    title: { uk: 'Прикладна космонавтика', en: 'Applied Space' },
    description: {
      uk: 'GPS, Starlink, дистанційне зондування, космічна економіка і право.',
      en: 'GPS, Starlink, remote sensing, the space economy and law.',
    },
  },
];
