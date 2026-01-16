import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// This API route keeps Supabase free tier alive by pinging every day
// Call this via external cron service like cron-job.org or Vercel Cron

export async function GET() {
    const supabase = createClient();
    
    try {
        // Simple ping to keep database active
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Ping error:', error);
            return NextResponse.json({ 
                success: false, 
                error: error.message,
                timestamp: new Date().toISOString()
            }, { status: 500 });
        }

        // Log the ping
        await supabase.from('activity_log').insert({
            action: 'system_ping',
            description: 'Daily database ping to prevent Supabase pause',
            created_at: new Date().toISOString()
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Database is alive!',
            profilesCount: data?.length || 0,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        return NextResponse.json({ 
            success: false, 
            error: 'Internal error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
