'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminSettingsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentDeviceId, setCurrentDeviceId] = useState('');
    const [registeredDeviceId, setRegisteredDeviceId] = useState('');
    const [settings, setSettings] = useState({
        default_work_hours: 8,
        late_time: '09:30',
        require_kiosk: true,
    });

    useEffect(() => {
        loadSettings();
        generateDeviceId();
    }, []);

    function generateDeviceId() {
        // Generate a unique device fingerprint
        let deviceId = localStorage.getItem('aakb_device_fingerprint');
        if (!deviceId) {
            deviceId = `KIOSK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('aakb_device_fingerprint', deviceId);
        }
        setCurrentDeviceId(deviceId);
    }

    async function loadSettings() {
        // Try to get existing kiosk registration
        const { data } = await supabase
            .from('settings')
            .select('*')
            .eq('key', 'kiosk_device_id')
            .single();

        if (data?.value) {
            setRegisteredDeviceId(data.value);
        }
        setLoading(false);
    }

    async function registerThisDevice() {
        setSaving(true);

        // Save this device as the kiosk
        await supabase.from('settings').upsert({
            key: 'kiosk_device_id',
            value: currentDeviceId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        setRegisteredDeviceId(currentDeviceId);
        setSaving(false);
        alert('✅ This desktop is now registered as the attendance kiosk!');
    }

    async function removeKiosk() {
        setSaving(true);
        await supabase.from('settings').delete().eq('key', 'kiosk_device_id');
        setRegisteredDeviceId('');
        setSaving(false);
        alert('Kiosk registration removed. Workers can start from any device.');
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const isThisDeviceRegistered = currentDeviceId === registeredDeviceId;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">⚙️ Settings</h1>
                <p className="text-gray-600">Configure system settings</p>
            </div>

            {/* Kiosk Registration */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">🖥️ Attendance Kiosk Setup</h2>
                <p className="text-gray-600 mb-4">
                    Workers can only start their day from the registered kiosk desktop. This ensures they are physically present at the ashram.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">This Device ID:</p>
                    <p className="font-mono text-sm text-gray-900 bg-white px-3 py-2 rounded border">{currentDeviceId}</p>
                </div>

                {registeredDeviceId ? (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl ${isThisDeviceRegistered ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                            {isThisDeviceRegistered ? (
                                <p className="text-green-700 font-medium">✅ This is the registered attendance kiosk</p>
                            ) : (
                                <div>
                                    <p className="text-orange-700 font-medium">⚠️ Another device is registered as kiosk</p>
                                    <p className="text-sm text-orange-600 mt-1">Registered: {registeredDeviceId}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {!isThisDeviceRegistered && (
                                <button
                                    onClick={registerThisDevice}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
                                >
                                    Replace with This Device
                                </button>
                            )}
                            <button
                                onClick={removeKiosk}
                                disabled={saving}
                                className="flex-1 py-3 bg-red-100 text-red-700 font-semibold rounded-xl disabled:opacity-50"
                            >
                                Remove Kiosk Restriction
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={registerThisDevice}
                        disabled={saving}
                        className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50"
                    >
                        {saving ? 'Registering...' : '🖥️ Register This Desktop as Attendance Kiosk'}
                    </button>
                )}
            </div>

            {/* Work Hours Settings */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">⏰ Work Hours</h2>

                <div className="grid gap-4 md:grid-cols-2">
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
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">Late After Time</label>
                        <input
                            type="time"
                            value={settings.late_time}
                            onChange={(e) => setSettings({ ...settings, late_time: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                        />
                    </div>
                </div>
            </div>

            {/* How It Works */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-800 mb-2">ℹ️ How Kiosk Mode Works</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Workers can <strong>login from any device</strong> to view tasks and history</li>
                    <li>• But <strong>"Start Day" only works</strong> on the registered kiosk</li>
                    <li>• After starting, they can continue from their mobile/other devices</li>
                    <li>• This ensures workers are physically present at the ashram to check in</li>
                </ul>
            </div>
        </div>
    );
}
