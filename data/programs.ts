export const programs = [
  {
    slug: 'ielts',
    title: 'IELTS',
    badge: 'Academic & General',
    description: 'Full mock exams, section practice, detailed results and progress tracking.',
    items: ['Reading', 'Listening', 'Writing', 'Speaking'],
  },
  {
    slug: 'cefr',
    title: 'CEFR',
    badge: 'A2 → C1',
    description: 'Level-based mock tests, skill practice and structured preparation.',
    items: ['Reading', 'Listening', 'Writing', 'Speaking'],
  },
] as const;

export const mockSets = {
  ielts: [
    { title: 'IELTS Full Mock 01', meta: '40 Reading • 40 Listening • Writing • Speaking', status: 'Available' },
    { title: 'IELTS Reading Practice', meta: '3 passages • 40 questions', status: 'Available' },
    { title: 'IELTS Listening Practice', meta: '4 sections • 40 questions', status: 'Available' },
  ],
  cefr: [
    { title: 'CEFR Full Mock 01', meta: 'Multi-skill exam simulation', status: 'Available' },
    { title: 'CEFR Reading Practice', meta: 'Level-based reading tasks', status: 'Available' },
    { title: 'CEFR Listening Practice', meta: 'Level-based listening tasks', status: 'Available' },
  ],
} as const;
