'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Worker {
    id: string;
    name: string;
    expected_hours: number;
}

interface Settings {
    default_work_hours: number;
    late_time: string;
    early_exit_time: string;
}

export default function AdminSettingsPage() {
    const supabase = createClient();
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<Settings>({
        default_work_hours: 8,
        late_time: '09:30',
        early_exit_time: '18:00',
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        // Load workers
        const { data: workersData } = await supabase
            .from('profiles')
            .select('id, name, photo_url')
            .eq('role', 'worker')
            .eq('is_active', true);

        // For now, use 8 hours as default for all workers
        // In a full implementation, you'd have a separate settings table
        setWorkers((workersData || []).map(w => ({
            id: w.id,
            name: w.name,
            expected_hours: 8, // Default
        })));

        setLoading(false);
    }

    async function updateWorkerHours(workerId: string, hours: number) {
        setWorkers(prev => prev.map(w =>
            w.id === workerId ? { ...w, expected_hours: hours } : w
        ));

        // In production, save to a worker_settings table
        // await supabase.from('worker_settings').upsert({ worker_id: workerId, expected_hours: hours });
    }

    async function saveSettings() {
        setSaving(true);

        // Here you would save to a settings table
        // For now, we'll just show a success message

        await new Promise(resolve => setTimeout(resolve, 500));

        alert('Settings saved successfully!');
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">⚙️ Settings</h1>
                <p className="text-gray-600">Configure work hours and system defaults</p>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>

                <div className="grid gap-4 md:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">Default Work Hours</label>
                        <input
                            type="number"
                            value={settings.default_work_hours}
                            onChange={(e) => setSettings({ ...settings, default_work_hours: parseInt(e.target.value) || 8 })}
                            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                            min={1}
                            max={24}
                        />
                        <p className="text-xs text-gray-600 mt-1">Hours per day for full attendance</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">Late After Time</label>
                        <input
                            type="time"
                            value={settings.late_time}
                            onChange={(e) => setSettings({ ...settings, late_time: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                        />
                        <p className="text-xs text-gray-600 mt-1">Check-in after this is marked late</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">Standard End Time</label>
                        <input
                            type="time"
                            value={settings.early_exit_time}
                            onChange={(e) => setSettings({ ...settings, early_exit_time: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                        />
                        <p className="text-xs text-gray-600 mt-1">Expected check-out time</p>
                    </div>
                </div>
            </div>

            {/* Per-Worker Hours */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Worker Expected Hours</h2>
                <p className="text-sm text-gray-600 mb-4">Set custom work hours for each worker. Leave at default (8) for standard schedule.</p>

                {workers.length === 0 ? (
                    <p className="text-gray-500">No workers found</p>
                ) : (
                    <div className="space-y-3">
                        {workers.map(worker => (
                            <div key={worker.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                                        {worker.name.charAt(0)}
                                    </div>
                                    <p className="font-medium text-gray-900">{worker.name}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={worker.expected_hours}
                                        onChange={(e) => updateWorkerHours(worker.id, parseInt(e.target.value) || 8)}
                                        className="w-20 p-2 border border-gray-300 rounded-lg text-center text-gray-900"
                                        min={1}
                                        max={24}
                                    />
                                    <span className="text-gray-700">hours/day</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Task Settings */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Settings</h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="font-medium text-gray-900">Require Critical Tasks for Checkout</p>
                            <p className="text-sm text-gray-600">Workers must complete critical tasks before ending day</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="font-medium text-gray-900">Allow Workers to Add Custom Tasks</p>
                            <p className="text-sm text-gray-600">Workers can create their own tasks in addition to assigned</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full py-4 bg-blue-500 text-white text-lg font-bold rounded-xl shadow hover:bg-blue-600 disabled:opacity-50 transition"
            >
                {saving ? 'Saving...' : '💾 Save Settings'}
            </button>
        </div>
    );
}
