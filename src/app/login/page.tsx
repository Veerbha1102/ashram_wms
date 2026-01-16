'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter your email and password');
            return;
        }

        // Validate email domain
        const isGmail = email.endsWith('@gmail.com');
        const isOrgEmail = email.endsWith('@aakb.org.in');

        if (!isGmail && !isOrgEmail) {
            setError('Only Gmail or @aakb.org.in addresses are allowed');
            return;
        }


        setLoading(true);

        try {
            await signInWithEmail(email, password);
            // Redirect will be handled by auth callback
            router.push('/auth/callback');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Invalid email or password');
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
                    <h2 className="text-xl font-bold text-gray-800 text-center mb-6">Secure Login</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Gmail Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your-email@gmail.com"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-gray-900"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-gray-900 pr-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ Logging in...' : '🔐 Login'}
                        </button>
                    </form>

                    {/* Forgot Password Link */}
                    <div className="mt-4 text-center">
                        <Link
                            href="/auth/forgot-password"
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    {/* Login Help */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                            <span className="text-blue-600">ℹ️</span>
                            <p className="text-xs text-blue-600">
                                Only pre-authorized Gmail accounts can access this system.
                                Contact your administrator if you need access.
                            </p>
                        </div>
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
