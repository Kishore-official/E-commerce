import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider, ToastProvider, SWRProvider } from '@ecommerce/ui-kit';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Meridian Vendor Portal',
  description: 'E-commerce platform vendor management portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={outfit.variable}
        style={{ fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}
      >
        <SWRProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
