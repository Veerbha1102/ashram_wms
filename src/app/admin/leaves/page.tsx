'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface LeaveRequest {
    id: string;
    worker_id: string;
    worker_name: string;
    worker_phone: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    created_at: string;
}

export default function AdminLeavesPage() {
    const supabase = createClient();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        loadLeaves();
    }, []);

    async function loadLeaves() {
        setLoading(true);

        const { data: workers } = await supabase
            .from('profiles')
            .select('id, name, phone')
            .eq('role', 'worker');

        // Use 'leaves' table (same as Swamiji and Worker pages)
        const { data: leavesData } = await supabase
            .from('leaves')
            .select('*')
            .order('created_at', { ascending: false });

        const leavesList: LeaveRequest[] = (leavesData || []).map(l => {
            const worker = workers?.find(w => w.id === l.worker_id);
            return {
                ...l,
                worker_name: worker?.name || 'Unknown',
                worker_phone: worker?.phone || '',
            };
        });

        setLeaves(leavesList);
        setLoading(false);
    }

    async function updateStatus(leaveId: string, status: 'approved' | 'rejected') {
        const updateData: { status: string; approved_at?: string; rejection_reason?: string } = {
            status,
        };

        if (status === 'approved') {
            updateData.approved_at = new Date().toISOString();
        } else if (status === 'rejected') {
            const reason = prompt('Reason for rejection (optional):');
            if (reason) updateData.rejection_reason = reason;
        }

        await supabase.from('leaves').update(updateData).eq('id', leaveId);
        loadLeaves();
    }

    const filteredLeaves = leaves.filter(l => filter === 'all' || l.status === filter);

    function getDaysCount(start: string, end: string): number {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    function getLeaveTypeIcon(type: string) {
        switch (type) {
            case 'sick': return '🤒';
            case 'emergency': return '🚨';
            case 'casual': return '🏖️';
            default: return '📅';
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">🏖️ Leave Requests</h1>
                <p className="text-gray-500">{leaves.filter(l => l.status === 'pending').length} pending requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="text-2xl font-bold text-gray-800">{leaves.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Pending</p>
                    <p className="text-2xl font-bold text-orange-500">{leaves.filter(l => l.status === 'pending').length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{leaves.filter(l => l.status === 'approved').length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Rejected</p>
                    <p className="text-2xl font-bold text-red-500">{leaves.filter(l => l.status === 'rejected').length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto">
                {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl capitalize whitespace-nowrap transition ${filter === f ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Leaves List */}
            <div className="space-y-4">
                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : filteredLeaves.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                        No leave requests found
                    </div>
                ) : (
                    filteredLeaves.map(leave => (
                        <div key={leave.id} className="bg-white rounded-xl shadow p-4">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                            {leave.worker_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{leave.worker_name}</p>
                                            <p className="text-xs text-gray-400">{leave.worker_phone}</p>
                                        </div>
                                        <span className="text-xl ml-2">{getLeaveTypeIcon(leave.leave_type)}</span>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{leave.leave_type}</span>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-3 mt-3">
                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                            <span>📅 {leave.start_date} → {leave.end_date}</span>
                                            <span className="font-medium">({getDaysCount(leave.start_date, leave.end_date)} days)</span>
                                        </div>
                                        <p className="text-gray-700">{leave.reason || 'No reason provided'}</p>
                                    </div>

                                    {leave.rejection_reason && (
                                        <div className="bg-red-50 rounded-lg p-3 mt-2">
                                            <p className="text-sm text-red-700"><strong>Rejection reason:</strong> {leave.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium text-center ${leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-orange-100 text-orange-700'
                                        }`}>
                                        {leave.status}
                                    </span>

                                    {leave.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateStatus(leave.id, 'approved')}
                                                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium"
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                onClick={() => updateStatus(leave.id, 'rejected')}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"
                                            >
                                                ✗ Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
