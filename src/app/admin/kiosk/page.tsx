'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function KioskSetupPage() {
    const supabase = createClient();

    const [currentDeviceId, setCurrentDeviceId] = useState('');
    const [registeredDeviceId, setRegisteredDeviceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        // Generate or get device fingerprint
        let deviceId = localStorage.getItem('aakb_device_fingerprint');
        if (!deviceId) {
            deviceId = `KIOSK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('aakb_device_fingerprint', deviceId);
        }
        setCurrentDeviceId(deviceId);

        loadRegisteredDevice();
    }, []);

    async function loadRegisteredDevice() {
        const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'kiosk_device_id')
            .single();

        setRegisteredDeviceId(data?.value || null);
        setLoading(false);
    }

    async function registerThisDevice() {
        try {
            await supabase.from('settings').upsert({
                key: 'kiosk_device_id',
                value: currentDeviceId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

            setRegisteredDeviceId(currentDeviceId);
            showNotification('success', 'This device is now registered as the office kiosk!');
        } catch (error) {
            showNotification('error', 'Failed to register device');
        }
    }

    async function clearRegistration() {
        try {
            await supabase.from('settings').delete().eq('key', 'kiosk_device_id');
            setRegisteredDeviceId(null);
            showNotification('success', 'Kiosk registration cleared. Any device can now be used.');
        } catch (error) {
            showNotification('error', 'Failed to clear registration');
        }
    }

    function showNotification(type: 'success' | 'error', message: string) {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    }

    const isCurrentDeviceRegistered = currentDeviceId === registeredDeviceId;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    }

    return (
        <div className="space-y-6">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {notification.message}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">🖥️ Office Kiosk Setup</h1>
                <p className="text-gray-500">Register this computer as the official attendance kiosk</p>
            </div>

            {/* Current Status */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Status</h2>

                <div className="space-y-4">
                    {/* This Device */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="font-medium text-gray-700">This Device ID</p>
                            <p className="text-sm text-gray-500 font-mono">{currentDeviceId}</p>
                        </div>
                        {isCurrentDeviceRegistered && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                ✅ Registered
                            </span>
                        )}
                    </div>

                    {/* Registered Device */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="font-medium text-gray-700">Registered Kiosk</p>
                            <p className="text-sm text-gray-500 font-mono">
                                {registeredDeviceId || 'No kiosk registered (any device allowed)'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Actions</h2>

                <div className="space-y-4">
                    {!registeredDeviceId && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <p className="text-yellow-700">
                                ⚠️ No kiosk is registered. Workers can start their day from any device.
                            </p>
                        </div>
                    )}

                    {registeredDeviceId && !isCurrentDeviceRegistered && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                            <p className="text-orange-700">
                                🔒 Another device is registered as the kiosk. Workers cannot start their day from this computer.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={registerThisDevice}
                            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg transition"
                        >
                            ✅ Register This Device as Kiosk
                        </button>

                        {registeredDeviceId && (
                            <button
                                onClick={clearRegistration}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                            >
                                🗑️ Clear Registration
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-3">📋 How it Works</h2>
                <ul className="space-y-2 text-blue-700">
                    <li>1. Open this page on the office computer</li>
                    <li>2. Click "Register This Device as Kiosk"</li>
                    <li>3. Workers can only start their day from this computer</li>
                    <li>4. Field/Event modes can still be switched from phones</li>
                </ul>
            </div>
        </div>
    );
}
