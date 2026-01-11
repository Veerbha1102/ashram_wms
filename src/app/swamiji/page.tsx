'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

interface Worker {
    id: string;
    name: string;
    phone: string;
    status: 'offline' | 'working' | 'field' | 'event' | 'done';
    check_in_time?: string;
    check_out_time?: string;
}

interface EarlyExitRequest {
    id: string;
    worker_id: string;
    worker_name: string;
    worker_phone: string;
    reason: string;
    hours_worked: number;
    check_in_time: string;
}

export default function SwamijiFeed() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Real Stats from DB
    const [stats, setStats] = useState({
        totalWorkers: 0,
        present: 0,
        onField: 0,
        onLeave: 0,
        tasksCompleted: 0,
        tasksPending: 0
    });

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [earlyExitRequests, setEarlyExitRequests] = useState<EarlyExitRequest[]>([]);

    useEffect(() => {
        checkAuth();
        loadDashboardData();

        const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);
        const dataInterval = setInterval(loadDashboardData, 10000);

        return () => {
            clearInterval(timeInterval);
            clearInterval(dataInterval);
        };
    }, []);

    async function checkAuth() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) {
            router.push('/login');
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('device_token', token)
            .single();

        if (error || !data || data.role !== 'swamiji') {
            router.push('/login');
        }
    }

    async function loadDashboardData() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Get all workers
            const { data: allWorkers, count: totalCount } = await supabase
                .from('profiles')
                .select('id, name, phone', { count: 'exact' })
                .eq('role', 'worker')
                .eq('is_active', true);

            // Get today's attendance
            const { data: attendance } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', today);

            // Get approved leaves for today
            const { data: leaves } = await supabase
                .from('leave_requests')
                .select('worker_id')
                .eq('status', 'approved')
                .lte('start_date', today)
                .gte('end_date', today);

            // Get tasks stats for today
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('status')
                .or(`due_date.eq.${today},due_date.is.null`);

            const leaveWorkerIds = new Set(leaves?.map(l => l.worker_id) || []);

            // Build worker status list
            const workersList: Worker[] = (allWorkers || []).map(w => {
                const att = attendance?.find(a => a.worker_id === w.id);
                let status: Worker['status'] = 'offline';

                if (leaveWorkerIds.has(w.id)) {
                    status = 'offline';
                } else if (att?.check_out_time) {
                    status = 'done';
                } else if (att?.check_in_time) {
                    status = att.status === 'field' ? 'field' :
                        att.status === 'event' ? 'event' : 'working';
                }

                return {
                    id: w.id,
                    name: w.name,
                    phone: w.phone,
                    status,
                    check_in_time: att?.check_in_time,
                    check_out_time: att?.check_out_time,
                };
            });

            setWorkers(workersList);

            // Build early exit requests
            const earlyExits: EarlyExitRequest[] = [];
            (attendance || []).forEach(att => {
                if (att.early_exit_requested && !att.early_exit_approved) {
                    const worker = allWorkers?.find(w => w.id === att.worker_id);
                    if (worker && att.check_in_time) {
                        const checkIn = new Date(att.check_in_time);
                        const now = new Date();
                        const hoursWorked = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

                        earlyExits.push({
                            id: att.id,
                            worker_id: att.worker_id,
                            worker_name: worker.name,
                            worker_phone: worker.phone,
                            reason: att.early_exit_reason || 'No reason provided',
                            hours_worked: hoursWorked,
                            check_in_time: att.check_in_time,
                        });
                    }
                }
            });
            setEarlyExitRequests(earlyExits);

            // Calculate real stats
            const present = workersList.filter(w => w.status !== 'offline').length;
            const onField = workersList.filter(w => w.status === 'field').length;
            const tasksCompleted = tasksData?.filter(t => t.status === 'completed').length || 0;
            const tasksPending = tasksData?.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length || 0;

            setStats({
                totalWorkers: totalCount || 0,
                present,
                onField,
                onLeave: leaveWorkerIds.size,
                tasksCompleted,
                tasksPending,
            });

        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    }

    async function approveEarlyExit(attendanceId: string, workerName: string) {
        await supabase.from('attendance').update({
            early_exit_approved: true,
            early_exit_approved_at: new Date().toISOString()
        }).eq('id', attendanceId);

        alert(`✅ Approved! ${workerName} can now leave.`);
        loadDashboardData();
    }

    function callWorker(phone: string) {
        window.open(`tel:${phone}`, '_self');
    }

    function handleLogout() {
        localStorage.removeItem('aakb_device_token');
        router.push('/login');
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative">
                            <Image src="/logo.png" alt="AAKB" fill className="object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-800">Swamiji Dashboard</h1>
                            <p className="text-xs text-gray-500">
                                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500">
                        Logout
                    </button>
                </div>
            </header>

            <main className="px-4 py-6 pb-32">
                {/* Greeting Banner */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg p-6 mb-6 text-white">
                    <h2 className="text-2xl font-bold">🙏 Hari Om</h2>
                    <p className="opacity-90 mt-1">Arsh Adhyayan Kendra - Today's Overview</p>
                    <p className="text-sm opacity-75 mt-2">
                        {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                {/* ⚠️ EARLY EXIT REQUESTS */}
                {earlyExitRequests.length > 0 && (
                    <div className="mb-6 space-y-4">
                        <h3 className="text-lg font-semibold text-orange-700">⚠️ Early Exit Requests ({earlyExitRequests.length})</h3>
                        {earlyExitRequests.map(request => (
                            <div
                                key={request.id}
                                className="bg-orange-50 border-l-4 border-orange-500 rounded-xl p-4 shadow-lg animate-pulse"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-bold text-orange-800">{request.worker_name}</h4>
                                        <p className="text-xs text-gray-500">
                                            Started: {new Date(request.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className="text-sm font-medium text-orange-600">
                                        {request.hours_worked.toFixed(1)} hrs
                                    </span>
                                </div>

                                <p className="text-sm text-gray-700 mb-3">
                                    <span className="font-medium">Reason:</span> {request.reason}
                                </p>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => approveEarlyExit(request.id, request.worker_name)}
                                        className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg shadow"
                                    >
                                        ✅ ALLOW
                                    </button>
                                    <button
                                        onClick={() => callWorker(request.worker_phone)}
                                        className="flex-1 py-2 bg-gray-500 text-white font-bold rounded-lg shadow"
                                    >
                                        📞 CALL
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats Grid - Real Numbers */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                        <p className="text-3xl font-bold text-gray-800">{stats.totalWorkers}</p>
                        <p className="text-xs text-gray-500 mt-1">Total Workers</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.present}</p>
                        <p className="text-xs text-gray-500 mt-1">Present Today</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                        <p className="text-3xl font-bold text-orange-500">{stats.onField}</p>
                        <p className="text-xs text-gray-500 mt-1">On Field</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                        <p className="text-3xl font-bold text-gray-400">{stats.onLeave}</p>
                        <p className="text-xs text-gray-500 mt-1">On Leave</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.tasksCompleted}</p>
                        <p className="text-xs text-gray-500 mt-1">Tasks Done</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                        <p className="text-3xl font-bold text-red-500">{stats.tasksPending}</p>
                        <p className="text-xs text-gray-500 mt-1">Tasks Pending</p>
                    </div>
                </div>

                {/* Workers Status */}
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Workers Status</h3>
                <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                    {workers.length === 0 ? (
                        <p className="p-4 text-gray-400 text-center">No workers found</p>
                    ) : (
                        <div className="divide-y">
                            {workers.map(worker => (
                                <div key={worker.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${worker.status === 'working' ? 'bg-green-500 animate-pulse' :
                                                worker.status === 'field' ? 'bg-orange-500 animate-pulse' :
                                                    worker.status === 'event' ? 'bg-purple-500 animate-pulse' :
                                                        worker.status === 'done' ? 'bg-blue-500' :
                                                            'bg-gray-300'
                                            }`}></div>
                                        <div>
                                            <p className="font-medium text-gray-800">{worker.name}</p>
                                            <p className="text-xs text-gray-400">
                                                {worker.status === 'working' ? 'In Office' :
                                                    worker.status === 'field' ? 'On Field' :
                                                        worker.status === 'event' ? 'Event Duty' :
                                                            worker.status === 'done' ? 'Day Complete' :
                                                                'Not Started'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {worker.check_in_time && (
                                            <p className="text-xs text-gray-400">
                                                {new Date(worker.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                        <button onClick={() => callWorker(worker.phone)} className="p-2 text-gray-400 hover:text-blue-500">
                                            📞
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-orange-100 to-transparent">
                <div className="bg-white rounded-2xl shadow-xl p-4 flex gap-4">
                    <button className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl">
                        📊 Reports
                    </button>
                    <button className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl">
                        📢 Announce
                    </button>
                </div>
            </div>
        </div>
    );
}
