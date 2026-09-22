import { Suspense } from 'react';
import { GoogleAuthCallbackClient } from '@/components/GoogleAuthCallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleAuthCallbackClient />
    </Suspense>
  );
}
