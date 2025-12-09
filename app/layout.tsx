import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'LLM Log',
  description: 'Personal LLM Conversation Logger',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div id="app">
            <Suspense fallback={<div className="w-[300px] border-r border-[#edd]"></div>}>
              <Sidebar />
            </Suspense>
            <main id="main-content">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
