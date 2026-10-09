# Consistent controls and compact profile — 10 October 2026

Shared semantic color tokens drive lesson/workspace surfaces, headings, primary actions and neutral Back/Study controls. Back arrows use currentColor and no longer expand over their label. Hover/focus colors preserve contrast. Speaking removes duplicated stage badges and visible numbered question circles, keeping question counts and save/advance behavior. Reading entry gets a transparent book-reading wolf and compact cards; small-screen actions move below text. Vocabulary Study examples expand instead of being clipped.

Profile splits Details and Appearance without unmounting either panel, preserving unsaved form/style drafts. Desktop personal details/goals sit side by side; mobile stacks them. Cover is 125px, avatar 68px, appearance thumbnails are compact, and duplicate live preview is removed only in the profile's collection. Reward dialogs retain their preview.

Explicit site-polish.css dark tokens are excluded from automatic night color generation: transforming their already-defined dark variables produced light panels. Existing automatic night generation remains for other files.

Validation: production build and TypeScript passed; nine leaderboard/resume/retry checks passed. API-intercepted browser fixtures checked 66 lesson/stage layouts in light/dark at 1440/390/320px with zero horizontal overflow, broken images or browser errors. Final profile checks cover tab visibility, preserved drafts, 125px cover, dark panel RGB(21,33,49), and overflow at all three widths. Study checks cover hover contrast and expanding examples at all widths/themes. No real learner writes or authenticated production submissions were tested.

No API/database/migration, scoring, availability, timer or reward entitlement changes. Base commit 97fe2b2f34ca30fdb15f003b9a96742f990e0d5c. Roll back via revert of this UI commit, preserving subsequent work.

Asset public/images/workspace/wolf-reading.png: built-in image generation, true alpha preserved, downsampled to 360px. Prompt: grey wolf cub in navy hoodie seated reading cream book, premium soft 3D, full body, transparent backdrop, no text/logo/halo; intended display 100px.
