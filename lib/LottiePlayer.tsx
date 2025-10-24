import React, { useEffect, useRef } from "react";

interface LottiePlayerProps {
  src: string;
  width?: number;
  height?: number;
  loop?: boolean;
}

export default function LottiePlayer({ src, width = 24, height = 24, loop = true }: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lottie: any;
    (async () => {
      lottie = await import('lottie-web');
      if (containerRef.current) {
        lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay: true,
          path: src,
        });
      }
    })();
    return () => {
      if (lottie && containerRef.current) {
        lottie.destroy();
      }
    };
  }, [src, loop]);

  return <div ref={containerRef} style={{ width, height }} />;
}
