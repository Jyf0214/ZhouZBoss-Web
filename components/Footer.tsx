'use client';

import React, { useEffect, useState } from 'react';

interface FooterOwnerConfig {
  enable: boolean;
  since: number;
}

interface FooterRuntimeConfig {
  enable: boolean;
  launchTime: string;
}

interface FooterConfigData {
  owner: FooterOwnerConfig;
  customText: string;
  runtime: FooterRuntimeConfig;
}

const socialIcons: Record<string, string> = {
  Github: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
  Twitter: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z',
  Weibo: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-11.5c-.276 0-.5.224-.5.5v5c0 .276.224.5.5.5s.5-.224.5-.5V9c0-.276-.224-.5-.5-.5zm4 0c-.276 0-.5.224-.5.5v5c0 .276.224.5.5.5s.5-.224.5-.5V9c0-.276-.224-.5-.5-.5z',
  Email: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
};

export default function Footer() {
  const [config, setConfig] = useState<FooterConfigData | null>(null);
  const [socialData, setSocialData] = useState<Record<string, string> | null>(null);
  const [runtimeText, setRuntimeText] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.footer) setConfig(data.footer);
          if (data.social) setSocialData(data.social);
        }
      } catch {}
    };
    void fetchConfig();
  }, []);

  useEffect(() => {
    if (!config?.runtime?.enable || !config?.runtime?.launchTime) return;
    const launch = new Date(config.runtime.launchTime);
    const update = () => {
      const now = new Date();
      const diff = now.getTime() - launch.getTime();
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setRuntimeText(`已运行 ${days} 天 ${hours} 小时 ${minutes} 分钟`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [config?.runtime?.enable, config?.runtime?.launchTime]);

  const socialEntries = socialData ? Object.entries(socialData).filter(([, url]) => url) : [];

  return (
    <footer className="border-t border-zinc-100 py-12 bg-zinc-50/50">
      <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
        {socialEntries.length > 0 && (
          <div className="flex items-center justify-center gap-4">
            {socialEntries.map(([name, url]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-zinc-900 transition-colors"
                title={name}
              >
                {socialIcons[name] ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d={socialIcons[name]} />
                  </svg>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider">{name}</span>
                )}
              </a>
            ))}
          </div>
        )}

        {config?.owner?.enable && (
          <p className="text-zinc-400 text-sm font-medium">
            &copy; {config.owner.since}—{new Date().getFullYear()} Originium Kernel
          </p>
        )}

        {config?.customText && (
          <p className="text-zinc-400 text-sm">{config.customText}</p>
        )}

        {runtimeText && (
          <p className="text-zinc-400 text-xs">{runtimeText}</p>
        )}

        {!config && (
          <p className="text-zinc-400 text-sm font-medium">Powered by Originium Kernel</p>
        )}
      </div>
    </footer>
  );
}
