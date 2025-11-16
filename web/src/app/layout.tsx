import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/error-boundary';
import GlobalErrorHandler from '@/components/global-error-handler';
import ClientScriptLoader from '@/components/client-script-loader';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});

export const metadata: Metadata = {
  title: 'Campus Hoster - School Management System',
  description: 'Comprehensive school management platform for modern educational institutions',
};

// External scripts loader component
function ExternalScripts() {
  return (
    <>
      <script 
        src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
        async
      />
      <script 
        src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
        async
      />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ExternalScripts />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>
        <GlobalErrorHandler>
          <ErrorBoundary>
            <QueryProvider>
              <ThemeProvider>
                <ClientScriptLoader />
                {children}
                <Toaster position="top-right" richColors />
              </ThemeProvider>
            </QueryProvider>
          </ErrorBoundary>
        </GlobalErrorHandler>
      </body>
    </html>
  );
}
