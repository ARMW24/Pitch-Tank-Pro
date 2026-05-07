import { useState, useEffect, useRef, RefObject } from 'react';

export function useImageMetrics(): [RefObject<HTMLImageElement>, { width: number; height: number }] {
  const [metrics, setMetrics] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const calculateMetrics = () => {
      const img = imgRef.current;
      if (!img) return;
      if (!img.naturalWidth || !img.naturalHeight) return;

      const imgRatio = img.naturalWidth / img.naturalHeight;
      const containerRatio = img.clientWidth / img.clientHeight;

      let renderWidth = 0;
      let renderHeight = 0;

      if (imgRatio > containerRatio) {
        // Limited by container width
        renderWidth = img.clientWidth;
        renderHeight = renderWidth / imgRatio;
      } else {
        // Limited by container height
        renderHeight = img.clientHeight;
        renderWidth = renderHeight * imgRatio;
      }

      setMetrics({ width: renderWidth, height: renderHeight });
    };

    calculateMetrics();

    const resizeObserver = new ResizeObserver(() => {
      calculateMetrics();
    });

    if (imgRef.current) {
      resizeObserver.observe(imgRef.current);
    }

    window.addEventListener('resize', calculateMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateMetrics);
    };
  }, []);

  return [imgRef, metrics];
}
