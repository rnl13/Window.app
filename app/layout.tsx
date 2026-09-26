import type { Metadata } from 'next';
import './globals.css';
import WindowAuth from '@/components/window-auth';

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Window', statusBarStyle: 'default' },
  title: 'Window · Find dit næste window',
  description: 'Find personlige windows til vandsport med spots, vind, bølger og dit eget udstyr.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body><WindowAuth>{children}</WindowAuth></body>
    </html>
  );
}
