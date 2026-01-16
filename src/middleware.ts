import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: any) {
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // Public routes - no authentication needed
    const publicRoutes = ['/login', '/auth/callback', '/auth/forgot-password', '/auth/reset-password'];

    if (publicRoutes.includes(path)) {
        // If user is authenticated and trying to access login, redirect to appropriate dashboard
        if (user) {
            const { data: authUser } = await supabase
                .from('authorized_users')
                .select('role')
                .eq('gmail', user.email)
                .single();

            if (authUser) {
                if (authUser.role === 'admin' || authUser.role === 'manager') {
                    return NextResponse.redirect(new URL('/admin', request.url));
                } else if (authUser.role === 'swamiji') {
                    return NextResponse.redirect(new URL('/swamiji', request.url));
                } else {
                    return NextResponse.redirect(new URL('/worker', request.url));
                }
            }
        }
        return response;
    }

    // Protected routes - require authentication
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get user's role from authorized_users
    const { data: authUser } = await supabase
        .from('authorized_users')
        .select('role, is_active')
        .eq('gmail', user.email)
        .single();

    // If not authorized or inactive, redirect to login
    if (!authUser || !authUser.is_active) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based access control
    if (path.startsWith('/admin')) {
        if (authUser.role !== 'admin' && authUser.role !== 'manager') {
            // Redirect to appropriate dashboard based on role
            if (authUser.role === 'swamiji') {
                return NextResponse.redirect(new URL('/swamiji', request.url));
            } else {
                return NextResponse.redirect(new URL('/worker', request.url));
            }
        }
    } else if (path.startsWith('/swamiji')) {
        if (authUser.role !== 'swamiji') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    } else if (path.startsWith('/worker')) {
        if (authUser.role !== 'worker') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
