'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/lib/auth';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await updatePassword(password);
            alert('Password updated successfully! Redirecting to login...');
            router.push('/login');
        } catch (err: any) {
            console.error('Password reset error:', err);
            setError(err.message || 'Failed to update password');
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-lg flex items-center justify-center mb-4">
                        <span className="text-4xl">🔐</span>
                    </div>
                    <h1 className="text-3xl font-bold text-orange-800">Reset Password</h1>
                    <p className="text-gray-600 mt-2">Enter your new password</p>
                </div>

                {/* Reset Form */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                    <h2 className="text-xl font-bold text-gray-800 text-center mb-6">Create New Password</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
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
                            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-gray-900"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ Updating...' : '✅ Update Password'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-xs mt-6">
                    © AAKB Worker Management System
                </p>
            </div>
        </div>
    );
}
