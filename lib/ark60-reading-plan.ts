const PASSAGE_DAYS: Record<1 | 2 | 3, readonly number[]> = {
  1: [1, 5, 8, 12, 15],
  2: [2, 6, 9, 13, 16],
  3: [3, 7, 10, 14, 17],
};

export function readingPassageForDay(day: number): 1 | 2 | 3 | null {
  for (const passage of [1, 2, 3] as const) {
    if (PASSAGE_DAYS[passage].includes(day)) return passage;
  }
  return null;
}
