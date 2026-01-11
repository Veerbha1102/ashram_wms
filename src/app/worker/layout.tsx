'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const sidebarLinks = [
    { href: '/worker', icon: '🏠', label: 'Dashboard' },
    { href: '/worker/tasks', icon: '📋', label: 'My Tasks' },
    { href: '/worker/history', icon: '📅', label: 'Attendance History' },
    { href: '/worker/leave', icon: '🏖️', label: 'Request Leave' },
    { href: '/worker/profile', icon: '👤', label: 'My Profile' },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isKioskDevice, setIsKioskDevice] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        checkKioskDevice();
    }, []);

    async function checkKioskDevice() {
        // Get this device's fingerprint
        let deviceId = localStorage.getItem('aakb_device_fingerprint');
        if (!deviceId) {
            deviceId = `KIOSK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('aakb_device_fingerprint', deviceId);
        }

        // Check if there's a registered kiosk
        const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'kiosk_device_id')
            .single();

        if (data?.value) {
            // There's a registered kiosk - check if this is it
            setIsKioskDevice(data.value === deviceId);
        } else {
            // No kiosk registered - allow from any device
            setIsKioskDevice(true);
        }
        setLoading(false);
    }

    function handleLogout() {
        localStorage.removeItem('aakb_device_token');
        router.push('/login');
    }

    // Show loading while checking kiosk
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // Block access if not on kiosk
    if (isKioskDevice === false) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-4xl">
                        🖥️
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
                    <p className="text-gray-600 mb-6">
                        Workers can only access the system from the <strong>office desktop</strong>.
                    </p>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                        <p className="text-orange-700 text-sm">
                            📍 Please go to the Ashram office and use the registered kiosk computer to access your dashboard.
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 fixed h-full">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative">
                            <Image src="/logo.png" alt="AAKB" fill className="object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-800">AAKB Worker</h1>
                            <p className="text-xs text-gray-500">Hari Om 🙏</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {sidebarLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === link.href
                                    ? 'bg-green-50 text-green-600 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-xl">{link.icon}</span>
                            <span>{link.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="bg-green-50 rounded-lg p-3 mb-3 text-xs text-green-700">
                        ✅ Office Kiosk Verified
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                        <span className="text-xl">🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
                <div className="flex items-center justify-between p-4">
                    <button onClick={() => setSidebarOpen(true)} className="p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 relative">
                            <Image src="/logo.png" alt="AAKB" fill className="object-contain" />
                        </div>
                        <span className="font-bold text-gray-800">Worker</span>
                    </div>
                    <div className="w-10"></div>
                </div>
            </div>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
                    <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 relative">
                                    <Image src="/logo.png" alt="AAKB" fill className="object-contain" />
                                </div>
                                <span className="font-bold">AAKB Worker</span>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="p-2">✕</button>
                        </div>
                        <nav className="p-4 space-y-1">
                            {sidebarLinks.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === link.href
                                            ? 'bg-green-50 text-green-600 font-medium'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="text-xl">{link.icon}</span>
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </nav>
                        <div className="p-4 border-t border-gray-100">
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl">
                                <span>🚪</span><span>Logout</span>
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
                <div className="p-4 lg:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
