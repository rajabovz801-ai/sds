export type Track = 'ielts' | 'cefr';

export function getTelegramRegistrationUrl(track: Track) {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  if (!username) {
    return 'https://t.me/ark_educat1on';
  }

  return `https://t.me/${username}?start=${track}`;
}
