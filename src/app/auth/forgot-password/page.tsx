'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from '@/lib/auth';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        if (!email.endsWith('@gmail.com')) {
            setError('Only Gmail accounts are allowed');
            return;
        }

        setLoading(true);

        try {
            await sendPasswordResetEmail(email);
            setSuccess(true);
        } catch (err: any) {
            console.error('Password reset error:', err);
            setError(err.message || 'Failed to send password reset email');
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
                        <span className="text-4xl">🔑</span>
                    </div>
                    <h1 className="text-3xl font-bold text-orange-800">Forgot Password</h1>
                    <p className="text-gray-600 mt-2">We'll send you a password reset link</p>
                </div>

                {/* Reset Form */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">✅</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Check Your Email</h2>
                            <p className="text-gray-600 mb-6">
                                We've sent a password reset link to <strong>{email}</strong>
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                                Click the link in the email to reset your password.
                                The link will expire in 1 hour.
                            </p>
                            <Link
                                href="/login"
                                className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-800 text-center mb-6">Reset Your Password</h2>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleResetPassword} className="space-y-4">
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

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '⏳ Sending...' : '📧 Send Reset Link'}
                                </button>
                            </form>

                            {/* Back to Login */}
                            <div className="mt-6 text-center">
                                <Link
                                    href="/login"
                                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                                >
                                    ← Back to Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-xs mt-6">
                    © AAKB Worker Management System
                </p>
            </div>
        </div>
    );
}
