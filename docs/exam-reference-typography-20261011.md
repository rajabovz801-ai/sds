# Reading and Listening reference typography

Rustam selected Cambridge20 TEST3/4 and ListeningTestFull18/19/20 HTML as the visual reference on October 11, 2026.

The shared exam stylesheet now uses the reference sans-serif stacks (Reading: Lato, Inter, Segoe UI, Arial; Listening: Inter, Lato, Segoe UI, Arial). As in the supplied files, no font download is required: system fallbacks apply when those font faces are absent. Reading body and questions are 16px; passage line height is 1.58, questions/options 1.45–1.5. Listening body is 16px; answer fields are 15.5px, Reading fields 14px. Titles and numbers retain a stronger weight.

Part navigation is centred on desktop, with only the selected part's question numbers visible. Compact 28×30px number controls show answered progress above them and a blue outline for the current question. On small screens the strip scrolls horizontally and Submit occupies its own row. Daily Reading, daily Listening and both Full Mock sections already share this component and stylesheet.

Only shared CSS and generated night colors changed. Student answers, grading keys, attempts, audio, fullscreen, timers, consent and submit handlers were not modified. Validation: all 206 automated tests and production build passed. Authenticated visual browser QA remains unverified because the previous browser session was blocked by credential protection.
