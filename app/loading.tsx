import { ArkLogoIcon } from '@/components/ArkLogoIcon';

export default function Loading() {
  return (
    <div className="routeLoading" role="status" aria-live="polite">
      <div className="routeLoadingCard">
        <span className="routeLoadingLogo"><ArkLogoIcon /></span>
        <div><strong>ARK Education</strong><small>Ish maydoni tayyorlanmoqda</small></div>
        <i />
      </div>
    </div>
  );
}
