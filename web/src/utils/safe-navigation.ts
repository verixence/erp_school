/**
 * Safe navigation utilities to prevent SSR/hydration issues
 */

export function safeNavigate(url: string) {
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}

export function safeReload() {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function safeBack() {
  if (typeof window !== 'undefined') {
    window.history.back();
  }
}

export function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function getWindowLocation(): Location | null {
  return isClient() ? window.location : null;
}

export function getUserAgent(): string {
  return isClient() ? window.navigator.userAgent : 'unknown';
} 