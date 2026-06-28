import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Helios · Nébula',
  description: 'Your Nébula dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
