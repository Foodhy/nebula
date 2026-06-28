import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Vega · Nébula Drive',
  description: 'Files for your organization',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
