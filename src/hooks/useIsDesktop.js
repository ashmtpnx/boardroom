import { useState, useEffect } from 'react';
import { isDesktopDevice } from '../utils/deviceDetect';

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(isDesktopDevice());

  useEffect(() => {
    const onResize = () => setDesktop(isDesktopDevice());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return desktop;
}
