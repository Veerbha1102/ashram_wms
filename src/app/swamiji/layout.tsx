'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

const navItems = [
    { href: '/swamiji', icon: '🏠', label: 'Home' },
    { href: '/swamiji/notifications', icon: '🔔', label: 'Alerts' },
    { href: '/swamiji/tasks', icon: '📋', label: 'Tasks' },
    { href: '/swamiji/leave', icon: '🏖️', label: 'Leave' },
];

export default function SwamijiLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [pendingLeaves, setPendingLeaves] = useState(0);
    const [pendingAlerts, setPendingAlerts] = useState(0);

    useEffect(() => {
        checkAuth();
        loadBadgeCounts();
        const interval = setInterval(loadBadgeCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    async function checkAuth() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) { router.push('/login'); return; }
        const { data } = await supabase.from('profiles').select('role').eq('device_token', token).single();
        if (!data || data.role !== 'swamiji') router.push('/login');
    }

    async function loadBadgeCounts() {
        // Count pending leave requests
        const { count: leaveCount } = await supabase
            .from('leaves')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        setPendingLeaves(leaveCount || 0);

        // Count today's alerts (early exits pending)
        const today = new Date().toISOString().split('T')[0];
        const { count: alertCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .eq('early_exit_requested', true)
            .eq('early_exit_approved', false);
        setPendingAlerts(alertCount || 0);
    }

    function handleLogout() {
        localStorage.removeItem('aakb_device_token');
        router.push('/login');
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-20">
            {/* Top Header */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🙏</span>
                        <div>
                            <h1 className="font-bold text-gray-900">Hari Om, Swamiji</h1>
                            <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
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
            <main className="max-w-lg mx-auto p-4">
                {children}
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
                <div className="max-w-lg mx-auto flex justify-around items-center py-2">
                    {navItems.map(item => {
                        const isActive = pathname === item.href;
                        const badge = item.href === '/swamiji/leave' ? pendingLeaves :
                            item.href === '/swamiji/alerts' ? pendingAlerts : 0;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center py-1 px-4 relative ${isActive ? 'text-orange-600' : 'text-gray-500'
                                    }`}
                            >
                                <span className="text-2xl relative">
                                    {item.icon}
                                    {badge > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                            {badge}
                                        </span>
                                    )}
                                </span>
                                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-orange-500 rounded-full"></div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
