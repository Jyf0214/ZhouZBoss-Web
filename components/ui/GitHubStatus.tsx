import React from 'react';
import { Github, CheckCircle, XCircle } from 'lucide-react';
import ConfigSection from './ConfigSection';

interface GitHubStatusProps {
  configured: boolean;
  configuredText: string;
  notConfiguredText: string;
}

export default function GitHubStatus({
  configured,
  configuredText,
  notConfiguredText,
}: GitHubStatusProps) {
  return (
    <ConfigSection title="GitHub 同步状态" icon={Github} color="bg-zinc-500">
      <div
        className="p-4 rounded-xl flex items-center gap-3"
        style={{ background: configured ? '#f6ffed' : '#fff7e6' }}
      >
        {configured ? (
          <CheckCircle size={20} style={{ color: '#52c41a' }} />
        ) : (
          <XCircle size={20} style={{ color: '#faad14' }} />
        )}
        <span className="font-medium text-sm">
          {configured ? configuredText : notConfiguredText}
        </span>
      </div>
    </ConfigSection>
  );
}
