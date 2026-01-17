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
        const { email, full_name, role, password, phone } = await request.json();

        // Validate input
        if (!email || !full_name || !role || !password || !phone) {
            return NextResponse.json(
                { error: 'Email, full name, role, password, and phone are required' },
                { status: 400 }
            );
        }

        // Validate password length
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Validate email domain
        const isGmail = email.endsWith('@gmail.com');
        const isOrgEmail = email.endsWith('@aakb.org.in');

        if (!isGmail && !isOrgEmail) {
            return NextResponse.json(
                { error: 'Only Gmail or @aakb.org.in addresses are allowed' },
                { status: 400 }
            );
        }


        // Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: full_name,
                role: role,
                phone: phone,
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

        // Create profile with all required fields
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                gmail: email.toLowerCase(),
                name: full_name,
                role: role,
                phone: phone,
                is_active: true,
            }, {
                onConflict: 'id'
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't fail if profile creation fails due to trigger
            // Just log it
        }

        // No need to send password reset email since we set the password directly

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
