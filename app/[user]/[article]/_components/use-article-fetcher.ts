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
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/u/${username}/${article}`);
        if (res.ok) {
          const data = await res.json();
          const { user, rawContent: raw, ...articleFields } = data;
          setArticleData(articleFields as ArticleData);
          setUserData(user);
          if (raw) {
            setRawContent(raw);
          }
        } else {
          showError('文章加载失败');
        }
      } catch (error) {
        console.error('Fetch article error:', error);
        showError('文章加载失败');
      } finally {
        setLoading(false);
      }
    };

    if (username && article) void fetchArticle();
  }, [username, article]);

  return { articleData, userData, loading, rawContent };
}
