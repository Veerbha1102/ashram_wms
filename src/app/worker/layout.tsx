'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const sidebarLinks = [
    { href: '/worker', icon: '🏠', label: 'Dashboard', kioskOnly: true },
    { href: '/worker/tasks', icon: '📋', label: 'My Tasks', kioskOnly: false },
    { href: '/worker/history', icon: '📅', label: 'Attendance History', kioskOnly: false },
    { href: '/worker/leave', icon: '🏖️', label: 'Request Leave', kioskOnly: false },
    { href: '/worker/profile', icon: '👤', label: 'My Profile', kioskOnly: false },
];

// Pages that can be accessed from phone
const phoneAllowedPages = ['/worker/tasks', '/worker/history', '/worker/leave', '/worker/profile'];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isKioskDevice, setIsKioskDevice] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    // Check if current page is phone-allowed
    const isPhoneAllowedPage = phoneAllowedPages.some(p => pathname.startsWith(p));

    useEffect(() => {
        checkKioskDevice();
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
                        <p className="text-green-700 text-sm font-medium">
                            📱 You can still access from your phone:
                        </p>
                        <ul className="text-sm text-green-600 mt-2 space-y-1">
                            <li>• View and complete tasks</li>
                            <li>• Request leave</li>
                            <li>• View attendance history</li>
                        </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Link href="/worker/tasks" className="py-3 bg-green-500 text-white font-semibold rounded-xl">
                            📋 Go to Tasks
                        </Link>
                        <Link href="/worker/leave" className="py-3 bg-orange-500 text-white font-semibold rounded-xl">
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
                            {link.kioskOnly && !isKioskDevice && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded ml-auto">Kiosk</span>
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    {isKioskDevice && (
                        <div className="bg-green-50 rounded-lg p-3 mb-3 text-xs text-green-700">
                            ✅ Office Kiosk Verified
                        </div>
                    )}
                    {!isKioskDevice && (
                        <div className="bg-orange-50 rounded-lg p-3 mb-3 text-xs text-orange-700">
                            📱 Phone Mode (Limited)
                        </div>
                    )}
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
                        {!isKioskDevice && (
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">📱</span>
                        )}
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
                            {sidebarLinks.map(link => {
                                const isDisabled = link.kioskOnly && !isKioskDevice;
                                return (
                                    <Link
                                        key={link.href}
                                        href={isDisabled ? '#' : link.href}
                                        onClick={(e) => {
                                            if (isDisabled) {
                                                e.preventDefault();
                                                alert('This feature is only available from the office kiosk.');
                                            } else {
                                                setSidebarOpen(false);
                                            }
                                        }}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === link.href
                                                ? 'bg-green-50 text-green-600 font-medium'
                                                : isDisabled
                                                    ? 'text-gray-400'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="text-xl">{link.icon}</span>
                                        <span>{link.label}</span>
                                        {isDisabled && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded ml-auto">🔒</span>}
                                    </Link>
                                );
                            })}
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
