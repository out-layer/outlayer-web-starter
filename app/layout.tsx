import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'OutLayer Example App',
  description: 'Multi-wallet login + cross-chain DeFi powered by @outlayer/sdk',
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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
