'use client';

import React, { useEffect, useRef } from 'react';

interface ShareData {
  sharejs?: { enable: boolean; sites: string };
  addtoany?: { enable: boolean; item: string };
}

interface ShareButtonsProps {
  config?: ShareData | null;
  title?: string;
  url?: string;
}

export default function ShareButtons({ config, title, url }: ShareButtonsProps) {
  const sharejsRef = useRef<HTMLDivElement>(null);
  const addtoanyRef = useRef<HTMLDivElement>(null);
  const shareEnabled = config?.sharejs?.enable;
  const addtoanyEnabled = config?.addtoany?.enable;

  useEffect(() => {
    if (shareEnabled) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/social-share.js@1.0.16/dist/css/share.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/social-share.js@1.0.16/dist/js/social-share.min.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.head.removeChild(link);
        document.body.removeChild(script);
      };
    }
  }, [shareEnabled]);

  useEffect(() => {
    if (addtoanyEnabled) {
      const script = document.createElement('script');
      script.src = 'https://static.addtoany.com/menu/page.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [addtoanyEnabled]);

  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title ?? (typeof document !== 'undefined' ? document.title : '');

  return (
    <div className="share-buttons flex flex-wrap items-center gap-3">
      {config?.sharejs?.enable && (
        <div
          ref={sharejsRef}
          className="social-share"
          data-sites={config.sharejs.sites}
          data-title={shareTitle}
          data-url={shareUrl}
        />
      )}

      {config?.addtoany?.enable && (
        <div
          ref={addtoanyRef}
          className="a2a_kit a2a_default_style"
          data-a2a-title={shareTitle}
          data-a2a-url={shareUrl}
        >
          {config.addtoany.item.split(',').map(site => {
            const s = site.trim();
            if (!s) return null;
            return <a key={s} className={`a2a_button_${s}`} />;
          })}
          <a className="a2a_dd" href="https://www.addtoany.com/share" />
        </div>
      )}
    </div>
  );
}
