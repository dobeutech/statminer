import type { Metadata, Viewport } from 'next';
import { Nunito, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StatMiner — Multi-Model Data Aggregator',
  description:
    'A knowledgeable friend for statistical research. Query multiple LLMs side-by-side and mine structured datasets with Dobeu Tech Solutions.',
  keywords: [
    'statminer',
    'dobeu',
    'multi-model',
    'LLM',
    'data aggregation',
    'statistics',
    'Anthropic',
    'Claude',
    'OpenAI',
    'Neo4j',
    'MongoDB',
  ],
  authors: [{ name: 'Dobeu Tech Solutions', url: 'https://dobeu.tech' }],
  creator: 'Dobeu Tech Solutions',
  metadataBase: new URL('https://statminer.dobeu.tech'),
  openGraph: {
    title: 'StatMiner — Multi-Model Data Aggregator',
    description:
      'Mine statistical datasets and query multiple LLMs in parallel. Built by Dobeu Tech Solutions.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StatMiner',
    description:
      'Mine statistical datasets and query multiple LLMs in parallel.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#1A1A2E' },
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-mode="dark"
      className={`${nunito.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
