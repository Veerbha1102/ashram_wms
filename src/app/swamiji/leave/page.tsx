'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface LeaveRequest {
    id: string;
    worker_id: string;
    worker_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    created_at: string;
}

export default function SwamijiLeavePage() {
    const supabase = createClient();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaves();
    }, [filter]);

    async function loadLeaves() {
        setLoading(true);
        let query = supabase
            .from('leaves')
            .select(`
        *,
        profiles:worker_id (name)
      `)
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data } = await query;
        setLeaves((data || []).map(l => ({
            ...l,
            worker_name: l.profiles?.name || 'Unknown'
        })));
        setLoading(false);
    }

    async function handleApprove(leaveId: string) {
        await supabase.from('leaves').update({
            status: 'approved',
            approved_at: new Date().toISOString()
        }).eq('id', leaveId);
        loadLeaves();
    }

    async function handleReject(leaveId: string) {
        const reason = prompt('Reason for rejection (optional):');
        await supabase.from('leaves').update({
            status: 'rejected',
            rejection_reason: reason || null
        }).eq('id', leaveId);
        loadLeaves();
    }

    function getLeaveTypeColor(type: string) {
        switch (type) {
            case 'sick': return 'bg-red-100 text-red-700';
            case 'emergency': return 'bg-orange-100 text-orange-700';
            case 'casual': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    const pendingCount = leaves.filter(l => l.status === 'pending').length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">🏖️ Leave Requests</h2>
                <p className="text-gray-500 text-sm">Approve or reject worker leave requests</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto">
                {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full capitalize whitespace-nowrap text-sm font-medium transition ${filter === f
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-600 border border-gray-200'
                            }`}
                    >
                        {f}
                        {f === 'pending' && pendingCount > 0 && (
                            <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Leave List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : leaves.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                        No {filter === 'all' ? '' : filter} leave requests
                    </div>
                ) : (
                    leaves.map(leave => (
                        <div key={leave.id} className="bg-white rounded-xl shadow p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-bold text-gray-900">{leave.worker_name}</p>
                                    <span className={`text-xs px-2 py-1 rounded ${getLeaveTypeColor(leave.leave_type)}`}>
                                        {leave.leave_type.toUpperCase()}
                                    </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {leave.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <span>📅</span>
                                <span>{formatDate(leave.start_date)}</span>
                                {leave.end_date !== leave.start_date && (
                                    <>
                                        <span>→</span>
                                        <span>{formatDate(leave.end_date)}</span>
                                    </>
                                )}
                            </div>

                            <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-3 mb-3">
                                "{leave.reason}"
                            </p>

                            {leave.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(leave.id)}
                                        className="flex-1 py-2 bg-green-500 text-white font-semibold rounded-lg"
                                    >
                                        ✅ Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(leave.id)}
                                        className="flex-1 py-2 bg-red-500 text-white font-semibold rounded-lg"
                                    >
                                        ❌ Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
