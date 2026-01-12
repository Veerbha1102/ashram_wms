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
        emergency_contact: '',
    });

    useEffect(() => {
        loadSettings();
        generateDeviceId();
    }, []);

    function generateDeviceId() {
        let deviceId = localStorage.getItem('aakb_device_fingerprint');
        if (!deviceId) {
            deviceId = `KIOSK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('aakb_device_fingerprint', deviceId);
        }
        setCurrentDeviceId(deviceId);
    }

    async function loadSettings() {
        // Load kiosk registration
        const { data: kioskData } = await supabase
            .from('settings')
            .select('*')
            .eq('key', 'kiosk_device_id')
            .single();

        if (kioskData?.value) {
            setRegisteredDeviceId(kioskData.value);
        }

        // Load emergency contact
        const { data: contactData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'emergency_contact')
            .single();

        if (contactData?.value) {
            setSettings(s => ({ ...s, emergency_contact: contactData.value }));
        }

        // Load late time
        const { data: lateData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'late_time')
            .single();

        if (lateData?.value) {
            setSettings(s => ({ ...s, late_time: lateData.value }));
        }

        setLoading(false);
    }

    async function registerThisDevice() {
        setSaving(true);
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

    async function saveSettings() {
        setSaving(true);

        // Save emergency contact
        await supabase.from('settings').upsert({
            key: 'emergency_contact',
            value: settings.emergency_contact,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        // Save late time
        await supabase.from('settings').upsert({
            key: 'late_time',
            value: settings.late_time,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        setSaving(false);
        alert('✅ Settings saved!');
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

            {/* Emergency Contact */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">📞 Emergency Contact</h2>
                <p className="text-gray-600 mb-4">
                    This phone number will be used for "Call Now" and "WhatsApp" buttons in Swamiji dashboard when worker is late.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">Phone Number</label>
                        <input
                            type="tel"
                            value={settings.emergency_contact}
                            onChange={(e) => setSettings({ ...settings, emergency_contact: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                            placeholder="e.g., 9876543210"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={saveSettings}
                            disabled={saving}
                            className="px-6 py-3 bg-green-500 text-white font-semibold rounded-xl disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : '💾 Save Contact'}
                        </button>
                    </div>
                </div>

                {settings.emergency_contact && (
                    <div className="mt-4 flex gap-2">
                        <a
                            href={`tel:${settings.emergency_contact}`}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
                        >
                            📞 Test Call
                        </a>
                        <a
                            href={`https://wa.me/91${settings.emergency_contact.replace(/\D/g, '')}`}
                            target="_blank"
                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm"
                        >
                            💬 Test WhatsApp
                        </a>
                    </div>
                )}
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

                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="mt-4 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                    {saving ? 'Saving...' : '💾 Save Settings'}
                </button>
            </div>

            {/* How It Works */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-800 mb-2">ℹ️ How Kiosk Mode Works</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Workers can <strong>login from any device</strong> to view tasks, request leave, and view history</li>
                    <li>• But <strong>"Start Day" only works</strong> on the registered kiosk</li>
                    <li>• After starting, they can continue from their mobile/other devices</li>
                    <li>• This ensures workers are physically present at the ashram to check in</li>
                </ul>
            </div>
        </div>
    );
}
