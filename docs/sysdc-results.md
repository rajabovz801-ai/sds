# SysDC result delivery

The Telegram bot token stays only on SysDC in `config.php`/`telegram.php`. The web app never calls the Telegram Bot API directly.

## Vercel variables

```env
BOT_RESULTS_ENDPOINT=https://6a0ecb6d32bdc.xvest2.ru/parentscontrol/reading.php
BOT_RESULTS_SUBMIT_KEY=the_same_submit_key_used_by_sysdc
```

`BOT_RESULTS_SUBMIT_KEY` is a private app-to-app key, not the Telegram bot token. Keep it server-only and do not prefix it with `NEXT_PUBLIC_`.

## Request flow

1. The test iframe sends the completed result to the ARK Next.js API.
2. The API validates and saves the result.
3. The API posts JSON to the configured SysDC `reading.php` endpoint.
4. SysDC verifies `submit_key` and uses its existing bot configuration to notify the admin.

Because step 3 is server-to-server, the PHP endpoint does not need browser CORS headers.

## Receiver contract

The request includes `event_type=result`, `submit_key`, student fields, test fields, score fields, `answers`, `answers_by_question`, and `answers_text`. A successful receiver must return HTTP 2xx **and explicit JSON confirmation**, for example `{ "success": true, "sent_count": 2 }`. Return success only after the Telegram API has accepted at least one admin message. For failures, return a non-2xx response and JSON such as `{ "success": false, "message": "..." }`.

The current SysDC receiver already uses `requirePostRequest()`, `getRequestData()`, and `verifySubmitKey()`, so no bot-token move is required. It only needs to accept the result fields above, send them through the existing `telegram.php` helper, inspect that helper's Telegram response, and then return the explicit delivery confirmation.
