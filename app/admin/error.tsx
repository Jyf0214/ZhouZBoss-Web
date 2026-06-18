'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <h2 className="text-xl font-semibold text-zinc-900 mb-2">页面出现错误</h2>
      <p className="text-zinc-600 mb-4">{error.message || '管理后台发生了未知错误'}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
      >
        重试
      </button>
    </div>
  );
}
