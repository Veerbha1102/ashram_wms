import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helper to notify Swamiji
async function notifySwamiji(title: string, body: string, data: any = {}) {
    // Get all Swamiji users
    const { data: swamijis } = await supabaseAdmin
        .from('authorized_users')
        .select('user_id')
        .eq('role', 'swamiji')
        .eq('is_active', true)
        .not('user_id', 'is', null);

    if (!swamijis || swamijis.length === 0) return;

    // Insert notifications for each Swamiji
    const notifications = swamijis.map(s => ({
        user_id: s.user_id,
        title,
        body,
        type: 'info',
        data
    }));

    await supabaseAdmin.from('notifications').insert(notifications);
}

// Start day
export async function POST(request: NextRequest) {
    try {
        const { worker_id, device_id, device_type } = await request.json();

        if (!worker_id) {
            return NextResponse.json({ error: 'Worker ID is required' }, { status: 400 });
        }

        // Check if office mode and device is laptop
        if (device_type === 'laptop') {
            // Verify device is assigned to worker
            const { data: deviceCheck } = await supabaseAdmin
                .from('worker_devices')
                .select('*')
                .eq('worker_id', worker_id)
                .eq('device_fingerprint', device_id)
                .eq('device_type', 'laptop')
                .single();

            if (!deviceCheck) {
                return NextResponse.json({
                    error: 'This laptop is not assigned to you. Please use your assigned device.'
                }, { status: 403 });
            }
        }

        // Get worker name
        const { data: worker } = await supabaseAdmin
            .from('profiles')
            .select('name')
            .eq('id', worker_id)
            .single();

        // Create attendance record
        const { data: attendance, error } = await supabaseAdmin
            .from('attendance')
            .insert({
                worker_id,
                check_in_time: new Date().toISOString(),
                status: 'present',
                mode: 'office',
                device_id
            })
            .select()
            .single();

        if (error) throw error;

        // Create time log
        await supabaseAdmin.from('time_logs').insert({
            worker_id,
            mode: 'office',
            start_time: new Date().toISOString()
        });

        // Notify Swamiji
        await notifySwamiji(
            '🏢 Worker Started Day',
            `${worker?.name || 'Worker'} has started their day`,
            { worker_id, mode: 'office' }
        );

        return NextResponse.json({
            success: true,
            message: 'Day started successfully',
            attendance
        });

    } catch (error: any) {
        console.error('Start day error:', error);
        return NextResponse.json({ error: error.message || 'Failed to start day' }, { status: 500 });
    }
}
