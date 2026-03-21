'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ArticleCard } from '@/components/ArticleCard';
import { User, Calendar, Mail } from 'lucide-react';
import Link from 'next/link';

function UserProfileContent() {
  const params = useParams();
  const username = params?.user as string;

  const [user, setUser] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Find user by username
        const res = await fetch(`/api/users/${username}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          
          // Fetch user's articles
          const articlesRes = await fetch(`/api/articles?author=${data.uid}`);
          if (articlesRes.ok) {
            const articlesData = await articlesRes.json();
            setArticles(articlesData.filter((a: any) => a.status === 'published'));
          }
        }
      } catch (error) {
        console.error('Fetch user error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (username) fetchUser();
  }, [username]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-16 h-16 bg-zinc-100 rounded-full"></div>
        <div className="h-6 w-48 bg-zinc-100 rounded"></div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-display font-black text-zinc-900 mb-4">404</h1>
        <p className="text-zinc-500 mb-8">User not found in this kernel.</p>
        <Link href="/" className="lobe-button bg-zinc-900 text-white px-8 py-3 rounded-xl">
          Back Home
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* User Profile Header */}
        <div className="bg-zinc-50 border-b border-zinc-100">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-zinc-200">
                <User size={40} />
              </div>
              
              <h1 className="text-4xl font-display font-black text-zinc-900 mb-2">
                {user.name}
              </h1>
              
              <p className="text-zinc-400 font-medium mb-6">@{username}</p>
              
              <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                </div>
                {user.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span>{user.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-display font-bold text-zinc-900 mb-8">
            Articles ({articles.length})
          </h2>
          
          {articles.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="font-medium">No articles published yet</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-100 py-12 bg-zinc-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-zinc-400 text-sm font-medium">Powered by Originium Kernel</p>
        </div>
      </footer>
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <UserProfileContent />
    </Suspense>
  );
}
