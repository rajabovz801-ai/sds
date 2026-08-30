# ARK Writing Bot

Telegram webhook bot prepared for Vercel.

## Features

- Ordinary Telegram messages -> concise teaching-assistant reply.
- Essay text -> immediately replies `Hozir tekshirib beraman ✅`, assesses IELTS Writing and sends summary + PDF.
- Word `.docx` -> extracts text and checks it.
- PDF -> sends the file to OpenAI for assessment.
- Photo/image -> reads the writing with vision and checks it.
- Telegram Business `business_message` updates are supported.

## Required Vercel Environment Variables

- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.6-luna`
- `TELEGRAM_WEBHOOK_SECRET`

## Vercel Root Directory

When this folder is deployed as a separate Vercel project, set Root Directory to:

`ark-writing-bot`

The Telegram webhook endpoint will be:

`https://YOUR-BOT-PROJECT.vercel.app/api/telegram`

Do not commit any real token or API key to GitHub.
