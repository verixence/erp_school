import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need authentication
  const publicRoutes = ['/login', '/not-authorized'];
  
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  try {
    // Create Supabase client with cookie-based auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: {
            getItem: (key: string) => {
              return request.cookies.get(key)?.value || null;
            },
            setItem: () => {
              // Not needed for middleware
            },
            removeItem: () => {
              // Not needed for middleware
            },
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get user role from our database for protected routes
    if (pathname.startsWith('/super-admin') || pathname.startsWith('/school-admin') || 
        pathname.startsWith('/teacher') || pathname.startsWith('/parent')) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (pathname.startsWith('/super-admin') && userData?.role !== 'super_admin') {
        return NextResponse.redirect(new URL('/not-authorized', request.url));
      }

      if (pathname.startsWith('/school-admin') && userData?.role !== 'school_admin') {
        return NextResponse.redirect(new URL('/not-authorized', request.url));
      }

      if (pathname.startsWith('/teacher') && userData?.role !== 'teacher') {
        return NextResponse.redirect(new URL('/not-authorized', request.url));
      }

      if (pathname.startsWith('/parent') && userData?.role !== 'parent') {
        return NextResponse.redirect(new URL('/not-authorized', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};