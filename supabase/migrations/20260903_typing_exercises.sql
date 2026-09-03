create table if not exists public.typing_exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  prompt_title text not null default 'Writing Task 2',
  prompt text not null,
  content text not null,
  status text not null default 'published' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists typing_exercises_status_created_idx
  on public.typing_exercises (status, created_at desc);

alter table public.typing_exercises enable row level security;
revoke all on table public.typing_exercises from anon, authenticated;
grant select, insert, update, delete on table public.typing_exercises to service_role;

insert into public.typing_exercises (slug, title, prompt_title, prompt, content, status)
values (
  'typing-exercise-1',
  'Typing Exercise 1',
  'Writing Task 2',
  $$Some people believe that students learn more effectively when they study alone, while others argue that group study is better. To what extent do you agree or disagree?$$,
  $$Some people believe that students learn more effectively when they study alone, while others argue that group study is better. I believe that both methods are useful, but studying with others is generally more effective because it encourages discussion and keeps learners motivated.

The main advantage of group study is that students can explain difficult ideas to one another. A learner may understand a grammar rule, mathematical formula, or historical event differently from a classmate, so discussing the same topic from several perspectives can make it clearer. In addition, teaching a concept to another person often strengthens the speaker’s own understanding. For example, when students prepare for an examination together, they can compare answers, identify mistakes, and share useful strategies that one person might not discover alone.

Another reason I prefer group study is that it can improve motivation and discipline. Students who study alone sometimes become distracted by social media, games, or other activities, especially when there is no fixed schedule. In a group, however, members can set goals, divide tasks, and encourage each other to continue. This sense of responsibility can make study sessions more productive and enjoyable. Moreover, regular discussion helps learners develop communication skills, which are valuable both academically and professionally. It also prepares them for collaborative tasks in workplaces.

Admittedly, individual study is important when a student needs complete silence or wants to focus on a personal weakness. It also allows learners to work at their own pace without waiting for others. Nevertheless, these benefits do not outweigh the opportunities for interaction, feedback, and motivation that group study provides.

In conclusion, although studying alone offers flexibility and concentration, I believe group study is usually more effective. By sharing knowledge, correcting mistakes, and supporting one another, students can learn more deeply and maintain stronger motivation over time.$$,
  'published'
)
on conflict (slug) do nothing;
