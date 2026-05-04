export type MissionCurriculumChapterId =
  | 'surface'
  | 'why'
  | 'mission'
  | 'method'
  | 'livingGalaxy'
  | 'artifacts'
  | 'future';

export interface MissionCurriculumChapter {
  id: MissionCurriculumChapterId;
  index: number;
  titleKey: string;
  summaryKey: string;
  bodyKeys: string[];
  meaningKeys: string[];
  actionKey: string;
}

export const MISSION_CURRICULUM: MissionCurriculumChapter[] = [
  {
    id: 'surface',
    index: 1,
    titleKey: 'academy.mission.chapters.surface.title',
    summaryKey: 'academy.mission.chapters.surface.summary',
    bodyKeys: [
      'academy.mission.chapters.surface.body_1',
      'academy.mission.chapters.surface.body_2',
      'academy.mission.chapters.surface.body_3',
      'academy.mission.chapters.surface.body_4',
    ],
    meaningKeys: [
      'academy.mission.chapters.surface.meaning_1',
      'academy.mission.chapters.surface.meaning_2',
      'academy.mission.chapters.surface.meaning_3',
    ],
    actionKey: 'academy.mission.chapters.surface.action',
  },
  {
    id: 'why',
    index: 2,
    titleKey: 'academy.mission.chapters.why.title',
    summaryKey: 'academy.mission.chapters.why.summary',
    bodyKeys: [
      'academy.mission.chapters.why.body_1',
      'academy.mission.chapters.why.body_2',
      'academy.mission.chapters.why.body_3',
    ],
    meaningKeys: [
      'academy.mission.chapters.why.meaning_1',
      'academy.mission.chapters.why.meaning_2',
      'academy.mission.chapters.why.meaning_3',
    ],
    actionKey: 'academy.mission.chapters.why.action',
  },
  {
    id: 'mission',
    index: 3,
    titleKey: 'academy.mission.chapters.mission.title',
    summaryKey: 'academy.mission.chapters.mission.summary',
    bodyKeys: [
      'academy.mission.chapters.mission.body_1',
      'academy.mission.chapters.mission.body_2',
      'academy.mission.chapters.mission.body_3',
    ],
    meaningKeys: [
      'academy.mission.chapters.mission.meaning_1',
      'academy.mission.chapters.mission.meaning_2',
      'academy.mission.chapters.mission.meaning_3',
    ],
    actionKey: 'academy.mission.chapters.mission.action',
  },
  {
    id: 'method',
    index: 4,
    titleKey: 'academy.mission.chapters.method.title',
    summaryKey: 'academy.mission.chapters.method.summary',
    bodyKeys: [
      'academy.mission.chapters.method.body_1',
      'academy.mission.chapters.method.body_2',
      'academy.mission.chapters.method.body_3',
    ],
    meaningKeys: [
      'academy.mission.chapters.method.meaning_1',
      'academy.mission.chapters.method.meaning_2',
      'academy.mission.chapters.method.meaning_3',
    ],
    actionKey: 'academy.mission.chapters.method.action',
  },
  {
    id: 'livingGalaxy',
    index: 5,
    titleKey: 'academy.mission.chapters.livingGalaxy.title',
    summaryKey: 'academy.mission.chapters.livingGalaxy.summary',
    bodyKeys: [
      'academy.mission.chapters.livingGalaxy.body_1',
      'academy.mission.chapters.livingGalaxy.body_2',
      'academy.mission.chapters.livingGalaxy.body_3',
    ],
    meaningKeys: [
      'academy.mission.chapters.livingGalaxy.meaning_1',
      'academy.mission.chapters.livingGalaxy.meaning_2',
      'academy.mission.chapters.livingGalaxy.meaning_3',
    ],
    actionKey: 'academy.mission.chapters.livingGalaxy.action',
  },
  {
    id: 'artifacts',
    index: 6,
    titleKey: 'academy.mission.chapters.artifacts.title',
    summaryKey: 'academy.mission.chapters.artifacts.summary',
    bodyKeys: [
      'academy.mission.chapters.artifacts.body_1',
      'academy.mission.chapters.artifacts.body_2',
      'academy.mission.chapters.artifacts.body_3',
    ],
    meaningKeys: [
      'academy.mission.chapters.artifacts.meaning_1',
      'academy.mission.chapters.artifacts.meaning_2',
      'academy.mission.chapters.artifacts.meaning_3',
    ],
    actionKey: 'academy.mission.chapters.artifacts.action',
  },
  {
    id: 'future',
    index: 7,
    titleKey: 'academy.mission.chapters.future.title',
    summaryKey: 'academy.mission.chapters.future.summary',
    bodyKeys: [
      'academy.mission.chapters.future.body_1',
      'academy.mission.chapters.future.body_2',
      'academy.mission.chapters.future.body_3',
    ],
    meaningKeys: [
      'academy.mission.chapters.future.meaning_1',
      'academy.mission.chapters.future.meaning_2',
      'academy.mission.chapters.future.meaning_3',
    ],
    actionKey: 'academy.mission.chapters.future.action',
  },
];
