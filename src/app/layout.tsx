import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import PWAProvider from '@/components/PWAProvider';
import CookieConsent from '@/components/CookieConsent';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StatMiner - Unbiased Data-Driven AI Solution',
  description: 'The truly unbiased data-driven AI solution for getting data to answer complex problems. Chat with multiple LLMs in parallel, aggregate public datasets, and visualize results.',
  keywords: 'AI, LLM, data aggregation, statistics, OpenAI, Anthropic, Claude, data analysis, multi-model chat',
  authors: [{ name: 'Dobeu Tech Solutions' }],
  creator: 'Dobeu Tech Solutions',
  publisher: 'Dobeu Tech Solutions',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:5000'),
  openGraph: {
    type: 'website',
    title: 'StatMiner - Unbiased Data-Driven AI Solution',
    description: 'Chat with multiple LLMs in parallel, aggregate public datasets, and visualize results.',
    siteName: 'StatMiner',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'StatMiner' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StatMiner - Unbiased Data-Driven AI Solution',
    description: 'Chat with multiple LLMs in parallel, aggregate public datasets, and visualize results.',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StatMiner',
  },
};

export const viewport: Viewport = {
  themeColor: '#06b6d4',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Dobeu Tech Solutions',
      url: 'https://statminer.app',
      logo: 'https://statminer.app/icon-512.png',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'StatMiner',
      applicationCategory: 'DataAnalysis',
      operatingSystem: 'Web',
      description: 'The truly unbiased data-driven AI solution for getting data to answer complex problems.',
      author: { '@type': 'Organization', name: 'Dobeu Tech Solutions' },
      license: 'https://opensource.org/licenses/MIT',
    },
  ],
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
        <link rel="canonical" href={process.env.NEXTAUTH_URL || 'http://localhost:5000'} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StatMiner" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <PWAProvider>
          {children}
          <CookieConsent />
        </PWAProvider>
      </body>
    </html>
  );
}
