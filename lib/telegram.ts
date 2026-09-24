export type Track = 'ielts' | 'cefr';

const DEFAULT_BOT_USERNAME = 'arkedu_bot';

export function getTelegramRegistrationUrl(track: Track) {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || DEFAULT_BOT_USERNAME;
  return `https://t.me/${username}?start=${track}`;
}
