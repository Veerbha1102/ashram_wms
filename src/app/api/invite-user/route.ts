import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (admin privileges)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // You need to add this to .env.local
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(request: NextRequest) {
    try {
        const { email, full_name, role, password } = await request.json();

        // Validate input
        if (!email || !full_name || !role) {
            return NextResponse.json(
                { error: 'Email, full name, and role are required' },
                { status: 400 }
            );
        }

        if (!email.endsWith('@gmail.com')) {
            return NextResponse.json(
                { error: 'Only Gmail addresses are allowed' },
                { status: 400 }
            );
        }

        // Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: password || Math.random().toString(36).slice(-12), // Generate random password if not provided
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: full_name,
                role: role,
            }
        });

        if (authError) {
            console.error('Auth error:', authError);
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        // Add to authorized_users table with user_id
        const { error: dbError } = await supabaseAdmin
            .from('authorized_users')
            .insert({
                user_id: authData.user.id,
                gmail: email.toLowerCase(),
                full_name,
                role,
                is_active: true,
            });

        if (dbError) {
            console.error('Database error:', dbError);
            // Rollback: delete the auth user if database insert fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json(
                { error: 'Failed to add user to database' },
                { status: 500 }
            );
        }

        // Create profile (will be auto-created by trigger, but we do it explicitly for safety)
        // Use upsert to avoid conflicts
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                gmail: email.toLowerCase(),
                name: full_name,
                role: role,
                phone: email,
                is_active: true,
            }, {
                onConflict: 'id'
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't fail if profile creation fails due to trigger
            // Just log it
        }

        // Send password reset email so user can set their own password
        if (!password) {
            await supabaseAdmin.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'User invited successfully',
            user: {
                email,
                full_name,
                role,
            }
        });

    } catch (error: any) {
        console.error('Server error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
