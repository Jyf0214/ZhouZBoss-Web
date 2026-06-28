import { useEffect, useState } from 'react';
import { showError } from '@/lib/error';
import type { ArticleData, UserInfo } from './types';

export interface ArticleFetcherResult {
  articleData: ArticleData | null;
  userData: UserInfo | null;
  loading: boolean;
  rawContent: string;
}

export function useArticleFetcher(username: string, article: string): ArticleFetcherResult {
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawContent, setRawContent] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/u/${username}/${article}`);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          const { user, rawContent: raw, ...articleFields } = data;
          setArticleData(articleFields as ArticleData);
          setUserData(user);
          if (raw) {
            setRawContent(raw);
          }
        } else if (!cancelled) {
          showError('文章加载失败');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Fetch article error:', error);
          showError('文章加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (username && article) void fetchArticle();
    return () => { cancelled = true; };
  }, [username, article]);

  return { articleData, userData, loading, rawContent };
}
