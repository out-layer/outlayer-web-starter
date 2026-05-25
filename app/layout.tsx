import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'OutLayer Web Starter',
  description: 'Add blockchain to a web app — multi-wallet sign-in + gasless cross-chain, powered by @outlayer/sdk',
};

// Apply the saved theme before first paint to avoid a flash of the wrong theme.
const noFlashTheme = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: tiny trusted no-flash theme script */}
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="min-h-screen">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
