'use client';

import React from 'react';
import { Spin } from 'antd';

interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
}

export function LoadingSpinner({ size = 'large', tip }: LoadingProps) {
  return <Spin size={size} tip={tip} />;
}

export function LoadingText({ tip = 'Loading...' }: { tip?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500">{tip}</span>
      <span className="loading-dots">
        <span />
        <span />
        <span />
      </span>
      <style jsx>{`
        .loading-dots span {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #71717a;
          margin: 0 2px;
          animation: dot-bounce 1.4s ease-in-out infinite;
        }
        .loading-dots span:nth-child(1) { animation-delay: 0s; }
        .loading-dots span:nth-child(2) { animation-delay: 0.16s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.32s; }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function LoadingDots({ tip = 'Loading' }: { tip?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="loading-dots-animated">
        <span />
        <span />
        <span />
      </div>
      {tip && <span className="text-sm text-zinc-400">{tip}</span>}
      <style jsx>{`
        .loading-dots-animated {
          display: flex;
          gap: 6px;
        }
        .loading-dots-animated span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #18181b;
          animation: bounce 1.4s ease-in-out infinite both;
        }
        .loading-dots-animated span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots-animated span:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots-animated span:nth-child(3) { animation-delay: 0s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export function LoadingGlow({ tip = 'Loading...' }: { tip?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="loading-glow-container">
        <div className="loading-glow-circle" />
        <div className="loading-glow-inner" />
      </div>
      {tip && <span className="text-sm text-zinc-500 animate-pulse">{tip}</span>}
      <style jsx>{`
        .loading-glow-container {
          position: relative;
          width: 48px;
          height: 48px;
        }
        .loading-glow-circle {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(from 0deg, transparent 0%, #18181b 25%, transparent 50%);
          animation: glow-spin 1.5s linear infinite;
        }
        .loading-glow-inner {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          background: white;
        }
        @keyframes glow-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function LoadingWaves({ tip = 'Loading...' }: { tip?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-1.5 h-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 bg-zinc-900 rounded-full animate-wave"
            style={{
              height: '40%',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      {tip && <span className="text-sm text-zinc-400">{tip}</span>}
      <style jsx>{`
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
        @keyframes wave {
          0%, 100% { height: 40%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
}

type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves';

interface GlobalLoadingProps extends LoadingProps {
  type?: LoadingType;
}

export function GlobalLoading({ type = 'spinner', size, tip }: GlobalLoadingProps) {
  switch (type) {
    case 'spinner':
      return <LoadingSpinner size={size} tip={tip} />;
    case 'text':
      return <LoadingText tip={tip} />;
    case 'dots':
      return <LoadingDots tip={tip} />;
    case 'glow':
      return <LoadingGlow tip={tip} />;
    case 'waves':
      return <LoadingWaves tip={tip} />;
    default:
      return <LoadingSpinner size={size} tip={tip} />;
  }
}

export default GlobalLoading;