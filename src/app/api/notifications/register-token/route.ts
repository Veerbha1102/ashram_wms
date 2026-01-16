import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Get current user
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { token, platform, deviceName } = await request.json();

        if (!token || !platform) {
            return NextResponse.json(
                { error: 'Token and platform are required' },
                { status: 400 }
            );
        }

        const supabase = createClient();

        // Check if token already exists
        const { data: existingToken } = await supabase
            .from('push_tokens')
            .select('*')
            .eq('token', token)
            .single();

        if (existingToken) {
            // Update existing token
            await supabase
                .from('push_tokens')
                .update({
                    is_active: true,
                    last_used: new Date().toISOString(),
                })
                .eq('token', token);
        } else {
            // Insert new token
            await supabase
                .from('push_tokens')
                .insert({
                    user_id: user.user_id,
                    token,
                    platform,
                    device_name: deviceName || platform,
                    is_active: true,
                });
        }

        // Initialize notification settings if not exists
        const { data: settings } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', user.user_id)
            .single();

        if (!settings) {
            await supabase
                .from('notification_settings')
                .insert({
                    user_id: user.user_id,
                    push_enabled: true,
                    email_enabled: true,
                    task_notifications: true,
                    leave_notifications: true,
                    system_notifications: true,
                });
        }

        return NextResponse.json({
            success: true,
            message: 'Token registered successfully',
        });

    } catch (error: any) {
        console.error('Token registration error:', error);
        return NextResponse.json(
            { error: 'Failed to register token' },
            { status: 500 }
        );
    }
}
