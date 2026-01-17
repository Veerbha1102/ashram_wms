'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminDashboard() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalWorkers: 0,
        presentToday: 0,
        onLeave: 0,
        pendingLeaves: 0,
        tasksCompleted: 0,
        tasksPending: 0,
    });
    const [recentActivity, setRecentActivity] = useState<{ type: string; text: string; time: string }[]>([]);

    useEffect(() => {
        checkAuth();
        loadStats();

        // Realtime sync - refresh when data changes
        const channel = supabase
            .channel('admin-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => loadStats())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadStats())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadStats())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => loadStats())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, () => loadStats())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    async function checkAuth() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) {
            router.push('/login');
            return;
        }
        const { data } = await supabase.from('profiles').select('role').eq('device_token', token).single();
        if (!data || data.role !== 'admin') router.push('/login');
    }

    async function loadStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { count: totalWorkers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'worker');
            const { count: presentToday } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today);
            const { count: pendingLeaves } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            const { data: leaves } = await supabase.from('leave_requests').select('worker_id').eq('status', 'approved').lte('start_date', today).gte('end_date', today);
            const onLeave = leaves?.length || 0;

            const { data: tasks } = await supabase.from('tasks').select('status');
            const tasksCompleted = tasks?.filter(t => t.status === 'completed').length || 0;
            const tasksPending = tasks?.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length || 0;

            setStats({ totalWorkers: totalWorkers || 0, presentToday: presentToday || 0, onLeave, pendingLeaves: pendingLeaves || 0, tasksCompleted, tasksPending });

            // Recent activity from activity_log
            const { data: logs } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(5);
            setRecentActivity((logs || []).map(l => ({
                type: l.action,
                text: l.action,
                time: new Date(l.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            })));

        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setLoading(false);
        }
    }

    const quickLinks = [
        { href: '/admin/workers', icon: '👥', label: 'Manage Workers', color: 'bg-blue-500' },
        { href: '/admin/tasks', icon: '📋', label: 'Assign Tasks', color: 'bg-green-500' },
        { href: '/admin/attendance', icon: '📅', label: 'Attendance', color: 'bg-purple-500' },
        { href: '/admin/leaves', icon: '🏖️', label: 'Leave Requests', color: 'bg-orange-500' },
    ];

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">🙏 Hari Om - Admin Dashboard</h1>
                <p className="text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-blue-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total Workers</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalWorkers}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-green-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Present Today</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.presentToday}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-orange-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">On Leave</p>
                    <p className="text-3xl font-bold text-orange-500 mt-1">{stats.onLeave}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-red-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Pending Leaves</p>
                    <p className="text-3xl font-bold text-red-500 mt-1">{stats.pendingLeaves}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-emerald-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Tasks Done</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.tasksCompleted}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-purple-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Tasks Pending</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.tasksPending}</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition flex items-center gap-4"
                        >
                            <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center text-2xl`}>
                                {link.icon}
                            </div>
                            <span className="font-medium text-gray-800">{link.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Alerts */}
            {stats.pendingLeaves > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-orange-700 font-medium">
                        ⚠️ {stats.pendingLeaves} leave request(s) pending approval.
                        <Link href="/admin/leaves" className="underline ml-2">Review now →</Link>
                    </p>
                </div>
            )}
        </div>
    );
}
