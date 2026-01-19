'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkAuthorization, updateLastLogin } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
// Version: Fix for Vercel deployment - Suspense boundary added


function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');

    useEffect(() => {
        handleCallback();
    }, []);

    async function handleCallback() {
        try {
            const supabase = createClient();

            // Get the session from the URL
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (!session?.user?.email) {
                throw new Error('No user email found');
            }

            const email = session.user.email;

            // Check if email is from allowed domains
            const isGmail = email.endsWith('@gmail.com');
            const isOrgEmail = email.endsWith('@aakb.org.in');

            if (!isGmail && !isOrgEmail) {
                await supabase.auth.signOut();
                setError('Only Gmail or @aakb.org.in accounts are allowed.');
                setTimeout(() => router.push('/login'), 3000);
                return;
            }


            // Check if user is authorized via Server API (Bypasses RLS issues)
            const authResponse = await fetch('/api/auth/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const authResult = await authResponse.json();

            if (!authResponse.ok || !authResult.authorized) {
                console.error('Authorization failed:', authResult.error);
                await supabase.auth.signOut();
                setError(authResult.error || 'This account is not authorized. Contact administrator.');
                setTimeout(() => router.push('/login'), 4000);
                return;
            }

            const authUser = authResult.user;

            // Update last login AND link user_id if missing
            await supabase
                .from('authorized_users')
                .update({
                    last_login: new Date().toISOString(),
                    user_id: session.user.id
                })
                .eq('gmail', email);

            // Sync with profiles table - get or create profile
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (!existingProfile) {
                // Create profile if doesn't exist
                await supabase.from('profiles').insert({
                    id: session.user.id,
                    gmail: authUser.email,
                    name: authUser.full_name,
                    role: authUser.role,
                    phone: authUser.email,
                    is_active: authUser.is_active,
                });
            } else {
                // Update profile to match authorized_users
                await supabase.from('profiles')
                    .update({
                        gmail: authUser.email,
                        name: authUser.full_name,
                        role: authUser.role,
                        is_active: authUser.is_active,
                    })
                    .eq('id', session.user.id);
            }

            // Store user info in localStorage
            localStorage.setItem('aakb_user_role', authUser.role);
            localStorage.setItem('aakb_user_name', authUser.full_name);
            localStorage.setItem('aakb_user_email', authUser.email);
            localStorage.setItem('aakb_user_id', session.user.id);

            // Log activity
            await supabase.from('activity_log').insert({
                worker_id: session.user.id,
                action: 'login',
                description: `${authUser.full_name} (${authUser.role}) logged in via Gmail`,
            });

            // Redirect based on role
            if (authUser.role === 'admin') {
                router.push('/admin');
            } else if (authUser.role === 'swamiji') {
                router.push('/swamiji');
            } else if (authUser.role === 'manager') {
                router.push('/admin'); // Managers use admin interface
            } else {
                router.push('/worker');
            }

        } catch (err: any) {
            console.error('Auth callback error:', err);
            setError(err.message || 'Authentication failed. Please try again.');
            setTimeout(() => router.push('/login'), 3000);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                {error ? (
                    <>
                        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">❌</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Authentication Failed</h2>
                        <p className="text-red-600 mb-4">{error}</p>
                        <p className="text-sm text-gray-500">Redirecting to login...</p>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Authenticating...</h2>
                        <p className="text-gray-600">Please wait while we verify your account</p>
                        <div className="mt-6 flex justify-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <span className="text-3xl">🔐</span>
                    </div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}

