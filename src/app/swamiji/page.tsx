'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

interface Worker {
    id: string;
    name: string;
    phone: string;
    is_active: boolean;
}

interface Attendance {
    id: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
    early_exit_requested: boolean;
    early_exit_reason: string | null;
    early_exit_approved: boolean;
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    completed_at: string | null;
    is_new: boolean;
}

export default function SwamijiDashboard() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [worker, setWorker] = useState<Worker | null>(null);
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
    const [hasApprovedLeave, setHasApprovedLeave] = useState(false);
    const [emergencyContact, setEmergencyContact] = useState<string | null>(null);

    // For tracking changes to show notifications
    const [prevAttendance, setPrevAttendance] = useState<Attendance | null>(null);
    const [prevTasksCompleted, setPrevTasksCompleted] = useState(0);

    // Task assignment
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        // Request notification permission on load
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        checkAuth();
        loadData();

        // Realtime sync - instant updates when workers change
        const channel = supabase
            .channel('swamiji-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => loadData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, () => loadData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => loadData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => loadData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    function showNotification(title: string, body: string, icon: string = '🔔') {
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/logo.png' });
        }

        // Also play a sound
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA');
            audio.volume = 0.3;
            audio.play().catch(() => { });
        } catch (e) { }
    }

    // Watch for changes and show notifications
    useEffect(() => {
        if (!worker || !prevAttendance) return;

        // Check-in notification
        if (!prevAttendance.check_in_time && attendance?.check_in_time) {
            const status = attendance.status === 'late' ? '⏰ LATE' : '✅ On Time';
            showNotification(
                `${worker.name} Checked In`,
                `${status} at ${new Date(attendance.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
            );
        }

        // Check-out notification
        if (!prevAttendance.check_out_time && attendance?.check_out_time) {
            showNotification(
                `${worker.name} Checked Out`,
                `Day complete. Hours worked: ${getHoursWorked()}`
            );
        }

        // Early exit request notification
        if (!prevAttendance.early_exit_requested && attendance?.early_exit_requested) {
            showNotification(
                '🙏 Early Exit Request',
                `${worker.name} wants to leave early: ${attendance.early_exit_reason}`
            );
        }

    }, [attendance, prevAttendance, worker]);

    // Watch for task completions
    useEffect(() => {
        const completed = tasks.filter(t => t.status === 'completed').length;
        if (prevTasksCompleted > 0 && completed > prevTasksCompleted && worker) {
            showNotification(
                '✅ Task Completed',
                `${worker.name} completed a task`
            );
        }
        setPrevTasksCompleted(completed);
    }, [tasks, worker]);

    async function checkAuth() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) { router.push('/login'); return; }
        const { data } = await supabase.from('profiles').select('role').eq('device_token', token).single();
        if (!data || data.role !== 'swamiji') router.push('/login');
    }

    async function loadData() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Get all workers (active or not) - system is designed for single worker
            const { data: workers, error: workerError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'worker')
                .order('created_at', { ascending: false })
                .limit(1);

            console.log('Workers found:', workers, 'Error:', workerError);

            if (workers && workers.length > 0) {
                const w = workers[0];
                setWorker(w);

                const { data: att } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('worker_id', w.id)
                    .eq('date', today)
                    .single();

                // Store previous state before updating
                setPrevAttendance(attendance);
                setAttendance(att);

                const { data: tasksData } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('assigned_to', w.id)
                    .order('created_at', { ascending: false });

                // Mark tasks as new if created in last 5 minutes and not seen
                const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                setTasks((tasksData || []).map(t => ({
                    ...t,
                    is_new: t.created_at > fiveMinAgo && t.status === 'pending'
                })));

                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const { data: recentAtt } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('worker_id', w.id)
                    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
                    .order('date', { ascending: false });
                setRecentAttendance(recentAtt || []);

                // Check if worker has approved leave today
                const { data: leaveData } = await supabase
                    .from('leaves')
                    .select('status')
                    .eq('worker_id', w.id)
                    .eq('status', 'approved')
                    .lte('start_date', today)
                    .gte('end_date', today)
                    .limit(1);
                setHasApprovedLeave((leaveData || []).length > 0);
            }

            // Load emergency contact from settings
            const { data: contactSetting } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'emergency_contact')
                .single();
            if (contactSetting?.value) {
                setEmergencyContact(contactSetting.value);
            }
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function approveEarlyExit() {
        if (!attendance) return;
        await supabase.from('attendance').update({
            early_exit_approved: true,
            early_exit_approved_at: new Date().toISOString()
        }).eq('id', attendance.id);
        loadData();
    }

    async function assignTask() {
        if (!newTask.title.trim() || !worker) {
            alert('Please enter a task title');
            return;
        }

        setAssigning(true);

        const { error } = await supabase.from('tasks').insert({
            title: newTask.title,
            description: newTask.description || null,
            priority: newTask.priority,
            assigned_to: worker.id,
            assigned_by: null, // Swamiji doesn't have profile ID
            status: 'pending',
            due_date: new Date().toISOString().split('T')[0],
        });

        if (!error) {
            setShowTaskModal(false);
            setNewTask({ title: '', description: '', priority: 'medium' });
            loadData();
        }
        setAssigning(false);
    }

    function getWorkerStatus(): { status: string; color: string; icon: string } {
        // Check for approved leave first
        if (hasApprovedLeave) {
            return { status: 'On Leave', color: 'bg-blue-100 text-blue-700', icon: '🏖️' };
        }
        if (!attendance?.check_in_time) {
            return { status: 'Not Started', color: 'bg-gray-100 text-gray-600', icon: '😴' };
        }
        if (attendance.check_out_time) {
            return { status: 'Day Complete', color: 'bg-green-100 text-green-700', icon: '✅' };
        }
        if (attendance.status === 'field') {
            return { status: 'On Field', color: 'bg-orange-100 text-orange-700', icon: '🛵' };
        }
        if (attendance.status === 'event') {
            return { status: 'Event Duty', color: 'bg-purple-100 text-purple-700', icon: '📷' };
        }
        if (attendance.status === 'late') {
            return { status: 'Working (Late)', color: 'bg-yellow-100 text-yellow-700', icon: '⏰' };
        }
        return { status: 'Working', color: 'bg-green-100 text-green-700', icon: '💼' };
    }

    function getHoursWorked(): string {
        if (!attendance?.check_in_time) return '0:00';
        const start = new Date(attendance.check_in_time);
        const end = attendance.check_out_time ? new Date(attendance.check_out_time) : new Date();
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    }

    function formatTime(iso: string | null): string {
        if (!iso) return '-';
        return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const tasksPending = tasks.filter(t => t.status !== 'completed').length;
    const workerStatus = getWorkerStatus();

    // Check if worker is late (after 9:30 AM and not started) - but not if on approved leave
    const now = new Date();
    const lateTime = new Date();
    lateTime.setHours(9, 30, 0, 0);
    const isWorkerLate = now > lateTime && !attendance?.check_in_time && !hasApprovedLeave;
    const minutesLate = isWorkerLate ? Math.floor((now.getTime() - lateTime.getTime()) / (1000 * 60)) : 0;

    // Smart time formatting - show hours/days when appropriate
    function formatLateTime(mins: number): string {
        if (mins < 60) return `${mins} minutes`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMins > 0 ? remainingMins + ' min' : ''}`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''}`;
    }

    const contactPhone = emergencyContact || worker?.phone;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 relative">
                            <Image src="/logo.png" alt="AAKB" fill className="object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">🙏 Hari Om, Swamiji</h1>
                            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { localStorage.removeItem('aakb_device_token'); router.push('/login'); }}
                        className="text-gray-500 hover:text-red-500"
                    >
                        🚪 Logout
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-6">
                {/* SMART STATUS BANNER */}
                {!worker ? (
                    <div className="bg-gray-500 text-white rounded-2xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">👤</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-1">No Worker Assigned</h3>
                                <p className="text-gray-200 mb-2">There is no active worker in the system yet.</p>
                                <p className="text-sm text-gray-300">
                                    Ask Admin to add a worker in the Admin Panel → Workers
                                </p>
                            </div>
                        </div>
                    </div>
                ) : hasApprovedLeave ? (
                    <div className="bg-blue-500 text-white rounded-2xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">🏖️</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-1">Worker is On Leave</h3>
                                <p className="text-blue-100 mb-2">{worker?.name} has approved leave today</p>
                                <p className="bg-white/20 rounded-lg px-3 py-2 text-sm inline-block">
                                    No action required - Enjoy your day! 🙏
                                </p>
                            </div>
                        </div>
                    </div>
                ) : isWorkerLate ? (
                    <div className="bg-red-500 text-white rounded-2xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">⏰</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-1">Worker is LATE!</h3>
                                <p className="text-red-100 mb-2">{worker?.name} has not started work today</p>
                                <p className="bg-white/20 rounded-lg px-3 py-2 text-sm mb-4 inline-block">
                                    {formatLateTime(minutesLate)} late (Expected: 9:30 AM)
                                </p>
                                <div className="flex gap-3">
                                    <a
                                        href={`tel:${contactPhone}`}
                                        className="px-6 py-2 bg-white text-red-600 font-bold rounded-xl"
                                    >
                                        📞 CALL NOW
                                    </a>
                                    <a
                                        href={`https://wa.me/91${contactPhone?.replace(/\D/g, '')}?text=${encodeURIComponent('Hari Om. You have not started work yet. Please come to office immediately.')}`}
                                        target="_blank"
                                        className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl"
                                    >
                                        💬 WhatsApp
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : attendance?.check_in_time && !attendance?.check_out_time ? (
                    <div className="bg-green-500 text-white rounded-2xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">{workerStatus.icon}</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-1">{worker?.name} is {workerStatus.status}</h3>
                                <p className="text-green-100">
                                    Checked in at {formatTime(attendance.check_in_time)} • Working for {getHoursWorked()}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : attendance?.check_out_time ? (
                    <div className="bg-purple-500 text-white rounded-2xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">✅</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-1">Day Complete</h3>
                                <p className="text-purple-100">
                                    {worker?.name} worked {getHoursWorked()} today
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-500 text-white rounded-2xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">😴</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-1">Waiting for Worker</h3>
                                <p className="text-yellow-100">
                                    {worker?.name} hasn't started yet (Before 9:30 AM)
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Early Exit Request Alert */}
                {
                    attendance?.early_exit_requested && !attendance?.early_exit_approved && (
                        <div className="bg-orange-500 text-white rounded-2xl p-6 shadow-lg animate-pulse">
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">🙏</div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold mb-1">Early Exit Request</h3>
                                    <p className="text-orange-100 mb-2">{worker?.name} wants to leave early</p>
                                    <p className="bg-white/20 rounded-lg p-3 text-sm mb-4">
                                        "{attendance.early_exit_reason}"
                                    </p>
                                    <p className="text-sm text-orange-100 mb-4">Hours worked: {getHoursWorked()}</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={approveEarlyExit}
                                            className="px-6 py-2 bg-white text-orange-600 font-bold rounded-xl"
                                        >
                                            ✅ APPROVE
                                        </button>
                                        <a
                                            href={`tel:${worker?.phone}`}
                                            className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl"
                                        >
                                            📞 CALL
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Worker Card */}
                {
                    worker && (
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-600">
                                        {worker.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{worker.name}</h2>
                                        <p className="text-gray-500">{worker.phone}</p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-full font-medium ${workerStatus.color}`}>
                                    {workerStatus.icon} {workerStatus.status}
                                </div>
                            </div>

                            {/* Today's Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Check In</p>
                                    <p className="text-xl font-bold text-gray-900">{formatTime(attendance?.check_in_time || null)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Hours Today</p>
                                    <p className="text-xl font-bold text-blue-600">{getHoursWorked()}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Check Out</p>
                                    <p className="text-xl font-bold text-gray-900">{formatTime(attendance?.check_out_time || null)}</p>
                                </div>
                            </div>

                            {/* Quick Action */}
                            <a
                                href={`tel:${worker.phone}`}
                                className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                            >
                                📞 Call {worker.name.split(' ')[0]}
                            </a>
                        </div>
                    )
                }

                {/* Assign Task Button */}
                <button
                    onClick={() => setShowTaskModal(true)}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2"
                >
                    ➕ Assign New Task to {worker?.name?.split(' ')[0]}
                </button>

                {/* Tasks Overview */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Tasks</h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-green-600">{tasksCompleted}</p>
                            <p className="text-sm text-gray-600">Completed</p>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600">{tasksPending}</p>
                            <p className="text-sm text-gray-600">Pending</p>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {tasks.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No tasks assigned. Tap button above to assign.</p>
                        ) : (
                            tasks.map(task => (
                                <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg ${task.is_new ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${task.status === 'completed' ? 'bg-green-500 text-white' : 'border-2 border-gray-300'
                                            }`}>
                                            {task.status === 'completed' && '✓'}
                                        </div>
                                        <div>
                                            <span className={task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}>
                                                {task.title}
                                            </span>
                                            {task.is_new && <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded">NEW</span>}
                                        </div>
                                    </div>
                                    {(task.priority === 'high' || task.priority === 'urgent') && (
                                        <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">Critical</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Attendance */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📅 Last 7 Days</h3>

                    <div className="space-y-2">
                        {recentAttendance.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No attendance records</p>
                        ) : (
                            recentAttendance.map(att => (
                                <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {new Date(att.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatTime(att.check_in_time)} → {formatTime(att.check_out_time)}
                                        </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${att.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        att.status === 'late' ? 'bg-orange-100 text-orange-700' :
                                            att.status === 'undertime' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {att.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Today's Activity Timeline */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">🔔 Today&apos;s Activity</h3>

                    <div className="space-y-3">
                        {/* Punch In */}
                        {attendance?.check_in_time ? (
                            <div className={`flex items-center gap-4 p-3 rounded-xl ${attendance.status === 'late' ? 'bg-orange-50' : 'bg-green-50'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${attendance.status === 'late' ? 'bg-orange-500' : 'bg-green-500'} text-white`}>
                                    {attendance.status === 'late' ? '⏰' : '✅'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                        {attendance.status === 'late' ? 'Checked In LATE' : 'Checked In On Time'}
                                    </p>
                                    <p className="text-sm text-gray-500">{formatTime(attendance.check_in_time)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-300 text-white">⏳</div>
                                <div>
                                    <p className="font-medium text-gray-500">Not Checked In Yet</p>
                                    <p className="text-sm text-gray-400">Waiting...</p>
                                </div>
                            </div>
                        )}

                        {/* Mode Changes */}
                        {attendance?.status === 'field' && (
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-orange-50">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500 text-white">🛵</div>
                                <div>
                                    <p className="font-medium text-gray-900">Switched to Field Mode</p>
                                    <p className="text-sm text-gray-500">Currently on field work</p>
                                </div>
                            </div>
                        )}
                        {attendance?.status === 'event' && (
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-purple-50">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500 text-white">📷</div>
                                <div>
                                    <p className="font-medium text-gray-900">On Event Duty</p>
                                    <p className="text-sm text-gray-500">Currently at event</p>
                                </div>
                            </div>
                        )}

                        {/* Task Completions */}
                        {tasks.filter(t => t.status === 'completed').slice(0, 3).map(task => (
                            <div key={task.id} className="flex items-center gap-4 p-3 rounded-xl bg-green-50">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500 text-white">✓</div>
                                <div>
                                    <p className="font-medium text-gray-900">Task Completed</p>
                                    <p className="text-sm text-gray-500">{task.title}</p>
                                </div>
                            </div>
                        ))}

                        {/* Pending Tasks */}
                        {tasks.filter(t => t.status !== 'completed').length > 0 && (
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-yellow-50">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-500 text-white">📋</div>
                                <div>
                                    <p className="font-medium text-gray-900">{tasks.filter(t => t.status !== 'completed').length} Tasks Pending</p>
                                    <p className="text-sm text-gray-500">Not completed yet</p>
                                </div>
                            </div>
                        )}

                        {/* Punch Out */}
                        {attendance?.check_out_time && (
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-50">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 text-white">🏠</div>
                                <div>
                                    <p className="font-medium text-gray-900">Checked Out</p>
                                    <p className="text-sm text-gray-500">{formatTime(attendance.check_out_time)} • {getHoursWorked()} hours worked</p>
                                </div>
                            </div>
                        )}

                        {/* Early Exit Request */}
                        {attendance?.early_exit_requested && (
                            <div className={`flex items-center gap-4 p-3 rounded-xl ${attendance.early_exit_approved ? 'bg-green-50' : 'bg-orange-50'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${attendance.early_exit_approved ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
                                    {attendance.early_exit_approved ? '✅' : '🙏'}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {attendance.early_exit_approved ? 'Early Exit Approved' : 'Early Exit Pending'}
                                    </p>
                                    <p className="text-sm text-gray-500">{attendance.early_exit_reason}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-bold text-blue-800 mb-2">💡 Quick Summary</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        {!attendance?.check_in_time && <li>• {worker?.name} has not started work today</li>}
                        {attendance?.check_in_time && !attendance?.check_out_time && <li>• Currently working: {getHoursWorked()} hours</li>}
                        {attendance?.check_out_time && <li>• Day complete: {getHoursWorked()} hours worked</li>}
                        {tasksPending > 0 && <li>• {tasksPending} task(s) pending completion</li>}
                        {attendance?.status === 'late' && <li>• ⚠️ Worker checked in late today</li>}
                        {tasksCompleted === tasks.length && tasks.length > 0 && <li>• 🎉 All tasks completed!</li>}
                    </ul>
                </div>
            </main >

            {/* Assign Task Modal */}
            {
                showTaskModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Assign Task to {worker?.name}</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-2">Task Title *</label>
                                    <input
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                        placeholder="What should be done?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-2">Details (optional)</label>
                                    <textarea
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 min-h-[80px]"
                                        placeholder="Additional instructions..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-2">Priority</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High (Critical - blocks end of day)</option>
                                        <option value="urgent">Urgent (Critical)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowTaskModal(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={assignTask}
                                    disabled={assigning}
                                    className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl disabled:opacity-50"
                                >
                                    {assigning ? 'Assigning...' : 'Assign Task'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
