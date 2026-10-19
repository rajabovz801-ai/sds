const START_UTC = Date.UTC(2026, 9, 1);
const DAY_MS = 86_400_000;

function isSunday(day: number) {
  return new Date(START_UTC + (day - 1) * DAY_MS).getUTCDay() === 0;
}

export function readingPassageForDay(day: number): 1 | 2 | 3 | null {
  if (!Number.isInteger(day) || day < 1 || day > 60 || isSunday(day)) return null;
  let regularDayIndex = 0;
  for (let current = 1; current <= day; current += 1) {
    if (!isSunday(current)) regularDayIndex += 1;
  }
  return (((regularDayIndex - 1) % 3) + 1) as 1 | 2 | 3;
}


type VocabularySource={day_number:number;source_kind:string;source_ordinal:number};
export function vocabularySourceLabel(unit:VocabularySource){
 return unit.source_kind==='article'?'Article':`Reading · Passage ${readingPassageForDay(unit.day_number)||1} · Practice ${unit.source_ordinal}`;
}

export function vocabularyUnitsReady(units:ReadonlyArray<{word_count:number}>){
 return units.length>0&&units.every(unit=>unit.word_count===20);
}
