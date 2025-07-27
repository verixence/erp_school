# Error Handling & Production Stability Guide

## The Problem: Random Client-Side Errors

Your application was experiencing random "client-side exception" errors in production due to several issues:

### Root Causes Identified:

1. **No Error Boundaries**: Unhandled React component errors crashed the entire application
2. **Complex Data Fetching**: Parallel queries with manual data merging caused race conditions 
3. **Authentication Race Conditions**: Session/user data fetching had timing issues
4. **External Script Failures**: CDN dependencies could fail to load
5. **Hydration Mismatches**: Server/client rendering differences
6. **Missing Global Error Handling**: JavaScript errors and promise rejections were unhandled
7. **Null Reference Errors**: Insufficient null/undefined checks in data processing

## Solutions Implemented

### 1. React Error Boundaries

**File**: `web/src/components/error-boundary.tsx`

- Catches JavaScript errors in React component tree
- Provides graceful fallback UI instead of white screen
- Logs detailed error information for debugging
- Offers user actions (retry, reload, go home)

```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 2. Enhanced Query Provider

**File**: `web/src/providers/query-provider.tsx`

- Added retry logic for failed queries
- Improved error handling for mutations
- Integrated with error boundaries
- Better timeout and reconnection handling

### 3. Improved Authentication Hook

**File**: `web/src/hooks/use-auth.ts`

- Added retry logic for failed auth requests
- Better null checking and error handling
- Prevents race conditions in user data fetching
- Graceful degradation when auth fails

### 4. Global Error Handler

**File**: `web/src/components/global-error-handler.tsx`

- Captures unhandled JavaScript errors
- Handles unhandled promise rejections
- Provides user-friendly error messages
- Logs errors for monitoring in production

### 5. Next.js Global Error Page

**File**: `web/src/app/global-error.tsx`

- Catches server-side and root-level errors
- Provides recovery options for users
- Maintains branding even during errors

### 6. Safe Navigation Utilities

**File**: `web/src/utils/safe-navigation.ts`

- Prevents SSR/hydration issues with window object
- Safe navigation methods that check for client-side execution

### 7. Enhanced Students Page

**File**: `web/src/app/(protected)/school-admin/students/page.tsx`

- Wrapped in error boundary
- Improved data fetching with timeout protection
- Better null checking and type safety
- Graceful error states and loading indicators

## Error Monitoring & Logging

All error handlers include production logging that captures:
- Error message and stack trace
- Component stack (for React errors)
- Timestamp and URL
- User agent information
- Request context

## Best Practices Moving Forward

### 1. Always Use Error Boundaries
```tsx
// Wrap complex components
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>
```

### 2. Handle Async Operations Safely
```tsx
const { data, error, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: async () => {
    // Add timeout protection
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 30000)
    );
    
    return Promise.race([fetchData(), timeout]);
  },
  retry: 2,
  retryDelay: 1000,
});

if (error) {
  return <ErrorState error={error} />;
}
```

### 3. Safe Data Processing
```tsx
// Always check for null/undefined
const safeData = data?.map((item: any) => {
  if (!item) return null;
  // Process item safely
  return processedItem;
}).filter(Boolean);
```

### 4. Use Safe Navigation
```tsx
import { safeNavigate } from '@/utils/safe-navigation';

// Instead of window.location.href = '/path'
safeNavigate('/path');
```

### 5. Implement Loading States
```tsx
if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorState error={error} retry={() => refetch()} />;
}
```

## Testing Error Scenarios

### 1. Network Failures
- Test with slow/failing network connections
- Simulate API timeouts
- Test offline scenarios

### 2. Data Corruption
- Test with malformed API responses
- Test with missing required fields
- Test with null/undefined data

### 3. Authentication Issues
- Test session expiration
- Test with invalid tokens
- Test permission changes

### 4. External Dependencies
- Test with blocked CDN resources
- Test with slow external scripts
- Test fallback scenarios

## Integration with Error Monitoring

Consider integrating with services like:
- **Sentry**: For comprehensive error tracking
- **LogRocket**: For session replay and debugging
- **DataDog**: For application monitoring
- **Rollbar**: For real-time error tracking

Example Sentry integration:
```tsx
import * as Sentry from '@sentry/react';

// In error boundary
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}
```

## Performance Considerations

The error handling improvements include:
- Minimal performance overhead
- Efficient retry strategies
- Proper cleanup of event listeners
- Optimized error boundary rendering

## Conclusion

These improvements will significantly reduce random client-side errors by:
1. Providing graceful error recovery
2. Implementing comprehensive error logging
3. Adding protective boundaries around critical code
4. Improving data fetching reliability
5. Enhancing user experience during errors

The application now has multiple layers of error protection, ensuring users have a stable experience even when unexpected errors occur. 