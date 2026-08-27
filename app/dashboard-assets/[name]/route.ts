import { NextResponse } from 'next/server';
import { achievementAssets, type AchievementAssetKey } from '@/components/achievementAssets';

export const dynamic = 'force-static';

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const key = name.replace(/\.png$/i, '') as AchievementAssetKey;
  const source = achievementAssets[key];
  if (!source) return new NextResponse('Not found', { status: 404 });

  const marker = 'base64,';
  const index = source.indexOf(marker);
  if (index < 0) return new NextResponse('Invalid asset', { status: 500 });

  const bytes = Buffer.from(source.slice(index + marker.length), 'base64');
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(bytes.byteLength),
    },
  });
}
