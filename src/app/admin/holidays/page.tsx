'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Holiday {
    id: string;
    date: string;
    name: string;
    holiday_type: string;
    half_day_end_time: string;
    is_recurring: boolean;
}

interface WorkerHoliday {
    id: string;
    worker_id: string;
    worker_name: string;
    date: string;
    holiday_type: string;
    reason: string;
    status: string;
}

export default function AdminHolidaysPage() {
    const supabase = createClient();
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [workerHolidays, setWorkerHolidays] = useState<WorkerHoliday[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'system' | 'requests' | 'settings'>('system');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newHoliday, setNewHoliday] = useState({
        date: new Date().toISOString().split('T')[0],
        name: '',
        holiday_type: 'full',
        half_day_end_time: '13:00',
        is_recurring: false
    });
    const [settings, setSettings] = useState({
        sunday_half_day: true,
        sunday_end_time: '13:00',
        monthly_holidays_allowed: 4,
        allow_consecutive_holidays: false
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);

        // Load system holidays
        const { data: holidaysData } = await supabase
            .from('holidays')
            .select('*')
            .order('date', { ascending: true });
        setHolidays(holidaysData || []);

        // Load worker holiday requests
        const { data: workers } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('role', 'worker');

        const { data: workerHolidaysData } = await supabase
            .from('worker_holidays')
            .select('*')
            .order('date', { ascending: false });

        setWorkerHolidays((workerHolidaysData || []).map(h => ({
            ...h,
            worker_name: workers?.find(w => w.id === h.worker_id)?.name || 'Unknown'
        })));

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
                sunday_half_day: settingsMap.sunday_half_day === 'true',
                sunday_end_time: settingsMap.sunday_end_time || '13:00',
                monthly_holidays_allowed: parseInt(settingsMap.monthly_holidays_allowed) || 4,
                allow_consecutive_holidays: settingsMap.allow_consecutive_holidays === 'true'
            });
        }

        setLoading(false);
    }

    async function addHoliday() {
        if (!newHoliday.name.trim()) {
            alert('Please enter a holiday name');
            return;
        }

        await supabase.from('holidays').insert({
            date: newHoliday.date,
            name: newHoliday.name,
            holiday_type: newHoliday.holiday_type,
            half_day_end_time: newHoliday.holiday_type === 'half' ? newHoliday.half_day_end_time : null,
            is_recurring: newHoliday.is_recurring
        });

        setShowAddModal(false);
        setNewHoliday({
            date: new Date().toISOString().split('T')[0],
            name: '',
            holiday_type: 'full',
            half_day_end_time: '13:00',
            is_recurring: false
        });
        loadData();
    }

    async function deleteHoliday(id: string) {
        if (!confirm('Delete this holiday?')) return;
        await supabase.from('holidays').delete().eq('id', id);
        loadData();
    }

    async function updateWorkerHoliday(id: string, status: 'approved' | 'rejected') {
        await supabase.from('worker_holidays').update({
            status,
            approved_at: new Date().toISOString()
        }).eq('id', id);
        loadData();
    }

    async function saveSettings() {
        const updates = [
            { setting_key: 'sunday_half_day', setting_value: settings.sunday_half_day.toString() },
            { setting_key: 'sunday_end_time', setting_value: settings.sunday_end_time },
            { setting_key: 'monthly_holidays_allowed', setting_value: settings.monthly_holidays_allowed.toString() },
            { setting_key: 'allow_consecutive_holidays', setting_value: settings.allow_consecutive_holidays.toString() }
        ];

        for (const update of updates) {
            await supabase.from('holiday_settings').upsert(update, { onConflict: 'setting_key' });
        }

        alert('✅ Settings saved!');
    }

    const pendingRequests = workerHolidays.filter(h => h.status === 'pending').length;

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">🗓️ Holiday Management</h1>
                <p className="text-gray-600">Configure holidays and manage worker offs</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap ${activeTab === 'system' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
                        }`}
                >
                    📅 System Holidays
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap relative ${activeTab === 'requests' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
                        }`}
                >
                    🙋 Worker Requests
                    {pendingRequests > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                            {pendingRequests}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap ${activeTab === 'settings' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
                        }`}
                >
                    ⚙️ Settings
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : (
                <>
                    {/* System Holidays Tab */}
                    {activeTab === 'system' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium"
                            >
                                + Add Holiday
                            </button>

                            <div className="bg-white rounded-xl shadow divide-y">
                                {holidays.length === 0 ? (
                                    <p className="p-8 text-center text-gray-500">No holidays configured</p>
                                ) : (
                                    holidays.map(h => (
                                        <div key={h.id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{h.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(h.date)}
                                                    {h.holiday_type === 'half' && ` (Half day till ${h.half_day_end_time})`}
                                                    {h.is_recurring && ' 🔄'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => deleteHoliday(h.id)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Worker Requests Tab */}
                    {activeTab === 'requests' && (
                        <div className="space-y-3">
                            {workerHolidays.length === 0 ? (
                                <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                                    No holiday requests
                                </div>
                            ) : (
                                workerHolidays.map(h => (
                                    <div key={h.id} className="bg-white rounded-xl shadow p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{h.worker_name}</p>
                                                <p className="text-sm text-gray-600">
                                                    {formatDate(h.date)} - {h.holiday_type === 'half' ? 'Half Day' : 'Full Day'}
                                                </p>
                                                {h.reason && <p className="text-sm text-gray-500 mt-1">"{h.reason}"</p>}
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded font-medium ${h.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    h.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {h.status.toUpperCase()}
                                            </span>
                                        </div>
                                        {h.status === 'pending' && (
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => updateWorkerHoliday(h.id, 'approved')}
                                                    className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium"
                                                >
                                                    ✅ Approve
                                                </button>
                                                <button
                                                    onClick={() => updateWorkerHoliday(h.id, 'rejected')}
                                                    className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium"
                                                >
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="bg-white rounded-xl shadow p-6 space-y-6">
                            <h3 className="font-bold text-gray-900">Holiday Rules</h3>

                            {/* Sunday Half Day */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-medium text-gray-900">Sunday Half Day</p>
                                    <p className="text-sm text-gray-500">Workers work only till specified time on Sundays</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.sunday_half_day}
                                        onChange={(e) => setSettings({ ...settings, sunday_half_day: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                </label>
                            </div>

                            {settings.sunday_half_day && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-2">Sunday Work Ends At</label>
                                    <input
                                        type="time"
                                        value={settings.sunday_end_time}
                                        onChange={(e) => setSettings({ ...settings, sunday_end_time: e.target.value })}
                                        className="p-3 border border-gray-300 rounded-xl text-gray-900"
                                    />
                                </div>
                            )}

                            {/* Monthly Holidays */}
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Monthly Off Days Allowed</label>
                                <input
                                    type="number"
                                    value={settings.monthly_holidays_allowed}
                                    onChange={(e) => setSettings({ ...settings, monthly_holidays_allowed: parseInt(e.target.value) || 0 })}
                                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                    min={0}
                                    max={15}
                                />
                                <p className="text-xs text-gray-500 mt-1">Workers can request this many off days per month</p>
                            </div>

                            {/* Consecutive Holidays */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-medium text-gray-900">Allow Consecutive Holidays</p>
                                    <p className="text-sm text-gray-500">Workers can take 2+ days off in a row</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.allow_consecutive_holidays}
                                        onChange={(e) => setSettings({ ...settings, allow_consecutive_holidays: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                </label>
                            </div>

                            <button
                                onClick={saveSettings}
                                className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl"
                            >
                                💾 Save Settings
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Add Holiday Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Add Holiday</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={newHoliday.date}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Holiday Name</label>
                                <input
                                    value={newHoliday.name}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                    placeholder="e.g., Diwali, Holi..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Type</label>
                                <select
                                    value={newHoliday.holiday_type}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, holiday_type: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                >
                                    <option value="full">Full Day Off</option>
                                    <option value="half">Half Day (Work till specific time)</option>
                                </select>
                            </div>

                            {newHoliday.holiday_type === 'half' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-2">Work Ends At</label>
                                    <input
                                        type="time"
                                        value={newHoliday.half_day_end_time}
                                        onChange={(e) => setNewHoliday({ ...newHoliday, half_day_end_time: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                    />
                                </div>
                            )}

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newHoliday.is_recurring}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, is_recurring: e.target.checked })}
                                    className="w-5 h-5"
                                />
                                <span className="text-gray-700">Repeat every year</span>
                            </label>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">
                                Cancel
                            </button>
                            <button onClick={addHoliday} className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl">
                                Add Holiday
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
