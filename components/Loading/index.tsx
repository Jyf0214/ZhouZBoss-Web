'use client';

import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  color?: string;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const positionClasses: Record<string, string> = {
  center: 'items-center justify-center',
  'top-left': 'items-start justify-start pt-10 pl-10',
  'top-right': 'items-start justify-end pt-10 pr-10',
  'bottom-left': 'items-end justify-start pb-10 pl-10',
  'bottom-right': 'items-end justify-end pb-10 pr-10',
};

export function LoadingSpinner({ size = 'large', tip, position = 'center' }: LoadingProps) {
  const posClass = positionClasses[position] || positionClasses.center;
  return (
    <div className={`flex ${posClass}`}>
      <Spin size={size} tip={tip} />
    </div>
  );
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

export function LoadingDots({ tip = 'Loading', color = '#c084fc' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="loading-dots-animated">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              backgroundColor: i === 0 ? color : i === 1 ? `${color}cc` : `${color}88`,
            }}
          />
        ))}
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

export function LoadingWaves({ tip = 'Loading...', color = '#c084fc' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-1.5 h-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 rounded-full animate-wave"
            style={{
              height: '40%',
              backgroundColor: color,
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

export function LoadingAntIcon({ size = 'large', tip, color = '#c084fc', position = 'center' }: LoadingProps) {
  const fontSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;
  const antIcon = <LoadingOutlined style={{ fontSize, color }} spin />;
  const posClass = positionClasses[position] || positionClasses.center;
  return (
    <div className={`flex ${posClass}`}>
      <Spin indicator={antIcon} size={size} tip={tip} />
    </div>
  );
}

type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';

interface GlobalLoadingProps extends LoadingProps {
  type?: LoadingType;
}

export function GlobalLoading({ type = 'spinner', size, tip, color, position = 'center' }: GlobalLoadingProps) {
  switch (type) {
    case 'spinner':
      return <LoadingSpinner size={size} tip={tip} position={position} />;
    case 'text':
      return <LoadingText tip={tip} />;
    case 'dots':
      return <LoadingDots tip={tip} color={color} />;
    case 'glow':
      return <LoadingGlow tip={tip} />;
    case 'waves':
      return <LoadingWaves tip={tip} color={color} />;
    case 'antd':
      return <LoadingAntIcon size={size} tip={tip} color={color} position={position} />;
    default:
      return <LoadingSpinner size={size} tip={tip} position={position} />;
  }
}

export default GlobalLoading;