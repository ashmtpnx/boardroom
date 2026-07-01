// BOARDROOM is desktop/laptop only. We combine three signals so a phone or
// tablet is reliably caught, while desktops (even small windows) pass.
export function isDesktopDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;

  const ua = navigator.userAgent || '';
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk/i.test(ua);

  // iPadOS 13+ reports as desktop Safari but is touch-only with no fine pointer.
  const coarseOnly =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(pointer: fine)').matches;

  const tooNarrow = window.innerWidth < 768;

  if (mobileUA) return false;
  if (tooNarrow) return false;
  if (coarseOnly) return false;
  return true;
}
