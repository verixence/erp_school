import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

export function createServerSupabaseClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieStore = request.cookies;
          return cookieStore.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value
          }));
        },
        setAll(cookiesToSet) {
          // In middleware, we can't set cookies
          // They will be set by the client-side
        },
      },
    }
  );
}