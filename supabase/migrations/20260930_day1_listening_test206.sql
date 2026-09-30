-- Day 1 IELTS Listening · TEST 206
-- Canonical source: user-provided TEST 206.pdf and supplied audio URL.

create table if not exists public.ark60_listening_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.ark60_students(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 60),
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  elapsed_seconds integer not null default 0 check (elapsed_seconds between 0 and 7200),
  part_scores integer[],
  score integer check (score is null or (score between 0 and 40)),
  band numeric(2,1) check (band is null or (band between 0 and 9 and band*2=round(band*2))),
  unique(student_id,day_number)
);
alter table public.ark60_listening_attempts enable row level security;
create index if not exists ark60_listening_attempts_day_idx on public.ark60_listening_attempts(day_number,submitted_at desc);
create index if not exists ark60_listening_attempts_student_idx on public.ark60_listening_attempts(student_id,day_number);

insert into public.ark60_content(day_number,module,title,status,payload,published_at,updated_at)
values(
1,'listening','IELTS Listening Test 206','published',
$json$
{
  "version":"listening-test-206-v1",
  "test_code":"TEST-206",
  "audio_url":"https://ia600504.us.archive.org/32/items/test-206/TEST%20206.mp3",
  "total_questions":40,
  "audio_once":true,
  "sections":[
    {
      "number":1,
      "label":"SECTION 1",
      "range":"Questions 1–10",
      "blocks":[
        {
          "kind":"table",
          "range":"Questions 1–6",
          "instruction":"Complete the table below.",
          "word_limit":"Write ONE WORD AND/OR A NUMBER for each answer.",
          "title":"Oyster Bay Sailing Club Courses",
          "headers":["Name of course","What you learn","Cost","Other information"],
          "rows":[
            [["Taster day"],["introduction to sailing"],["£120 if booking one place"],["small groups (max ",{"q":1}," people)"]],
            [["Level 1"],["basic theory e.g. understanding the ",{"q":2}," and tides","basic sailing skills including ",{"q":3}," information"],["£200",{"q":4}," available for club members","all inclusive (plus a useful ",{"q":5},")"],["a ",{"q":6}," at the end of the course for all participants"]]
          ]
        },
        {
          "kind":"notes",
          "range":"Questions 7–10",
          "instruction":"Complete the notes below.",
          "word_limit":"Write ONE WORD ONLY for each answer.",
          "title":"General information",
          "items":[
            ["Participants must be able to swim."],
            ["Bring suitable clothing, a ",{"q":7}," and toiletries (e.g. shampoo)."],
            ["There is a ",{"q":8}," at the club."],
            ["Online training ",{"q":9}," are recommended."],
            [{"q":10}," are available for course participants."]
          ]
        }
      ]
    },
    {
      "number":2,
      "label":"SECTION 2",
      "range":"Questions 11–20",
      "blocks":[
        {
          "kind":"mcq",
          "range":"Questions 11–16",
          "instruction":"Choose the correct letter, A, B or C.",
          "title":"Working as a makeup trainee",
          "questions":[
            {"q":11,"text":"What should trainees always expect to get when working on low budget short films?","options":{"A":"travel expenses","B":"a minimum wage","C":"meals"}},
            {"q":12,"text":"According to the speaker, on big budget films trainees may get experience of","options":{"A":"makeup for special effects.","B":"working with different ethnicities.","C":"creating a variety of hair styles."}},
            {"q":13,"text":"The speaker says a problem for makeup artists is","options":{"A":"dealing with difficult directors.","B":"being shouted at by their supervisor.","C":"waiting around for hours doing nothing."}},
            {"q":14,"text":"How did the speaker feel when she met famous actors for the first time?","options":{"A":"very shy","B":"very proud","C":"very disappointed"}},
            {"q":15,"text":"What advice does the speaker give about makeup kits?","options":{"A":"Always carry a basic kit with you.","B":"Only buy the best products for a makeup kit.","C":"Ask other makeup artists to check your kit."}},
            {"q":16,"text":"What advice does the speaker give about creating a portfolio?","options":{"A":"Keep print and digital photos.","B":"Only include a small selection of photos.","C":"Get permission to use photos."}}
          ]
        },
        {
          "kind":"matching",
          "range":"Questions 17–20",
          "instruction":"What ability is required for each of the following duties?",
          "word_limit":"Write the correct letter, A, B, or C, next to Questions 17–20.",
          "choices":{"A":"being well-organised","B":"being flexible","C":"working quickly"},
          "items":[
            {"q":17,"text":"Prepping an actor"},
            {"q":18,"text":"Continuity"},
            {"q":19,"text":"General"},
            {"q":20,"text":"Applying makeup"}
          ]
        }
      ]
    },
    {
      "number":3,
      "label":"SECTION 3",
      "range":"Questions 21–30",
      "blocks":[
        {
          "kind":"choose_two",
          "range":"Questions 21 and 22",
          "instruction":"Choose TWO letters, A–E.",
          "question":"Which TWO features of the lecture on ocean biodiversity had the greatest impact on the students?",
          "questions":[21,22],
          "options":{"A":"the references to local problems","B":"the broad focus of the examples","C":"the practical suggestions for solutions","D":"the type of issues discussed","E":"the implications for government policy"}
        },
        {
          "kind":"choose_two",
          "range":"Questions 23 and 24",
          "instruction":"Choose TWO letters, A–E.",
          "question":"Which TWO details about the research project particularly impressed the students?",
          "questions":[23,24],
          "options":{"A":"the team’s previous successes","B":"its wide geographical scale","C":"the use of new technology","D":"the extensive statistical evidence","E":"the large range of specialists involved"}
        },
        {
          "kind":"matching",
          "range":"Questions 25–30",
          "instruction":"What is the students’ opinion of each of the following resources related to ocean biodiversity?",
          "word_limit":"Choose SIX answers from the box and write the correct letter, A–H, next to Questions 25–30.",
          "choices":{"A":"This is aimed at a very specialist audience.","B":"This is now rather outdated.","C":"This was an effective description of a new danger.","D":"This suggests possible ways to improve the situation.","E":"This does not give a balanced account.","F":"This is too predictable to be useful.","G":"This gives insufficient evidence for its claims.","H":"This gives a clear explanation of the problems."},
          "items":[
            {"q":25,"text":"Article on invasive lionfish"},
            {"q":26,"text":"Documentary on microplastics"},
            {"q":27,"text":"Podcast on ocean pollution"},
            {"q":28,"text":"Book on coastal ecosystems"},
            {"q":29,"text":"Article on metal toxicity"},
            {"q":30,"text":"Podcast on floating marine cities"}
          ]
        }
      ]
    },
    {
      "number":4,
      "label":"SECTION 4",
      "range":"Questions 31–40",
      "blocks":[
        {
          "kind":"notes_groups",
          "range":"Questions 31–40",
          "instruction":"Complete the notes below.",
          "word_limit":"Write ONE WORD ONLY for each answer.",
          "title":"Sources of rubber",
          "groups":[
            {"heading":"Three resources which are essential for industrial civilisation","items":[[{"q":31}],["fossil fuels"],["rubber"]]},
            {"heading":"Natural rubber","intro":"This mainly comes from the Pará rubber tree, now cultivated in South-East Asia. The supply is limited because","items":[["the growth of the tree is ",{"q":32}],["production cannot easily be adjusted because of increasing or decreasing ",{"q":33}],["the tree only grows near the ",{"q":34}],["extracting the latex (rubber) is labour-intensive"],["it is very difficult to ",{"q":35}," rubber after production."]]},
            {"heading":"New threats include","items":[["lack of genetic diversity, leading to danger of disease caused by a ",{"q":36}],["a shift to the cultivation of palm oil"],["extreme ",{"q":37}," events."]]},
            {"heading":"Synthetic rubber","items":[["may be used for engine parts and cooking utensils"],["is less ",{"q":38}," than natural rubber"],["is unsuitable for many purposes e.g. the tyres of aircraft."]]},
            {"heading":"An alternative source of natural rubber","items":[["A wild flower (a type of dandelion) has rubber in its ",{"q":39},"."],["It can be grown in many locations and does not require good ",{"q":40},"."]]}
          ]
        }
      ]
    }
  ],
  "answer_key":{"1":["10","ten"],"2":["weather"],"3":["safety"],"4":["discount"],"5":["dictionary"],"6":["certificate"],"7":["towel"],"8":["café","cafe"],"9":["videos"],"10":["lockers"],"11":["A"],"12":["B"],"13":["A"],"14":["A"],"15":["A"],"16":["C"],"17":["C"],"18":["A"],"19":["B"],"20":["C"],"21":["B","D"],"22":["B","D"],"23":["C","E"],"24":["C","E"],"25":["G"],"26":["B"],"27":["F"],"28":["H"],"29":["A"],"30":["E"],"31":["metal","metals"],"32":["slow"],"33":["demand"],"34":["equator"],"35":["recycle"],"36":["fungus"],"37":["weather"],"38":["strong"],"39":["roots"],"40":["soil"]},
  "pair_groups":{"21-22":{"questions":[21,22],"correct":["B","D"]},"23-24":{"questions":[23,24],"correct":["C","E"]}}
}
$json$::jsonb,
now(),now()
)
on conflict(day_number,module) do update set title=excluded.title,status='published',payload=excluded.payload,published_at=coalesce(public.ark60_content.published_at,now()),updated_at=now();
