import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (admin privileges)
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

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        const userId = searchParams.get('userId');

        if (!email && !userId) {
            return NextResponse.json(
                { error: 'Email or userId is required' },
                { status: 400 }
            );
        }

        // Find the user in authorized_users
        let authUser = null;

        if (userId) {
            const { data } = await supabaseAdmin
                .from('authorized_users')
                .select('*')
                .eq('id', userId)
                .single();
            authUser = data;
        } else if (email) {
            const { data } = await supabaseAdmin
                .from('authorized_users')
                .select('*')
                .eq('gmail', email.toLowerCase())
                .single();
            authUser = data;
        }

        if (!authUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const authUserId = authUser.user_id;

        // Delete from authorized_users
        await supabaseAdmin
            .from('authorized_users')
            .delete()
            .eq('id', authUser.id);

        // Delete from profiles
        if (authUserId) {
            await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', authUserId);
        }

        // Delete related data
        if (authUserId) {
            // Delete tasks assigned to user
            await supabaseAdmin
                .from('tasks')
                .delete()
                .eq('assigned_to', authUserId);

            // Delete attendance records
            await supabaseAdmin
                .from('attendance')
                .delete()
                .eq('worker_id', authUserId);

            // Delete leave requests
            await supabaseAdmin
                .from('leaves')
                .delete()
                .eq('worker_id', authUserId);

            // Delete notifications
            await supabaseAdmin
                .from('notifications')
                .delete()
                .eq('user_id', authUserId);

            // Delete push tokens
            await supabaseAdmin
                .from('push_tokens')
                .delete()
                .eq('user_id', authUserId);
        }

        // Delete from Supabase Auth (this is the main auth.users table)
        if (authUserId) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
            if (authError) {
                console.error('Error deleting auth user:', authError);
                // Don't fail if auth delete fails, user might not exist in auth
            }
        }

        return NextResponse.json({
            success: true,
            message: 'User completely deleted from all tables',
            deletedEmail: authUser.gmail
        });

    } catch (error: any) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete user' },
            { status: 500 }
        );
    }
}
