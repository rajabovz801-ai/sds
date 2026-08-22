import { timingSafeEqual } from 'node:crypto';

export function getSessionSecret() {
  const value =
    process.env.AUTH_SESSION_SECRET?.trim() ||
    process.env.ADMIN_ACCESS_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!value) throw new Error('Server session secret is not configured');
  return value;
}

export function constantTimeEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}
