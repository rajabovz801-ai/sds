import { NextRequest, NextResponse } from 'next/server';
import { achievementAssets, type AchievementAssetKey } from '@/components/achievementAssets';

export const dynamic = 'force-static';

export function GET(_request: NextRequest, context: { params: Promise<{ name: string }> }) {
  return context.params.then(({ name }) => {
    const key = name.replace(/\.png$/i, '') as AchievementAssetKey;
    const dataUri = achievementAssets[key];
    if (!dataUri) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const base64 = dataUri.split(',')[1] || '';
    return new NextResponse(Buffer.from(base64, 'base64'), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  });
}
