import { Suspense } from 'react';
import { UserArticleContent } from './_components/UserArticleContent';

export default function UserArticlePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <UserArticleContent />
    </Suspense>
  );
}
