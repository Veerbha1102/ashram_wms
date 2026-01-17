import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helper to notify Swamiji
async function notifySwamiji(title: string, body: string, data: any = {}) {
    const { data: swamijis } = await supabaseAdmin
        .from('authorized_users')
        .select('user_id')
        .eq('role', 'swamiji')
        .eq('is_active', true)
        .not('user_id', 'is', null);

    if (!swamijis || swamijis.length === 0) return;

    const notifications = swamijis.map(s => ({
        user_id: s.user_id,
        title,
        body,
        type: 'info',
        data
    }));

    await supabaseAdmin.from('notifications').insert(notifications);
}

// End day
export async function POST(request: NextRequest) {
    try {
        const { worker_id } = await request.json();

        if (!worker_id) {
            return NextResponse.json({ error: 'Worker ID is required' }, { status: 400 });
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Get worker name
        const { data: worker } = await supabaseAdmin
            .from('profiles')
            .select('name')
            .eq('id', worker_id)
            .single();

        // End current time log
        const { data: currentLog } = await supabaseAdmin
            .from('time_logs')
            .select('*')
            .eq('worker_id', worker_id)
            .is('end_time', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (currentLog) {
            const startTime = new Date(currentLog.start_time);
            const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);

            await supabaseAdmin
                .from('time_logs')
                .update({
                    end_time: now.toISOString(),
                    duration_minutes: durationMinutes
                })
                .eq('id', currentLog.id);
        }

        // Update attendance with check-out time
        const { error } = await supabaseAdmin
            .from('attendance')
            .update({ check_out_time: now.toISOString() })
            .eq('worker_id', worker_id)
            .eq('date', today);

        if (error) throw error;

        // Calculate total hours worked today
        const { data: logs } = await supabaseAdmin
            .from('time_logs')
            .select('mode, duration_minutes')
            .eq('worker_id', worker_id)
            .eq('date', today);

        const totalMinutes = logs?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        // Notify Swamiji
        await notifySwamiji(
            '🏠 Worker Ended Day',
            `${worker?.name || 'Worker'} has ended their day (${hours}h ${minutes}m worked)`,
            { worker_id, total_minutes: totalMinutes }
        );

        return NextResponse.json({
            success: true,
            message: 'Day ended successfully',
            summary: {
                total_hours: hours,
                total_minutes: minutes,
                logs: logs
            }
        });

    } catch (error: any) {
        console.error('End day error:', error);
        return NextResponse.json({ error: error.message || 'Failed to end day' }, { status: 500 });
    }
}
