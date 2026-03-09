import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Jobby',
  description: 'Application tracking and AI support for job seekers'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
