'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setError('');
        if (!username.trim() || !pin.trim()) {
            setError('Please enter username and PIN');
            return;
        }

        setLoading(true);

        try {
            // Login using the 'phone' field as username (for backward compatibility)
            const { data, error: queryError } = await supabase
                .from('profiles')
                .select('*')
                .eq('phone', username.trim())
                .eq('pin', pin.trim())
                .single();

            if (queryError || !data) {
                console.error('Login error:', queryError);
                setError('Invalid username or PIN');
                setLoading(false);
                return;
            }

            if (!data.is_active) {
                setError('Account is disabled. Contact Admin.');
                setLoading(false);
                return;
            }

            // Save device token
            localStorage.setItem('aakb_device_token', data.device_token);
            localStorage.setItem('aakb_user_role', data.role);
            localStorage.setItem('aakb_user_name', data.name);

            // Redirect based on role
            if (data.role === 'admin') {
                router.push('/admin');
            } else if (data.role === 'swamiji') {
                router.push('/swamiji');
            } else {
                router.push('/worker');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-lg flex items-center justify-center mb-4">
                        <span className="text-4xl">🙏</span>
                    </div>
                    <h1 className="text-3xl font-bold text-orange-800">Hari Om</h1>
                    <p className="text-orange-600">Arsh Adhyayan Kendra Bhavan</p>
                    <p className="text-sm text-gray-500 mt-1">Worker Management System</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                    <h2 className="text-xl font-bold text-gray-800 text-center mb-6">Login</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 focus:outline-none text-lg"
                                placeholder="Enter your username"
                                autoComplete="username"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                PIN
                            </label>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 focus:outline-none text-lg tracking-widest"
                                placeholder="Enter 4-digit PIN"
                                maxLength={6}
                                autoComplete="current-password"
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ Logging in...' : '🔐 LOGIN'}
                        </button>
                    </div>

                    {/* Login Help */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">
                            Enter your assigned username and PIN to login
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-xs mt-6">
                    © AAKB Worker Management System
                </p>
            </div>
        </div>
    );
}
