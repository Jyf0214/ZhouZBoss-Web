'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { ArticleCard } from '@/components/ArticleCard';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'articles'),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    });

    return () => unsub();
  }, []);

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        <Sidebar />
        
        <main className="flex-1 p-6 md:p-10">
          {/* Hero Section */}
          <section className="mb-12">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest mb-4"
            >
              <Sparkles size={16} />
              <span>Welcome to Hexo PRO</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-display font-black tracking-tight text-zinc-900 mb-6 leading-[1.1]"
            >
              Modern Blog Framework <br />
              <span className="text-zinc-400">Powered by Node Functions.</span>
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col md:flex-row gap-4 items-center"
            >
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search articles..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="lobe-input pl-12 h-14 text-lg"
                />
              </div>
              <button className="lobe-button bg-zinc-100 text-zinc-900 border border-zinc-200 flex items-center gap-2 hover:bg-zinc-200 h-14 px-8">
                <Filter size={20} />
                <span>Filters</span>
              </button>
            </motion.div>
          </section>

          {/* Article Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="lobe-card p-6 h-64 animate-pulse bg-zinc-100" />
              ))
            ) : filteredArticles.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </AnimatePresence>
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">No articles found</h3>
                <p className="text-zinc-500">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
