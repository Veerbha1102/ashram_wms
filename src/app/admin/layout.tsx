'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getCurrentUser, signOut } from '@/lib/auth';

const navItems = [
    { href: '/admin', icon: '📊', label: 'Dashboard' },
    { href: '/admin/workers', icon: '👥', label: 'Workers' },
    { href: '/admin/tasks', icon: '📋', label: 'Tasks' },
    { href: '/admin/leaves', icon: '🏖️', label: 'Leaves' },
    { href: '/admin/holidays', icon: '🗓️', label: 'Holidays' },
];

const moreItems = [
    { href: '/admin/attendance', icon: '📅', label: 'Attendance' },
    { href: '/admin/reports', icon: '📈', label: 'Reports' },
    { href: '/admin/authorized-users', icon: '🔐', label: 'Authorized Users' },
    { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [pendingLeaves, setPendingLeaves] = useState(0);
    const [showMore, setShowMore] = useState(false);
    const [userName, setUserName] = useState('Admin');
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        checkAuth();
        loadBadges();
    }, []);

    async function checkAuth() {
        try {
            const user = await getCurrentUser();

            if (!user) {
                router.push('/login');
                return;
            }

            // Check if user has admin or manager role
            if (user.role !== 'admin' && user.role !== 'manager') {
                // Redirect based on role
                if (user.role === 'swamiji') {
                    router.push('/swamiji');
                } else {
                    router.push('/worker');
                }
                return;
            }

            setUserName(user.full_name);
        } catch (error) {
            console.error('Auth error:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }

    async function loadBadges() {
        const { count } = await supabase
            .from('leaves')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        setPendingLeaves(count || 0);
    }

    async function handleLogout() {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            router.push('/login');
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20 lg:pb-0">
            {/* Top Header */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 relative">
                            <Image src="/logo.png" alt="AAKB" fill className="object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">🛡️ Admin Panel</h1>
                            <p className="text-xs text-gray-500">{userName}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        🚪
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto p-4 lg:ml-64">
                {children}
            </main>

            {/* Bottom Navigation Bar - Mobile */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
                <div className="flex justify-around items-center py-2">
                    {navItems.map(item => {
                        const isActive = pathname === item.href;
                        const badge = item.href === '/admin/leaves' ? pendingLeaves : 0;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center py-1 px-2 relative ${isActive ? 'text-blue-600' : 'text-gray-500'
                                    }`}
                            >
                                <span className="text-xl relative">
                                    {item.icon}
                                    {badge > 0 && (
                                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                            {badge}
                                        </span>
                                    )}
                                </span>
                                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-blue-500 rounded-full"></div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 fixed top-0 left-0 h-full">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative">
                            <Image src="/logo.png" alt="AAKB" fill className="object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-800">AAKB Admin</h1>
                            <p className="text-xs text-gray-500">Management System</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {[...navItems, ...moreItems].map(item => {
                        const isActive = pathname === item.href;
                        const badge = item.href === '/admin/leaves' ? pendingLeaves : 0;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="text-xl relative">
                                    {item.icon}
                                    {badge > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                            {badge}
                                        </span>
                                    )}
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                        <span className="text-xl">🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* More Menu - Mobile */}
            {showMore && (
                <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setShowMore(false)}>
                    <div className="absolute bottom-16 left-4 right-4 bg-white rounded-2xl shadow-xl p-4">
                        <h3 className="font-bold text-gray-900 mb-3">More Options</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {moreItems.map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setShowMore(false)}
                                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl"
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="text-sm text-gray-700">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
