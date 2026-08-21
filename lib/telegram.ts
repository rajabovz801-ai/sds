export type Track = 'ielts' | 'cefr';

export function getTelegramRegistrationUrl(track: Track) {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'ark_education_bot';
  return `https://t.me/${username}?start=${track}`;
}
