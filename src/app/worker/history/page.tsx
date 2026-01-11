'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface AttendanceRecord {
    id: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
    hours_worked: number;
}

export default function WorkerHistoryPage() {
    const supabase = createClient();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalDays: 0, presentDays: 0, lateDays: 0, avgHours: 0 });

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('device_token', token)
            .single();

        if (!profile) return;

        // Get last 30 days of attendance
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: attendance } = await supabase
            .from('attendance')
            .select('*')
            .eq('worker_id', profile.id)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('date', { ascending: false });

        const recordsList: AttendanceRecord[] = (attendance || []).map(a => {
            let hoursWorked = 0;
            if (a.check_in_time && a.check_out_time) {
                hoursWorked = (new Date(a.check_out_time).getTime() - new Date(a.check_in_time).getTime()) / (1000 * 60 * 60);
            }
            return {
                id: a.id,
                date: a.date,
                check_in_time: a.check_in_time,
                check_out_time: a.check_out_time,
                status: a.status,
                hours_worked: hoursWorked,
            };
        });

        setRecords(recordsList);

        // Calculate stats
        const presentDays = recordsList.filter(r => r.status !== 'absent').length;
        const lateDays = recordsList.filter(r => r.status === 'late').length;
        const totalHours = recordsList.reduce((sum, r) => sum + r.hours_worked, 0);

        setStats({
            totalDays: recordsList.length,
            presentDays,
            lateDays,
            avgHours: presentDays > 0 ? totalHours / presentDays : 0,
        });

        setLoading(false);
    }

    function formatTime(isoString: string | null): string {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    function getStatusColor(status: string): string {
        const colors: Record<string, string> = {
            present: 'bg-green-100 text-green-700',
            completed: 'bg-green-100 text-green-700',
            late: 'bg-orange-100 text-orange-700',
            early_approved: 'bg-blue-100 text-blue-700',
            undertime: 'bg-red-100 text-red-700',
            overtime: 'bg-purple-100 text-purple-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-600';
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">📅 Attendance History</h1>
                <p className="text-gray-500">Last 30 days</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Days Worked</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.presentDays}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Late Days</p>
                    <p className="text-2xl font-bold text-orange-500">{stats.lateDays}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Avg Hours/Day</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.avgHours.toFixed(1)}h</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Attendance %</p>
                    <p className="text-2xl font-bold text-green-600">
                        {stats.totalDays > 0 ? Math.round((stats.presentDays / stats.totalDays) * 100) : 0}%
                    </p>
                </div>
            </div>

            {/* Records */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                {loading ? (
                    <p className="p-8 text-center text-gray-400">Loading...</p>
                ) : records.length === 0 ? (
                    <p className="p-8 text-center text-gray-400">No attendance records yet</p>
                ) : (
                    <div className="divide-y">
                        {records.map(record => (
                            <div key={record.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-800">{formatDate(record.date)}</p>
                                    <p className="text-sm text-gray-500">
                                        {formatTime(record.check_in_time)} → {formatTime(record.check_out_time)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                        {record.status}
                                    </span>
                                    {record.hours_worked > 0 && (
                                        <p className="text-sm text-gray-500 mt-1">{record.hours_worked.toFixed(1)}h</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
