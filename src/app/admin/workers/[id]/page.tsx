'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

interface Worker {
    id: string;
    name: string;
    gmail: string;
    phone: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

interface Attendance {
    id: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
    mode: string;
}

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    completed_at: string | null;
}

interface Leave {
    id: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
}

interface TimeLog {
    id: string;
    date: string;
    mode: string;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
}

export default function WorkerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const workerId = params.id as string;
    const supabase = createClient();

    const [worker, setWorker] = useState<Worker | null>(null);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'attendance' | 'tasks' | 'leaves' | 'time'>('attendance');

    useEffect(() => {
        if (workerId) loadWorkerData();
    }, [workerId]);

    async function loadWorkerData() {
        try {
            // Load worker profile
            const { data: workerData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', workerId)
                .single();
            setWorker(workerData);

            // Load attendance (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('*')
                .eq('worker_id', workerId)
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
                .order('date', { ascending: false });
            setAttendance(attendanceData || []);

            // Load tasks
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to', workerId)
                .order('created_at', { ascending: false })
                .limit(50);
            setTasks(tasksData || []);

            // Load leaves
            const { data: leavesData } = await supabase
                .from('leaves')
                .select('*')
                .eq('worker_id', workerId)
                .order('start_date', { ascending: false })
                .limit(20);
            setLeaves(leavesData || []);

            // Load time logs
            const { data: timeLogsData } = await supabase
                .from('time_logs')
                .select('*')
                .eq('worker_id', workerId)
                .order('created_at', { ascending: false })
                .limit(50);
            setTimeLogs(timeLogsData || []);

        } catch (err) {
            console.error('Error loading worker data:', err);
        } finally {
            setLoading(false);
        }
    }

    function formatTime(iso: string | null): string {
        if (!iso) return '-';
        return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Stats calculations
    const totalDaysWorked = attendance.length;
    const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const tasksPending = tasks.filter(t => t.status !== 'completed').length;
    const leaveDays = leaves.filter(l => l.status === 'approved').length;
    const totalHours = timeLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / 60;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
    }

    if (!worker) {
        return <div className="text-center py-20 text-gray-500">Worker not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/admin/workers" className="text-blue-600 hover:underline">← Back to Workers</Link>

            {/* Worker Header */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
                        {worker.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">{worker.name}</h1>
                        <p className="text-gray-500">{worker.gmail}</p>
                        <div className="flex gap-2 mt-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${worker.role === 'admin' ? 'bg-purple-100 text-purple-700' : worker.role === 'swamiji' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {worker.role}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${worker.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {worker.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Phone</p>
                        <p className="font-medium text-gray-700">{worker.phone || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl p-4 shadow border-l-4 border-blue-500">
                    <p className="text-xs text-gray-500 uppercase">Days Worked</p>
                    <p className="text-2xl font-bold text-gray-800">{totalDaysWorked}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border-l-4 border-green-500">
                    <p className="text-xs text-gray-500 uppercase">Tasks Done</p>
                    <p className="text-2xl font-bold text-green-600">{tasksCompleted}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border-l-4 border-orange-500">
                    <p className="text-xs text-gray-500 uppercase">Tasks Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{tasksPending}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border-l-4 border-purple-500">
                    <p className="text-xs text-gray-500 uppercase">Leave Days</p>
                    <p className="text-2xl font-bold text-purple-600">{leaveDays}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border-l-4 border-cyan-500">
                    <p className="text-xs text-gray-500 uppercase">Total Hours</p>
                    <p className="text-2xl font-bold text-cyan-600">{totalHours.toFixed(1)}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="flex border-b">
                    {['attendance', 'tasks', 'leaves', 'time'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-3 text-center font-medium capitalize ${activeTab === tab ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                        >
                            {tab === 'time' ? 'Time Logs' : tab}
                        </button>
                    ))}
                </div>

                <div className="p-4 max-h-96 overflow-y-auto">
                    {/* Attendance Tab */}
                    {activeTab === 'attendance' && (
                        <div className="space-y-2">
                            {attendance.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No attendance records</p>
                            ) : attendance.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800">{formatDate(a.date)}</p>
                                        <p className="text-sm text-gray-500">{formatTime(a.check_in_time)} → {formatTime(a.check_out_time)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {a.mode && <span className={`text-xs px-2 py-1 rounded ${a.mode === 'field' ? 'bg-orange-100 text-orange-700' : a.mode === 'event' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{a.mode}</span>}
                                        <span className={`text-xs px-2 py-1 rounded ${a.status === 'present' || a.status === 'completed' ? 'bg-green-100 text-green-700' : a.status === 'late' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tasks Tab */}
                    {activeTab === 'tasks' && (
                        <div className="space-y-2">
                            {tasks.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No tasks assigned</p>
                            ) : tasks.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className={`font-medium ${t.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.title}</p>
                                        <p className="text-xs text-gray-500">{formatDate(t.created_at)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`text-xs px-2 py-1 rounded ${t.priority === 'high' || t.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{t.priority}</span>
                                        <span className={`text-xs px-2 py-1 rounded ${t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Leaves Tab */}
                    {activeTab === 'leaves' && (
                        <div className="space-y-2">
                            {leaves.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No leave requests</p>
                            ) : leaves.map(l => (
                                <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800">{formatDate(l.start_date)} - {formatDate(l.end_date)}</p>
                                        <p className="text-sm text-gray-500">{l.reason}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${l.status === 'approved' ? 'bg-green-100 text-green-700' : l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{l.status}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Time Logs Tab */}
                    {activeTab === 'time' && (
                        <div className="space-y-2">
                            {timeLogs.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No time logs</p>
                            ) : timeLogs.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800">{formatDate(t.date)}</p>
                                        <p className="text-sm text-gray-500">{formatTime(t.start_time)} → {formatTime(t.end_time)}</p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className={`text-xs px-2 py-1 rounded ${t.mode === 'field' ? 'bg-orange-100 text-orange-700' : t.mode === 'event' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{t.mode}</span>
                                        {t.duration_minutes && <span className="text-sm font-medium text-gray-600">{Math.floor(t.duration_minutes / 60)}h {t.duration_minutes % 60}m</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
