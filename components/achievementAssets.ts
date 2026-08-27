export const achievementAssets = {
  'first-test': '/achievements/first-test.png',
  'streak': '/achievements/streak.png',
  'study-hero': '/achievements/reading-master.png',
  'trophy': '/achievements/listening-boost.png',
  'ten-tests': '/achievements/ten-tests.png',
  'target': '/achievements/accuracy-ace.png',
  'band7': '/achievements/band-seven.png',
  'perfect-vocab': '/achievements/perfect-section.png',
  'fast-learner': '/achievements/fast-finisher.png',
  'quote-trophy': '/achievements/consistency.png',
} as const;

export type AchievementAssetKey = keyof typeof achievementAssets;
