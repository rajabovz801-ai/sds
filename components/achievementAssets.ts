export const achievementAssets = {
  'first-test': '/achievements/first-test.png',
  'streak': '/achievements/streak.png',
  'study-hero': '/achievements/reading-master.png',
  'trophy': '/achievements/listening-boost.png',
  'ten-tests': '/achievements/overall-band-generated.svg',
  'target': '/achievements/accuracy-ace.png',
  'band7': '/achievements/band-seven.png',
  'perfect-vocab': '/achievements/overall-band-generated.svg',
  'fast-learner': '/achievements/overall-band-generated.svg',
  'quote-trophy': '/achievements/overall-band-generated.svg',
} as const;

export type AchievementAssetKey = keyof typeof achievementAssets;
