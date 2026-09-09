import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const positions = new Map<string, number>();
export function RouteScrollRestoration() {
  const { key } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, positions.get(key) ?? 0);
    const record = () => positions.set(key, window.scrollY);
    window.addEventListener('scroll', record, { passive: true });
    return () => { record(); window.removeEventListener('scroll', record); };
  }, [key]);
  return null;
}
