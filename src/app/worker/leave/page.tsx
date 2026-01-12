'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface LeaveRequest {
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    rejection_reason: string | null;
    created_at: string;
}

export default function WorkerLeavePage() {
    const supabase = createClient();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [newRequest, setNewRequest] = useState({
        leave_type: 'casual',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('device_token', token)
            .single();

        if (!profile) return;
        setWorkerId(profile.id);

        const { data } = await supabase
            .from('leaves')
            .select('*')
            .eq('worker_id', profile.id)
            .order('created_at', { ascending: false });

        setLeaves(data || []);
        setLoading(false);
    }

    async function submitRequest() {
        if (!newRequest.reason.trim() || !workerId) {
            alert('Please enter a reason for your leave request');
            return;
        }

        await supabase.from('leaves').insert({
            worker_id: workerId,
            leave_type: newRequest.leave_type,
            start_date: newRequest.start_date,
            end_date: newRequest.end_date,
            reason: newRequest.reason,
            status: 'pending'
        });

        setShowRequestModal(false);
        setNewRequest({
            leave_type: 'casual',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            reason: ''
        });
        loadData();
    }

    function getStatusStyle(status: string) {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'approved': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    function getLeaveTypeIcon(type: string) {
        switch (type) {
            case 'sick': return '🤒';
            case 'emergency': return '🚨';
            case 'casual': return '🏖️';
            default: return '📅';
        }
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    const pendingCount = leaves.filter(l => l.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🏖️ Leave Requests</h1>
                    <p className="text-gray-500">Request time off from work</p>
                </div>
                <button
                    onClick={() => setShowRequestModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium"
                >
                    + Request Leave
                </button>
            </div>

            {/* Pending Notice */}
            {pendingCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-yellow-700 font-medium">⏳ You have {pendingCount} pending request(s)</p>
                    <p className="text-yellow-600 text-sm">Waiting for Swamiji's approval</p>
                </div>
            )}

            {/* Leave History */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : leaves.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                        <p className="text-4xl mb-2">🏖️</p>
                        <p>No leave requests yet</p>
                        <p className="text-sm">Tap the button above to request leave</p>
                    </div>
                ) : (
                    leaves.map(leave => (
                        <div key={leave.id} className="bg-white rounded-xl shadow p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{getLeaveTypeIcon(leave.leave_type)}</span>
                                    <div>
                                        <p className="font-bold text-gray-900 capitalize">{leave.leave_type} Leave</p>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(leave.start_date)}
                                            {leave.end_date !== leave.start_date && ` - ${formatDate(leave.end_date)}`}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusStyle(leave.status)}`}>
                                    {leave.status.toUpperCase()}
                                </span>
                            </div>

                            <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-3">
                                "{leave.reason}"
                            </p>

                            {leave.status === 'rejected' && leave.rejection_reason && (
                                <div className="mt-2 bg-red-50 rounded-lg p-3">
                                    <p className="text-sm text-red-700">
                                        <strong>Rejection reason:</strong> {leave.rejection_reason}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Request Leave</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Leave Type</label>
                                <select
                                    value={newRequest.leave_type}
                                    onChange={(e) => setNewRequest({ ...newRequest, leave_type: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-gray-900"
                                >
                                    <option value="casual">🏖️ Casual Leave</option>
                                    <option value="sick">🤒 Sick Leave</option>
                                    <option value="emergency">🚨 Emergency Leave</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-2">From</label>
                                    <input
                                        type="date"
                                        value={newRequest.start_date}
                                        onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-2">To</label>
                                    <input
                                        type="date"
                                        value={newRequest.end_date}
                                        onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-2">Reason *</label>
                                <textarea
                                    value={newRequest.reason}
                                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 min-h-[100px]"
                                    placeholder="Why do you need leave?"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowRequestModal(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRequest}
                                className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
