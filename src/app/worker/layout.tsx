'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const navItems = [
    { href: '/worker', icon: '🏠', label: 'Home', kioskOnly: true },
    { href: '/worker/tasks', icon: '📋', label: 'Tasks', kioskOnly: false },
    { href: '/worker/leave', icon: '🏖️', label: 'Leave', kioskOnly: false },
    { href: '/worker/history', icon: '📅', label: 'History', kioskOnly: false },
    { href: '/worker/profile', icon: '👤', label: 'Profile', kioskOnly: false },
];

const phoneAllowedPages = ['/worker/tasks', '/worker/history', '/worker/leave', '/worker/profile'];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
    const [isKioskDevice, setIsKioskDevice] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [overdueCount, setOverdueCount] = useState(0);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const isPhoneAllowedPage = phoneAllowedPages.some(p => pathname.startsWith(p));

    useEffect(() => {
        checkKioskDevice();
        loadBadges();
    }, []);

    async function checkKioskDevice() {
        let deviceId = localStorage.getItem('aakb_device_fingerprint');
        if (!deviceId) {
            deviceId = `KIOSK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('aakb_device_fingerprint', deviceId);
        }

        const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'kiosk_device_id')
            .single();

        if (data?.value) {
            setIsKioskDevice(data.value === deviceId);
        } else {
            setIsKioskDevice(true);
        }
        setLoading(false);
    }

    async function loadBadges() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('device_token', token)
            .single();

        if (profile) {
            const today = new Date().toISOString().split('T')[0];
            const { count } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', profile.id)
                .neq('status', 'completed')
                .lt('due_date', today);
            setOverdueCount(count || 0);
        }
    }

    function handleLogout() {
        localStorage.removeItem('aakb_device_token');
        router.push('/login');
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // Block access to dashboard if not on kiosk (but allow phone pages)
    if (isKioskDevice === false && !isPhoneAllowedPage) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-4xl">
                        🖥️
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Start Day from Office</h1>
                    <p className="text-gray-600 mb-6">
                        To <strong>Start/End Day</strong>, use the <strong>office desktop</strong>.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                        <p className="text-green-700 text-sm font-medium">📱 You can access from phone:</p>
                        <ul className="text-sm text-green-600 mt-2 space-y-1">
                            <li>• View and complete tasks</li>
                            <li>• Request leave</li>
                            <li>• View attendance history</li>
                        </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Link href="/worker/tasks" className="py-3 bg-green-500 text-white font-semibold rounded-xl text-center">
                            📋 Go to Tasks
                        </Link>
                        <Link href="/worker/leave" className="py-3 bg-orange-500 text-white font-semibold rounded-xl text-center">
                            🏖️ Request Leave
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 pb-20 lg:pb-0">
            {/* Top Header */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 relative">
                            <Image src="/logo.png" alt="AAKB" fill className="object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">🙏 Hari Om</h1>
                            <p className="text-xs text-gray-500">
                                {isKioskDevice ? '✅ Office Kiosk' : '📱 Phone Mode'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-500 hover:text-red-500"
                    >
                        🚪
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto p-4">
                {children}
            </main>

            {/* Bottom Navigation Bar - Mobile */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
                <div className="max-w-lg mx-auto flex justify-around items-center py-2">
                    {navItems.map(item => {
                        const isActive = pathname === item.href;
                        const isDisabled = item.kioskOnly && !isKioskDevice;
                        const badge = item.href === '/worker/tasks' ? overdueCount : 0;

                        return (
                            <Link
                                key={item.href}
                                href={isDisabled ? '#' : item.href}
                                onClick={(e) => {
                                    if (isDisabled) {
                                        e.preventDefault();
                                        alert('Only available from office kiosk');
                                    }
                                }}
                                className={`flex flex-col items-center py-1 px-3 relative ${isActive ? 'text-green-600' : isDisabled ? 'text-gray-300' : 'text-gray-500'
                                    }`}
                            >
                                <span className="text-xl relative">
                                    {item.icon}
                                    {badge > 0 && (
                                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                            {badge}
                                        </span>
                                    )}
                                    {isDisabled && <span className="absolute -top-1 -right-1 text-xs">🔒</span>}
                                </span>
                                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-green-500 rounded-full"></div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 p-4">
                <nav className="space-y-1">
                    {navItems.map(item => {
                        const isActive = pathname === item.href;
                        const isDisabled = item.kioskOnly && !isKioskDevice;

                        return (
                            <Link
                                key={item.href}
                                href={isDisabled ? '#' : item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive ? 'bg-green-50 text-green-600 font-medium' :
                                        isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.label}</span>
                                {isDisabled && <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">🔒</span>}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </div>
    );
}
