'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Holiday {
    id: string;
    date: string;
    name: string;
    holiday_type: string;
}

interface MyHoliday {
    id: string;
    date: string;
    holiday_type: string;
    reason: string;
    status: string;
}

export default function WorkerHolidaysPage() {
    const supabase = createClient();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [systemHolidays, setSystemHolidays] = useState<Holiday[]>([]);
    const [myHolidays, setMyHolidays] = useState<MyHoliday[]>([]);
    const [settings, setSettings] = useState({
        monthly_holidays_allowed: 4,
        sunday_half_day: true,
        sunday_end_time: '13:00'
    });
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [newRequest, setNewRequest] = useState({
        date: new Date().toISOString().split('T')[0],
        holiday_type: 'full',
        reason: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('device_token', token)
            .single();

        if (!profile) return;
        setWorkerId(profile.id);

        // Load system holidays
        const { data: holidays } = await supabase
            .from('holidays')
            .select('*')
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true });
        setSystemHolidays(holidays || []);

        // Load my holiday requests
        const { data: myData } = await supabase
            .from('worker_holidays')
            .select('*')
            .eq('worker_id', profile.id)
            .order('date', { ascending: false });
        setMyHolidays(myData || []);

        // Load settings
        const { data: settingsData } = await supabase
            .from('holiday_settings')
            .select('*');

        if (settingsData) {
            const settingsMap: Record<string, string> = {};
            settingsData.forEach((s: { setting_key: string; setting_value: string }) => {
                settingsMap[s.setting_key] = s.setting_value;
            });
            setSettings({
                monthly_holidays_allowed: parseInt(settingsMap.monthly_holidays_allowed) || 4,
                sunday_half_day: settingsMap.sunday_half_day === 'true',
                sunday_end_time: settingsMap.sunday_end_time || '13:00'
            });
        }

        setLoading(false);
    }

    async function requestHoliday() {
        if (!workerId) return;

        // Check if already requested for this date
        const existing = myHolidays.find(h => h.date === newRequest.date);
        if (existing) {
            alert('You already have a request for this date');
            return;
        }

        // Check monthly limit
        const thisMonth = new Date().toISOString().slice(0, 7);
        const thisMonthRequests = myHolidays.filter(h =>
            h.date.startsWith(thisMonth) && h.status !== 'rejected'
        ).length;

        if (thisMonthRequests >= settings.monthly_holidays_allowed) {
            alert(`You can only request ${settings.monthly_holidays_allowed} holidays per month`);
            return;
        }

        await supabase.from('worker_holidays').insert({
            worker_id: workerId,
            date: newRequest.date,
            holiday_type: newRequest.holiday_type,
            reason: newRequest.reason,
            status: 'pending'
        });

        setShowRequestModal(false);
        setNewRequest({
            date: new Date().toISOString().split('T')[0],
            holiday_type: 'full',
            reason: ''
        });
        loadData();
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    const thisMonth = new Date().toISOString().slice(0, 7);
    const usedThisMonth = myHolidays.filter(h =>
        h.date.startsWith(thisMonth) && h.status !== 'rejected'
    ).length;
    const remainingThisMonth = settings.monthly_holidays_allowed - usedThisMonth;

    const pendingCount = myHolidays.filter(h => h.status === 'pending').length;
    const approvedCount = myHolidays.filter(h => h.status === 'approved').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🗓️ My Holidays</h1>
                    <p className="text-gray-500">Request offs and view holidays</p>
                </div>
                <button
                    onClick={() => setShowRequestModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium"
                >
                    + Request Off
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-blue-500">{remainingThisMonth}</p>
                    <p className="text-xs text-gray-500">Left This Month</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-green-500">{approvedCount}</p>
                    <p className="text-xs text-gray-500">Approved</p>
                </div>
            </div>

            {/* Sunday Info */}
            {settings.sunday_half_day && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-700 font-medium">☀️ Sunday Half Day</p>
                    <p className="text-sm text-blue-600">Every Sunday you work till {settings.sunday_end_time} only</p>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : (
                <>
                    {/* Upcoming System Holidays */}
                    {systemHolidays.length > 0 && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">🎉 Upcoming Holidays</h3>
                            <div className="bg-white rounded-xl shadow divide-y">
                                {systemHolidays.slice(0, 5).map(h => (
                                    <div key={h.id} className="p-3 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{h.name}</p>
                                            <p className="text-sm text-gray-500">{formatDate(h.date)}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${h.holiday_type === 'half' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {h.holiday_type === 'half' ? 'Half Day' : 'Full Day'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* My Requests */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">📋 My Requests</h3>
                        {myHolidays.length === 0 ? (
                            <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                                No holiday requests yet
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {myHolidays.map(h => (
                                    <div key={h.id} className="bg-white rounded-xl shadow p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{formatDate(h.date)}</p>
                                                <p className="text-sm text-gray-500">
                                                    {h.holiday_type === 'half' ? 'Half Day' : 'Full Day'}
                                                    {h.reason && ` - ${h.reason}`}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded font-medium ${h.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    h.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {h.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">📅 Request Holiday</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={newRequest.date}
                                    onChange={(e) => setNewRequest({ ...newRequest, date: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Type</label>
                                <select
                                    value={newRequest.holiday_type}
                                    onChange={(e) => setNewRequest({ ...newRequest, holiday_type: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                >
                                    <option value="full">Full Day Off</option>
                                    <option value="half">Half Day Off</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Reason (Optional)</label>
                                <textarea
                                    value={newRequest.reason}
                                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 min-h-[80px]"
                                    placeholder="Why do you need this day off?"
                                />
                            </div>

                            <p className="text-sm text-gray-500">
                                📊 You have {remainingThisMonth} holidays remaining this month
                            </p>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowRequestModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">
                                Cancel
                            </button>
                            <button onClick={requestHoliday} className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl">
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
