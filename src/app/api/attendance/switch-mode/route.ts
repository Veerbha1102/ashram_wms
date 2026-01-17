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

// Switch mode
export async function POST(request: NextRequest) {
    try {
        const { worker_id, new_mode, notes } = await request.json();

        if (!worker_id || !new_mode) {
            return NextResponse.json({ error: 'Worker ID and mode are required' }, { status: 400 });
        }

        if (!['office', 'field', 'event'].includes(new_mode)) {
            return NextResponse.json({ error: 'Invalid mode. Must be office, field, or event' }, { status: 400 });
        }

        // Get worker name
        const { data: worker } = await supabaseAdmin
            .from('profiles')
            .select('name')
            .eq('id', worker_id)
            .single();

        // End current time log
        const now = new Date();
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

        // Start new time log
        await supabaseAdmin.from('time_logs').insert({
            worker_id,
            mode: new_mode,
            start_time: now.toISOString(),
            notes
        });

        // Update today's attendance mode
        await supabaseAdmin
            .from('attendance')
            .update({ mode: new_mode })
            .eq('worker_id', worker_id)
            .eq('date', new Date().toISOString().split('T')[0]);

        // Notify Swamiji for field/event modes
        if (new_mode === 'field') {
            await notifySwamiji(
                '📍 Field Work Started',
                `${worker?.name || 'Worker'} is now on FIELD duty`,
                { worker_id, mode: 'field', notes }
            );
        } else if (new_mode === 'event') {
            await notifySwamiji(
                '🎉 Event Mode Started',
                `${worker?.name || 'Worker'} is now at an EVENT`,
                { worker_id, mode: 'event', notes }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Mode switched to ${new_mode}`,
            mode: new_mode
        });

    } catch (error: any) {
        console.error('Switch mode error:', error);
        return NextResponse.json({ error: error.message || 'Failed to switch mode' }, { status: 500 });
    }
}
