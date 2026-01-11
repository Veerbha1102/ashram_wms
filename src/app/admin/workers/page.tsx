'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Worker {
    id: string;
    name: string;
    phone: string;
    pin: string;
    is_active: boolean;
    created_at: string;
}

export default function WorkersPage() {
    const supabase = createClient();
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '', pin: '' });

    useEffect(() => {
        loadWorkers();
    }, []);

    async function loadWorkers() {
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'worker')
            .order('created_at', { ascending: false });

        setWorkers(data || []);
        setLoading(false);
    }

    function openAddModal() {
        setEditingWorker(null);
        setFormData({ name: '', phone: '', pin: '' });
        setShowModal(true);
    }

    function openEditModal(worker: Worker) {
        setEditingWorker(worker);
        setFormData({ name: worker.name, phone: worker.phone, pin: worker.pin });
        setShowModal(true);
    }

    async function saveWorker() {
        if (!formData.name || !formData.phone || !formData.pin) {
            alert('Please fill all fields');
            return;
        }

        if (editingWorker) {
            // Update
            await supabase.from('profiles').update({
                name: formData.name,
                phone: formData.phone,
                pin: formData.pin,
            }).eq('id', editingWorker.id);
        } else {
            // Create
            const deviceToken = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await supabase.from('profiles').insert({
                name: formData.name,
                phone: formData.phone,
                pin: formData.pin,
                device_token: deviceToken,
                role: 'worker',
                is_active: true,
            });
        }

        setShowModal(false);
        loadWorkers();
    }

    async function toggleActive(worker: Worker) {
        await supabase.from('profiles').update({
            is_active: !worker.is_active
        }).eq('id', worker.id);
        loadWorkers();
    }

    async function deleteWorker(id: string) {
        if (!confirm('Are you sure? This will delete all attendance and task data for this worker.')) return;

        await supabase.from('profiles').delete().eq('id', id);
        loadWorkers();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">👥 Workers Management</h1>
                    <p className="text-gray-500">{workers.length} workers registered</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
                >
                    + Add Worker
                </button>
            </div>

            {/* Workers Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : workers.length === 0 ? (
                    <p className="text-gray-400">No workers found</p>
                ) : (
                    workers.map(worker => (
                        <div key={worker.id} className="bg-white rounded-xl shadow p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${worker.is_active ? 'bg-green-500' : 'bg-gray-400'
                                        }`}>
                                        {worker.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{worker.name}</p>
                                        <p className="text-xs text-gray-400">{worker.phone}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs ${worker.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {worker.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="flex gap-2 mt-3 pt-3 border-t">
                                <button
                                    onClick={() => openEditModal(worker)}
                                    className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => toggleActive(worker)}
                                    className={`flex-1 py-2 text-sm rounded-lg ${worker.is_active
                                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                >
                                    {worker.is_active ? '⏸️ Disable' : '▶️ Enable'}
                                </button>
                                <button
                                    onClick={() => deleteWorker(worker.id)}
                                    className="py-2 px-3 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            {editingWorker ? 'Edit Worker' : 'Add New Worker'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl"
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                                <input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl"
                                    placeholder="10 digit phone number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">PIN Code</label>
                                <input
                                    value={formData.pin}
                                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl"
                                    placeholder="4-6 digit PIN"
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveWorker}
                                className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl"
                            >
                                {editingWorker ? 'Update' : 'Add Worker'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
