import React, { useEffect, useRef } from 'react';

interface GoogleAdProps {
  adSlot: string;           // Your ad unit slot ID from AdSense
  adFormat?: string;        // e.g., "auto", "rectangle", "horizontal"
  style?: React.CSSProperties;
  className?: string;
}

const GoogleAd: React.FC<GoogleAdProps> = ({
  adSlot,
  adFormat = 'auto',
  style = { display: 'block' },
  className = '',
}) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      // Push the ad only if the ins element exists and adsbygoogle is loaded
      if (adRef.current && (window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
      }
    } catch (e) {
      console.error('AdSense push error:', e);
    }
  }, [adSlot]); // Re-run if slot changes (rare)

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client="ca-pub-2360241039001516"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
};

export default GoogleAd;