'use client';

import { QueryClient, QueryClientProvider, QueryErrorResetBoundary } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import ErrorBoundary from '@/components/error-boundary';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Don't retry on auth errors or 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: false,
            onError: (error: any) => {
              console.error('Mutation error:', error);
              
              // Don't show toast for auth errors (they're handled elsewhere)
              if (error?.status !== 401 && error?.status !== 403) {
                toast.error(
                  error?.message || 'An unexpected error occurred. Please try again.'
                );
              }
            },
          },
        },
      })
  );

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary 
          fallback={({ error, resetError }) => (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="max-w-lg w-full text-center space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
                <p className="text-gray-600">
                  There was an error loading the application. Please try again.
                </p>
                <button
                  onClick={() => {
                    reset();
                    resetError();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        >
          <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </QueryClientProvider>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}