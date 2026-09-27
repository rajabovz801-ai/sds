// Standalone Teddy Reading scoring; the published answer key lives server-side.
export function normalizeReadingAnswer(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ").trim();
}
const canonical = value => Array.isArray(value) ? value : [value];

export function validateReadingConfig(config) {
  const n = Number(config?.question_count);
  if (!Number.isInteger(n) || n < 1 || n > 60) throw Error("Invalid question count");
  const ranges = config.passage_ranges;
  if (!Array.isArray(ranges) || !ranges.length || ranges.length > 3) throw Error("Expected 1-3 passage ranges");
  const used = new Set();
  const ordered = ranges.map((range, i) => {
    const start=range?.start, end=range?.end;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start<1 || end>n || start>end) throw Error("Invalid passage range");
    for(let q=start;q<=end;q++){if(used.has(q))throw Error("Overlapping passage range");used.add(q);}
    return {label:typeof range.label==="string"&&range.label.trim()?range.label.trim().slice(0,45):"Passage "+(i+1),start,end};
  });
  if (used.size!==n || Array.from({length:n},(_,i)=>i+1).some(q=>!used.has(q))) throw Error("Passage ranges must cover every question");
  const keys=config.answer_key;
  if (!keys || typeof keys!=="object" || Array.isArray(keys)) throw Error("Answer key missing");
  for(let q=1;q<=n;q++){
    const list=canonical(keys[q]);
    if(!list.length || list.length>12 || list.some(x=>typeof x!=="string" || !normalizeReadingAnswer(x) || x.length>120)) throw Error("Invalid answer key for question "+q);
  }
  const groups=config.answer_groups ?? [];
  if (!Array.isArray(groups)) throw Error("Answer groups must be an array");
  const usedGrouped=new Set();
  for(const group of groups){
    const qs=group?.questions, answers=group?.answers;
    if(!Array.isArray(qs)||qs.length<2||qs.length>5||!Array.isArray(answers)||answers.length!==qs.length) throw Error("Invalid unordered answer group");
    if(new Set(qs).size!==qs.length||qs.some(q=>!Number.isInteger(q)||q<1||q>n||usedGrouped.has(q))) throw Error("Overlapping/invalid answer group");
    const range=ordered.find(r=>qs.every(q=>q>=r.start&&q<=r.end));
    if(!range) throw Error("Grouped answers must be inside one passage");
    const expected=answers.map(normalizeReadingAnswer);
    if(expected.some(x=>!x)||new Set(expected).size!==expected.length) throw Error("Duplicate grouped answer key");
    for(const q of qs)usedGrouped.add(q);
    for(const answer of answers){
      if(typeof answer!=="string"||answer.length>120) throw Error("Invalid group answer");
    }
  }
  return {question_count:n,ranges:ordered,groups};
}

export function academicReadingBand(score) {
  if(!Number.isInteger(score)||score<0||score>40)throw Error("Invalid band score");
  if(score>=39)return 9;if(score>=37)return 8.5;if(score>=35)return 8;
  if(score>=33)return 7.5;if(score>=30)return 7;if(score>=27)return 6.5;
  if(score>=23)return 6;if(score>=19)return 5.5;if(score>=15)return 5;
  if(score>=13)return 4.5;if(score>=10)return 4;if(score>=8)return 3.5;
  if(score>=6)return 3;if(score>=4)return 2.5;if(score>=1)return 2;
  return 0;
}

function groupSelections(group, answers) {
  const possible=group.answers.map(normalizeReadingAnswer);
  const shortCodes=possible.every(x=>/^[a-z]$/.test(x));
  const picked=[];
  for(const q of group.questions) {
    const raw=String(answers[q]??"").trim();
    if(!raw)continue;
    const values=shortCodes?raw.split(/[\s,;/]+/):[raw];
    for(const value of values){const norm=normalizeReadingAnswer(value);if(norm)picked.push(norm);}
  }
  return new Set(picked);
}

export function gradeReading(config, answers) {
  const validated=validateReadingConfig(config);
  if(!answers||typeof answers!=="object"||Array.isArray(answers))throw Error("Answers must be keyed by question number");
  const n=validated.question_count;
  const correct=Array(n+1).fill(false);
  for(let q=1;q<=n;q++){
    const actual=normalizeReadingAnswer(answers[q]);
    if(!actual)continue;
    correct[q]=canonical(config.answer_key[q]).some(key=>normalizeReadingAnswer(key)===actual);
  }
  // Two-option questions can accept answers in either order without double credit.
  for(const group of validated.groups){
    const expected=new Set(group.answers.map(normalizeReadingAnswer));
    const picked=groupSelections(group,answers);
    let matches=0;for(const x of picked)if(expected.has(x))matches++;
    group.questions.forEach((q,i)=>{correct[q]=i<matches;});
  }
  const passages=validated.ranges.map(r=>{
    let count=0;for(let q=r.start;q<=r.end;q++)count+=Number(correct[q]);
    return {label:r.label,start:r.start,end:r.end,correct:count,total:r.end-r.start+1};
  });
  const score=passages.reduce((sum,p)=>sum+p.correct,0);
  return {passages,score,total:n,band:n===40?academicReadingBand(score):null};
}
