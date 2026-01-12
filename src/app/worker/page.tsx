'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

interface WorkerProfile {
    id: string;
    name: string;
}

type WorkerState = 'NOT_STARTED' | 'WORKING' | 'FIELD_MODE' | 'EVENT_MODE' | 'ENDED';

export default function WorkerDashboard() {
    const router = useRouter();
    const supabase = createClient();

    const [worker, setWorker] = useState<WorkerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [attendanceId, setAttendanceId] = useState<string | null>(null);
    const [workState, setWorkState] = useState<WorkerState>('NOT_STARTED');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isLate, setIsLate] = useState(false);
    const [earlyExitRequested, setEarlyExitRequested] = useState(false);
    const [earlyExitApproved, setEarlyExitApproved] = useState(false);
    const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, overdue: 0 });

    // Kiosk Check
    const [isKioskDevice, setIsKioskDevice] = useState(true);
    const [kioskError, setKioskError] = useState('');

    // Modals
    const [showEarlyExitModal, setShowEarlyExitModal] = useState(false);
    const [earlyExitReason, setEarlyExitReason] = useState('');
    const [showEndDayModal, setShowEndDayModal] = useState(false);
    const [endDayMessage, setEndDayMessage] = useState('');

    useEffect(() => {
        loadWorkerData();
        checkKioskDevice();
    }, []);

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (workState !== 'NOT_STARTED' && workState !== 'ENDED' && startTime) {
            interval = setInterval(() => {
                setElapsedSeconds(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [workState, startTime]);

    // Poll for approval
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (earlyExitRequested && !earlyExitApproved && attendanceId) {
            interval = setInterval(async () => {
                const { data } = await supabase.from('attendance').select('early_exit_approved').eq('id', attendanceId).single();
                if (data?.early_exit_approved) setEarlyExitApproved(true);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [earlyExitRequested, earlyExitApproved, attendanceId]);

    // Check late
    useEffect(() => {
        const now = new Date();
        const lateTime = new Date();
        lateTime.setHours(9, 30, 0, 0);
        setIsLate(now > lateTime && workState === 'NOT_STARTED');
    }, [workState]);

    async function checkKioskDevice() {
        // Get this device's fingerprint
        let deviceId = localStorage.getItem('aakb_device_fingerprint');
        if (!deviceId) {
            deviceId = `KIOSK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('aakb_device_fingerprint', deviceId);
        }

        // Check if there's a registered kiosk
        const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'kiosk_device_id')
            .single();

        if (data?.value) {
            // There's a registered kiosk - check if this is it
            if (data.value !== deviceId) {
                setIsKioskDevice(false);
                setKioskError('You can only start your day from the office kiosk computer.');
            }
        }
        // If no kiosk registered, allow from any device
    }

    async function loadWorkerData() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) { router.push('/login'); return; }

        try {
            const { data, error } = await supabase.from('profiles').select('id, name, role').eq('device_token', token).single();
            if (error || !data || data.role !== 'worker') { router.push('/login'); return; }

            setWorker(data);
            const today = new Date().toISOString().split('T')[0];

            // Load tasks including overdue check
            const { data: tasks } = await supabase.from('tasks').select('status, due_date').eq('assigned_to', data.id);
            const overdue = tasks?.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today).length || 0;
            setTaskStats({
                total: tasks?.length || 0,
                completed: tasks?.filter(t => t.status === 'completed').length || 0,
                overdue
            });

            // Load attendance
            const { data: attendance } = await supabase.from('attendance').select('*').eq('worker_id', data.id).eq('date', today).single();

            if (attendance) {
                setAttendanceId(attendance.id);
                setEarlyExitRequested(attendance.early_exit_requested || false);
                setEarlyExitApproved(attendance.early_exit_approved || false);

                if (attendance.check_in_time && !attendance.check_out_time) {
                    setStartTime(new Date(attendance.check_in_time));
                    setWorkState(attendance.status === 'field' ? 'FIELD_MODE' : attendance.status === 'event' ? 'EVENT_MODE' : 'WORKING');
                } else if (attendance.check_out_time) {
                    setWorkState('ENDED');
                    const checkIn = new Date(attendance.check_in_time);
                    const checkOut = new Date(attendance.check_out_time);
                    setElapsedSeconds(Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000));
                }
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleStartDay() {
        if (!worker) return;

        // Check kiosk before starting
        if (!isKioskDevice) {
            alert('❌ ' + kioskError);
            return;
        }

        const now = new Date();
        setStartTime(now);
        setWorkState('WORKING');

        const today = now.toISOString().split('T')[0];
        const { data } = await supabase.from('attendance').upsert({
            worker_id: worker.id,
            date: today,
            check_in_time: now.toISOString(),
            status: isLate ? 'late' : 'present',
        }, { onConflict: 'worker_id,date' }).select().single();
        if (data) setAttendanceId(data.id);
    }

    async function handleModeChange(mode: 'WORKING' | 'FIELD_MODE' | 'EVENT_MODE') {
        setWorkState(mode);
        if (attendanceId) {
            await supabase.from('attendance').update({
                status: mode === 'FIELD_MODE' ? 'field' : mode === 'EVENT_MODE' ? 'event' : 'present'
            }).eq('id', attendanceId);
        }
    }

    async function requestEarlyExit() {
        if (!earlyExitReason.trim() || !attendanceId) return;
        await supabase.from('attendance').update({ early_exit_requested: true, early_exit_reason: earlyExitReason }).eq('id', attendanceId);
        setEarlyExitRequested(true);
        setShowEarlyExitModal(false);
        const msg = `🙏 Hari Om Swamiji. ${worker?.name} needs to leave early.\n\nReason: ${earlyExitReason}\n\nPlease approve in AAKB app.`;
        window.open(`https://wa.me/919999999999?text=${encodeURIComponent(msg)}`, '_blank');
    }

    function handleEndDayClick() {
        const hoursWorked = elapsedSeconds / 3600;
        if (hoursWorked < 8 && !earlyExitApproved) {
            setEndDayMessage(`⚠️ You have only worked ${formatTime(elapsedSeconds)}. This will be marked as UNDERTIME.`);
            setShowEndDayModal(true);
            return;
        }
        confirmEndDay();
    }

    async function confirmEndDay() {
        if (!attendanceId) return;
        const now = new Date();
        const hoursWorked = elapsedSeconds / 3600;
        let finalStatus = 'completed';
        if (hoursWorked < 8) finalStatus = earlyExitApproved ? 'early_approved' : 'undertime';
        else if (hoursWorked > 10) finalStatus = 'overtime';

        await supabase.from('attendance').update({ check_out_time: now.toISOString(), status: finalStatus }).eq('id', attendanceId);
        setWorkState('ENDED');
        setShowEndDayModal(false);
    }

    function formatTime(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function getEndButtonStyle() {
        const h = elapsedSeconds / 3600;
        if (earlyExitApproved) return 'from-blue-500 to-blue-600';
        if (h >= 8) return 'from-green-500 to-emerald-500';
        return 'from-red-500 to-rose-500';
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">🙏 Hari Om, {worker?.name?.split(' ')[0]}</h1>
                <p className="text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>

            {/* NOT STARTED */}
            {workState === 'NOT_STARTED' && (
                <div className="space-y-6">
                    {isLate && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-red-600 font-medium">⚠️ You are starting late. Please inform Swamiji.</p>
                        </div>
                    )}

                    {!isKioskDevice && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <p className="text-orange-700 font-medium">🖥️ {kioskError}</p>
                            <p className="text-sm text-orange-600 mt-1">Please go to the office desktop to start your day.</p>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center text-4xl">🙏</div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Ready to Start?</h2>
                        <p className="text-gray-500 text-sm mb-6">Tap below to begin your day</p>
                        <button
                            onClick={handleStartDay}
                            disabled={!isKioskDevice}
                            className={`w-full py-4 text-white text-xl font-bold rounded-2xl shadow-lg active:scale-95 transition ${isKioskDevice
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : 'bg-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isKioskDevice ? '▶️ START DAY' : '🔒 Go to Office Kiosk'}
                        </button>
                    </div>
                </div>
            )}

            {/* WORKING */}
            {(workState === 'WORKING' || workState === 'FIELD_MODE' || workState === 'EVENT_MODE') && (
                <div className="space-y-6">
                    {earlyExitRequested && !earlyExitApproved && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 animate-pulse">
                            <p className="text-yellow-700 font-medium">⏳ Waiting for Swamiji's approval...</p>
                        </div>
                    )}
                    {earlyExitApproved && (
                        <div className="bg-blue-50 border border-blue-300 rounded-xl p-4">
                            <p className="text-blue-700 font-medium">✅ Early exit approved. You may leave.</p>
                        </div>
                    )}

                    {/* Timer */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full animate-pulse ${workState === 'FIELD_MODE' ? 'bg-orange-500' : workState === 'EVENT_MODE' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                                <span className="text-sm text-gray-500">{workState === 'FIELD_MODE' ? 'On Field' : workState === 'EVENT_MODE' ? 'Event Duty' : 'In Office'}</span>
                            </div>
                            {workState !== 'EVENT_MODE' && <span className="text-xs text-gray-400">Target: 8:00 Hours</span>}
                        </div>
                        <div className="text-center mb-4">
                            <p className="text-4xl font-mono font-bold text-gray-800">{formatTime(elapsedSeconds)}</p>
                            <p className="text-sm text-gray-500 mt-1">Hours Worked</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className={`h-full transition-all ${elapsedSeconds / 3600 >= 8 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`} style={{ width: `${Math.min((elapsedSeconds / (8 * 3600)) * 100, 100)}%` }}></div>
                        </div>
                    </div>

                    {/* Mode Toggles */}
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleModeChange(workState === 'FIELD_MODE' ? 'WORKING' : 'FIELD_MODE')} className={`p-4 rounded-xl font-semibold transition ${workState === 'FIELD_MODE' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 shadow'}`}>🛵 Field Mode</button>
                        <button onClick={() => handleModeChange(workState === 'EVENT_MODE' ? 'WORKING' : 'EVENT_MODE')} className={`p-4 rounded-xl font-semibold transition ${workState === 'EVENT_MODE' ? 'bg-purple-500 text-white' : 'bg-white text-gray-700 shadow'}`}>📷 Event Duty</button>
                    </div>

                    {/* Quick Links */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/worker/tasks" className={`rounded-xl p-4 shadow flex items-center gap-3 ${taskStats.overdue > 0 ? 'bg-red-50 border-2 border-red-400' : 'bg-white'}`}>
                            <span className="text-2xl">📋</span>
                            <div>
                                <p className={`font-medium ${taskStats.overdue > 0 ? 'text-red-700' : 'text-gray-800'}`}>
                                    My Tasks {taskStats.overdue > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded ml-1">{taskStats.overdue} OVERDUE</span>}
                                </p>
                                <p className="text-xs text-gray-500">{taskStats.completed}/{taskStats.total} done</p>
                            </div>
                        </Link>
                        <Link href="/worker/history" className="bg-white rounded-xl p-4 shadow flex items-center gap-3">
                            <span className="text-2xl">📅</span>
                            <div>
                                <p className="font-medium text-gray-800">History</p>
                                <p className="text-xs text-gray-500">View attendance</p>
                            </div>
                        </Link>
                    </div>

                    {/* Early Exit */}
                    {elapsedSeconds / 3600 < 8 && !earlyExitRequested && (
                        <button onClick={() => setShowEarlyExitModal(true)} className="w-full py-3 text-orange-600 font-medium underline">Request Permission to Leave Early</button>
                    )}

                    {/* End Day */}
                    <button onClick={handleEndDayClick} className={`w-full py-4 bg-gradient-to-r ${getEndButtonStyle()} text-white text-xl font-bold rounded-2xl shadow-lg active:scale-95 transition`}>
                        {earlyExitApproved ? '✅ END DAY (APPROVED)' : elapsedSeconds / 3600 >= 8 ? '✓ END DAY' : '⚠️ END DAY (UNDERTIME)'}
                    </button>
                </div>
            )}

            {/* ENDED */}
            {workState === 'ENDED' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center text-4xl">✅</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Day Complete!</h2>
                        <p className="text-gray-500 mb-2">Hari Om 🙏</p>
                        <p className="text-lg font-semibold text-green-600">Worked: {formatTime(elapsedSeconds)}</p>
                        {earlyExitApproved && <p className="text-sm text-blue-500 mt-2">✓ Early exit was approved</p>}
                    </div>

                    {/* Quick Links still available after day ends */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/worker/tasks" className="bg-white rounded-xl p-4 shadow flex items-center gap-3">
                            <span className="text-2xl">📋</span>
                            <div>
                                <p className="font-medium text-gray-800">My Tasks</p>
                                <p className="text-xs text-gray-500">Update tasks</p>
                            </div>
                        </Link>
                        <Link href="/worker/history" className="bg-white rounded-xl p-4 shadow flex items-center gap-3">
                            <span className="text-2xl">📅</span>
                            <div>
                                <p className="font-medium text-gray-800">History</p>
                                <p className="text-xs text-gray-500">View records</p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            {/* Early Exit Modal */}
            {showEarlyExitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Request Early Exit</h3>
                        <textarea value={earlyExitReason} onChange={(e) => setEarlyExitReason(e.target.value)} placeholder="Why do you need to leave early?" className="w-full p-3 border border-gray-200 rounded-xl mb-4 min-h-[100px] text-gray-900" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowEarlyExitModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                            <button onClick={requestEarlyExit} className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl">Send Request</button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Day Modal */}
            {showEndDayModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <p className="text-gray-700 whitespace-pre-line mb-6">{endDayMessage}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowEndDayModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                            <button onClick={confirmEndDay} className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
