'use client';

import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export default function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Log to error tracking service in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Production unhandled promise rejection:', {
          reason: event.reason?.toString(),
          stack: event.reason?.stack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      }

      // Show user-friendly error message
      if (event.reason?.message) {
        // Don't show auth-related errors as toasts (they're handled elsewhere)
        if (!event.reason.message.includes('auth') && 
            !event.reason.message.includes('unauthorized') &&
            !event.reason.message.includes('forbidden')) {
          toast.error('Something went wrong. Please refresh the page and try again.');
        }
      }

      // Prevent default browser behavior
      event.preventDefault();
    };

    // Handle global JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error('Global JavaScript error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });

      // Log to error tracking service in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Production JavaScript error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      }

      // Show user-friendly error message for critical errors
      if (event.message && 
          !event.message.includes('ResizeObserver') && // Ignore common harmless errors
          !event.message.includes('Non-Error promise rejection')) {
        toast.error('An unexpected error occurred. Please refresh the page.');
      }

      return true; // Prevent default browser error handling
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return <>{children}</>;
} 