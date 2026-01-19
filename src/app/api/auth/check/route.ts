import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (admin privileges)
// This bypasses RLS, ensuring we can accurately check if a user is authorized
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        console.log(`[Auth Check] Checking authorization for: ${email}`);

        // Check authorized_users table
        const { data, error } = await supabaseAdmin
            .from('authorized_users')
            .select('*')
            .eq('gmail', email.toLowerCase())
            .single();

        if (error) {
            console.error('[Auth Check] Database error or user not found:', error);
            return NextResponse.json({ authorized: false, error: 'User not listed in authorized_users' }, { status: 404 });
        }

        if (!data.is_active) {
            return NextResponse.json({ authorized: false, error: 'Account is deactivated' }, { status: 403 });
        }

        console.log(`[Auth Check] User authorized: ${data.full_name} (${data.role})`);

        return NextResponse.json({
            authorized: true,
            user: {
                id: data.id, // This is the ID in authorized_users table (uuid pk)
                user_id: data.user_id, // This is the linked Auth User ID
                email: data.gmail,
                role: data.role,
                full_name: data.full_name,
                is_active: data.is_active,
            }
        });

    } catch (error: any) {
        console.error('[Auth Check] Server error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
