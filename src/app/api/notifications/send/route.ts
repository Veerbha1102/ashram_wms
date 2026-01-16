import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
        process.env.FIREBASE_ADMIN_SDK_JSON || '{}'
    );

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

// Server-side Supabase client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { userId, title, body, data, type = 'info' } = await request.json();

        if (!userId || !title || !body) {
            return NextResponse.json(
                { error: 'userId, title, and body are required' },
                { status: 400 }
            );
        }

        // Get user's push tokens
        const { data: tokens, error: tokensError } = await supabaseAdmin
            .from('push_tokens')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (tokensError || !tokens || tokens.length === 0) {
            return NextResponse.json(
                { error: 'No active tokens found for user' },
                { status: 404 }
            );
        }

        // Check user's notification preferences
        const { data: settings } = await supabaseAdmin
            .from('notification_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (settings && !settings.push_enabled) {
            return NextResponse.json(
                { error: 'User has disabled push notifications' },
                { status: 403 }
            );
        }

        // Save notification to database
        const { error: notifError } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                body,
                data: data || {},
                type,
                read: false,
            });

        if (notifError) {
            console.error('Error saving notification:', notifError);
        }

        // Send push notification to all user's devices
        const results = await Promise.allSettled(
            tokens.map(async (token) => {
                const message = {
                    notification: {
                        title,
                        body,
                    },
                    data: data || {},
                    token: token.token,
                };

                try {
                    const response = await admin.messaging().send(message);
                    console.log('Successfully sent message:', response);

                    // Update last_used timestamp
                    await supabaseAdmin
                        .from('push_tokens')
                        .update({ last_used: new Date().toISOString() })
                        .eq('id', token.id);

                    return { success: true, messageId: response };
                } catch (error: any) {
                    console.error('Error sending to token:', error);

                    // If token is invalid, mark as inactive
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        await supabaseAdmin
                            .from('push_tokens')
                            .update({ is_active: false })
                            .eq('id', token.id);
                    }

                    return { success: false, error: error.message };
                }
            })
        );

        const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const failureCount = results.length - successCount;

        return NextResponse.json({
            success: true,
            message: 'Notification sent',
            tokensProcessed: tokens.length,
            successCount,
            failureCount,
        });

    } catch (error: any) {
        console.error('Send notification error:', error);
        return NextResponse.json(
            { error: 'Failed to send notification' },
            { status: 500 }
        );
    }
}
