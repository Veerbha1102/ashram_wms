'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function WorkerLeavePage() {
    const supabase = createClient();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) return;

        const { data: profile } = await supabase.from('profiles').select('id').eq('device_token', token).single();
        if (!profile) return;

        setWorkerId(profile.id);

        const { data: leavesData } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('worker_id', profile.id)
            .order('created_at', { ascending: false });

        setLeaves(leavesData || []);
        setLoading(false);
    }

    async function submitLeave() {
        if (!workerId || !formData.reason) {
            alert('Please enter a reason');
            return;
        }

        await supabase.from('leave_requests').insert({
            worker_id: workerId,
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason,
            status: 'pending',
        });

        setShowForm(false);
        setFormData({ start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], reason: '' });
        loadData();
    }

    function getStatusColor(status: string): string {
        return status === 'approved' ? 'bg-green-100 text-green-700' :
            status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-orange-100 text-orange-700';
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">🏖️ Leave Requests</h1>
                    <p className="text-gray-500">Request and track your leaves</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium"
                >
                    + Request Leave
                </button>
            </div>

            {/* Leave Requests List */}
            <div className="space-y-4">
                {loading ? (
                    <p className="text-gray-400 text-center py-8">Loading...</p>
                ) : leaves.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                        No leave requests yet
                    </div>
                ) : (
                    leaves.map(leave => (
                        <div key={leave.id} className="bg-white rounded-xl shadow p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-medium text-gray-800">
                                        {new Date(leave.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        {' → '}
                                        {new Date(leave.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className="text-sm text-gray-500">{leave.reason}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                                    {leave.status}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">
                                Requested: {new Date(leave.created_at).toLocaleDateString('en-IN')}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Request Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Request Leave</h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">From</label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Reason</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl min-h-[100px]"
                                    placeholder="Why do you need leave?"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                            <button onClick={submitLeave} className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl">Submit Request</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
