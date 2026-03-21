'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { ArticleCard } from '@/components/ArticleCard';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          setArticles(data.filter((a: any) => a.status === 'published'));
        }
      } catch (error) {
        console.error('Fetch articles error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        <Sidebar />
        
        <main className="flex-1 p-6 md:p-10">
          {/* Hero Section */}
          <section className="mb-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse"></div>
              <span>Originium Kernel is Online</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-8xl font-display font-black tracking-tighter text-zinc-900 mb-8 leading-[0.95]"
            >
              Write. Sync. <br />
              <span className="text-zinc-300">Deploy.</span>
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col md:flex-row gap-4 items-center max-w-2xl"
            >
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search in kernel..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="lobe-input pl-12 h-16 text-lg w-full border-2 border-zinc-100 rounded-2xl focus:border-zinc-900 focus:outline-none transition-all placeholder:text-zinc-300 font-medium"
                />
              </div>
              <button className="lobe-button bg-zinc-50 text-zinc-900 border border-zinc-100 flex items-center gap-2 hover:bg-zinc-100 h-16 px-8 rounded-2xl transition-all font-bold">
                <Filter size={20} />
                <span>Sort</span>
              </button>
            </motion.div>
          </section>

          {/* Article Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="lobe-card p-8 h-80 animate-pulse bg-zinc-50 rounded-3xl border border-zinc-100" />
              ))
            ) : filteredArticles.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </AnimatePresence>
            ) : (
              <div className="col-span-full py-32 text-center bg-zinc-50/50 rounded-[3rem] border-2 border-dashed border-zinc-100">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-200 shadow-sm">
                  <Sparkles size={40} />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 mb-2">The kernel is empty</h3>
                <p className="text-zinc-400 font-medium">Be the first to push content to this node.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
