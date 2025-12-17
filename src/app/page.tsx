'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with browser-only features
const MultiAgentChat = dynamic(
  () => import('@/components/MultiAgentChat'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading StatMiner...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900">
      <MultiAgentChat />
    </main>
  );
}
