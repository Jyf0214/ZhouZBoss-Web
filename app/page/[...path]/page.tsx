import { redirect } from 'next/navigation';
import { buildPageRelativePath, resolvePageFilePath } from '@/lib/page-source/shared';

interface PageProps {
  params: Promise<{ path: string[] }>;
}

export const dynamic = 'force-dynamic';

export default async function CustomPage({ params }: PageProps) {
  const { path: pathSegments } = await params;
  const relativePath = buildPageRelativePath(pathSegments);
  
  if (!relativePath) {
    redirect('/page');
  }

  const filePath = resolvePageFilePath(relativePath);
  redirect('/' + filePath);
}
