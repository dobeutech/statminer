import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import PWAProvider from '@/components/PWAProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StatMiner - Multi-Model Data Aggregator',
  description: 'Comprehensive web-based data aggregator chatbot with multi-LLM support',
  keywords: 'AI, LLM, data aggregation, statistics, OpenAI, Anthropic, Claude',
  authors: [{ name: 'StatMiner Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#06b6d4',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StatMiner',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StatMiner" />
        <meta name="msapplication-TileImage" content="/icon-144.png" />
        <meta name="msapplication-TileColor" content="#06b6d4" />
      </head>
      <body className={inter.className}>
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}