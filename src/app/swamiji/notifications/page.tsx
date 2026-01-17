'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    read: boolean;
    created_at: string;
    data: any;
}

export default function SwamijiNotificationsPage() {
    const supabase = createClient();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (userId) {
            loadNotifications();
            // Subscribe to realtime
            const channel = supabase
                .channel('notifications')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                    (payload) => {
                        setNotifications(prev => [payload.new as Notification, ...prev]);
                        // Play sound
                        new Audio('/notification.mp3').play().catch(() => { });
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [userId]);

    async function loadUser() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) return;

        const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('device_token', token)
            .single();

        if (data) setUserId(data.id);
    }

    async function loadNotifications() {
        if (!userId) return;

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        setNotifications(data || []);
        setLoading(false);
    }

    async function markAsRead(id: string) {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }

    async function markAllAsRead() {
        if (!userId) return;
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }

    function getIcon(type: string) {
        switch (type) {
            case 'check_in': return '🏢';
            case 'field': return '📍';
            case 'event': return '🎉';
            case 'task': return '✅';
            case 'leave': return '📝';
            default: return 'ℹ️';
        }
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/swamiji" className="text-2xl">←</Link>
                        <div>
                            <h1 className="font-bold text-gray-900">🔔 Notifications</h1>
                            <p className="text-sm text-gray-500">{unreadCount} unread</p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-sm text-blue-600 font-medium">
                            Mark all read
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p className="text-6xl mb-4">🔕</p>
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => markAsRead(notif.id)}
                                className={`p-4 rounded-xl shadow ${notif.read ? 'bg-white' : 'bg-orange-50 border-l-4 border-orange-500'}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl">{getIcon(notif.type)}</div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{notif.title}</p>
                                        <p className="text-gray-600">{notif.body}</p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {new Date(notif.created_at).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    {!notif.read && (
                                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
