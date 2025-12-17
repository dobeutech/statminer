import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StatMiner - Multi-Model AI Data Aggregator',
  description: 'AI-powered data aggregation from government and academic sources with multi-LLM analysis',
  keywords: 'AI, LLM, data aggregation, statistics, OpenAI, Anthropic, Claude, Census, FRED, World Bank',
  authors: [{ name: 'StatMiner Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StatMiner',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06b6d4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StatMiner" />
      </head>
      <body className={`${inter.className} bg-gray-900 text-gray-100 antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
