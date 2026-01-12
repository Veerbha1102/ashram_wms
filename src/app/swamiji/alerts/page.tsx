'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface AlertItem {
    id: string;
    type: 'late' | 'early_exit' | 'checkout' | 'checkin' | 'field_mode' | 'event_mode' | 'task_complete';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

export default function SwamijiAlertsPage() {
    const supabase = createClient();
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAlerts();
    }, []);

    async function loadAlerts() {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const alertList: AlertItem[] = [];

        // Get worker
        const { data: workers } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('role', 'worker')
            .eq('is_active', true)
            .limit(1);

        if (workers && workers.length > 0) {
            const worker = workers[0];

            // Get today's attendance
            const { data: attendance } = await supabase
                .from('attendance')
                .select('*')
                .eq('worker_id', worker.id)
                .eq('date', today)
                .single();

            if (attendance) {
                // Check-in alert
                if (attendance.check_in_time) {
                    const isLate = attendance.status === 'late';
                    alertList.push({
                        id: `checkin-${today}`,
                        type: isLate ? 'late' : 'checkin',
                        title: isLate ? '⏰ Late Check-in' : '✅ Checked In',
                        message: `${worker.name} checked in at ${new Date(attendance.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
                        time: attendance.check_in_time,
                        read: true
                    });
                }

                // Field/Event mode
                if (attendance.status === 'field') {
                    alertList.push({
                        id: `field-${today}`,
                        type: 'field_mode',
                        title: '🛵 Field Mode',
                        message: `${worker.name} is on field work`,
                        time: new Date().toISOString(),
                        read: false
                    });
                }
                if (attendance.status === 'event') {
                    alertList.push({
                        id: `event-${today}`,
                        type: 'event_mode',
                        title: '📷 Event Mode',
                        message: `${worker.name} is on event duty`,
                        time: new Date().toISOString(),
                        read: false
                    });
                }

                // Early exit request
                if (attendance.early_exit_requested && !attendance.early_exit_approved) {
                    alertList.push({
                        id: `early-exit-${today}`,
                        type: 'early_exit',
                        title: '🙏 Early Exit Request',
                        message: `${worker.name} wants to leave early: "${attendance.early_exit_reason}"`,
                        time: new Date().toISOString(),
                        read: false
                    });
                }

                // Check-out
                if (attendance.check_out_time) {
                    alertList.push({
                        id: `checkout-${today}`,
                        type: 'checkout',
                        title: '🏠 Checked Out',
                        message: `${worker.name} finished work`,
                        time: attendance.check_out_time,
                        read: true
                    });
                }
            } else {
                // Worker not checked in yet - check if late
                const now = new Date();
                const lateTime = new Date();
                lateTime.setHours(9, 30, 0, 0);

                if (now > lateTime) {
                    const minsLate = Math.floor((now.getTime() - lateTime.getTime()) / (1000 * 60));
                    alertList.push({
                        id: `not-started-${today}`,
                        type: 'late',
                        title: '⚠️ Worker Not Started',
                        message: `${worker.name} is ${minsLate} minutes late`,
                        time: new Date().toISOString(),
                        read: false
                    });
                }
            }

            // Get completed tasks today
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to', worker.id)
                .eq('status', 'completed')
                .gte('completed_at', `${today}T00:00:00`);

            (tasks || []).forEach(task => {
                alertList.push({
                    id: `task-${task.id}`,
                    type: 'task_complete',
                    title: '✓ Task Completed',
                    message: task.title,
                    time: task.completed_at,
                    read: true
                });
            });
        }

        // Sort by time descending
        alertList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setAlerts(alertList);
        setLoading(false);
    }

    function getAlertStyle(type: string) {
        switch (type) {
            case 'late': return 'bg-red-50 border-red-200';
            case 'early_exit': return 'bg-orange-50 border-orange-200';
            case 'field_mode': return 'bg-orange-50 border-orange-200';
            case 'event_mode': return 'bg-purple-50 border-purple-200';
            case 'checkin': return 'bg-green-50 border-green-200';
            case 'checkout': return 'bg-blue-50 border-blue-200';
            case 'task_complete': return 'bg-green-50 border-green-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    }

    function formatTime(iso: string) {
        return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">🔔 Alerts</h2>
                <p className="text-gray-500 text-sm">Today's activity notifications</p>
            </div>

            {/* Alert List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : alerts.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                        No alerts for today
                    </div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} className={`rounded-xl border p-4 ${getAlertStyle(alert.type)}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">{alert.title}</p>
                                    <p className="text-sm text-gray-600">{alert.message}</p>
                                </div>
                                <span className="text-xs text-gray-500">{formatTime(alert.time)}</span>
                            </div>
                            {!alert.read && (
                                <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-red-500 text-white rounded">NEW</span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Refresh Button */}
            <button
                onClick={loadAlerts}
                className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium"
            >
                🔄 Refresh Alerts
            </button>
        </div>
    );
}
