'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Profile {
    id: string;
    name: string;
    phone: string;
    role: string;
    created_at: string;
}

interface Stats {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    avgHours: number;
    tasksCompleted: number;
}

export default function WorkerProfilePage() {
    const supabase = createClient();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [stats, setStats] = useState<Stats>({ totalDays: 0, presentDays: 0, lateDays: 0, avgHours: 0, tasksCompleted: 0 });
    const [loading, setLoading] = useState(true);
    const [editingPin, setEditingPin] = useState(false);
    const [newPin, setNewPin] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) return;

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('device_token', token)
            .single();

        if (profileData) {
            setProfile(profileData);

            // Load attendance stats
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: attendance } = await supabase
                .from('attendance')
                .select('*')
                .eq('worker_id', profileData.id)
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

            const presentDays = attendance?.filter(a => a.status !== 'absent').length || 0;
            const lateDays = attendance?.filter(a => a.status === 'late').length || 0;

            let totalHours = 0;
            attendance?.forEach(a => {
                if (a.check_in_time && a.check_out_time) {
                    totalHours += (new Date(a.check_out_time).getTime() - new Date(a.check_in_time).getTime()) / (1000 * 60 * 60);
                }
            });

            // Load tasks completed
            const { count: tasksCompleted } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', profileData.id)
                .eq('status', 'completed');

            setStats({
                totalDays: attendance?.length || 0,
                presentDays,
                lateDays,
                avgHours: presentDays > 0 ? totalHours / presentDays : 0,
                tasksCompleted: tasksCompleted || 0,
            });
        }

        setLoading(false);
    }

    async function updatePin() {
        if (!newPin || newPin.length < 4 || !profile) {
            alert('PIN must be at least 4 digits');
            return;
        }

        await supabase.from('profiles').update({ pin: newPin }).eq('id', profile.id);
        setEditingPin(false);
        setNewPin('');
        alert('PIN updated successfully!');
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">👤 My Profile</h1>
                <p className="text-gray-600">Your account information</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
                        {profile?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{profile?.name}</h2>
                        <p className="text-gray-600">{profile?.phone}</p>
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded mt-1 capitalize">
                            {profile?.role}
                        </span>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <p className="text-sm text-gray-600">
                        Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-600 uppercase">Days Worked (30d)</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.presentDays}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-600 uppercase">Late Days</p>
                    <p className="text-2xl font-bold text-orange-500">{stats.lateDays}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-600 uppercase">Avg Hours/Day</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.avgHours.toFixed(1)}h</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-600 uppercase">Tasks Completed</p>
                    <p className="text-2xl font-bold text-green-600">{stats.tasksCompleted}</p>
                </div>
            </div>

            {/* Change PIN */}
            <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>

                {editingPin ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-2">New PIN</label>
                            <input
                                type="password"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value)}
                                placeholder="Enter new PIN"
                                maxLength={6}
                                className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 text-center tracking-widest"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingPin(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={updatePin}
                                className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl"
                            >
                                Update PIN
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditingPin(true)}
                        className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
                    >
                        🔐 Change PIN
                    </button>
                )}
            </div>
        </div>
    );
}
