import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'AI Jobber',
  description: 'AI job hunt copilot'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
