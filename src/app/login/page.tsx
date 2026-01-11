'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Lookup user by phone and pin
            const { data, error: queryError } = await supabase
                .from('profiles')
                .select('id, role, device_token, name')
                .eq('phone', phone)
                .eq('pin', pin)
                .single();

            if (queryError || !data) {
                setError('Invalid phone number or PIN');
                setLoading(false);
                return;
            }

            // Store device token in localStorage
            localStorage.setItem('aakb_device_token', data.device_token);

            // Redirect based on role
            switch (data.role) {
                case 'admin':
                    router.push('/admin');
                    break;
                case 'swamiji':
                    router.push('/swamiji');
                    break;
                case 'worker':
                    router.push('/worker');
                    break;
                default:
                    router.push('/');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-4 relative">
                        <Image
                            src="/logo.png"
                            alt="AAKB Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Arsh Adhyayan Kendra</h1>
                    <p className="text-gray-700 mt-1">Worker Management System</p>
                    <a
                        href="https://aakb.org.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 text-sm hover:underline"
                    >
                        aakb.org.in
                    </a>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-xl font-bold text-gray-900 text-center mb-6">🙏 Hari Om - Login</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-2">Phone / Username</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter your phone or username"
                                className="w-full p-4 border border-gray-300 rounded-xl text-gray-900 text-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-2">PIN</label>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="Enter your PIN"
                                maxLength={6}
                                className="w-full p-4 border border-gray-300 rounded-xl text-gray-900 text-lg text-center tracking-widest focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !phone || !pin}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition"
                    >
                        {loading ? 'Logging in...' : 'LOGIN'}
                    </button>
                </form>

                <p className="text-center text-gray-700 text-sm mt-6">
                    © 2024 Shree Dakshinimurti Trust
                </p>
            </div>
        </div>
    );
}
