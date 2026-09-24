import { timingSafeEqual } from 'node:crypto';

export function getSessionSecret() {
  const value = process.env.AUTH_SESSION_SECRET?.trim();

  if (!value || value.length < 32) throw new Error('AUTH_SESSION_SECRET kamida 32 belgidan iborat bo‘lishi kerak');
  return value;
}

export function constantTimeEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}
