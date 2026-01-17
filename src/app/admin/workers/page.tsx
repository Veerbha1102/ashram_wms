'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

interface Worker {
    id: string;
    name: string;
    phone: string;
    pin: string;
    is_active: boolean;
    created_at: string;
}

type ModalType = 'none' | 'add' | 'edit' | 'delete' | 'toggle' | 'success' | 'error';

export default function WorkersPage() {
    const supabase = createClient();
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalType, setModalType] = useState<ModalType>('none');
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '', pin: '' });
    const [message, setMessage] = useState({ title: '', text: '' });
    const [formError, setFormError] = useState('');

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
        setSelectedWorker(null);
        setFormData({ name: '', phone: '', pin: '' });
        setFormError('');
        setModalType('add');
    }

    function openEditModal(worker: Worker) {
        setSelectedWorker(worker);
        setFormData({ name: worker.name, phone: worker.phone, pin: worker.pin });
        setFormError('');
        setModalType('edit');
    }

    function openDeleteModal(worker: Worker) {
        setSelectedWorker(worker);
        setModalType('delete');
    }

    function openToggleModal(worker: Worker) {
        setSelectedWorker(worker);
        setModalType('toggle');
    }

    function showSuccess(title: string, text: string) {
        setMessage({ title, text });
        setModalType('success');
        setTimeout(() => setModalType('none'), 2000);
    }

    function showError(title: string, text: string) {
        setMessage({ title, text });
        setModalType('error');
    }

    async function saveWorker() {
        setFormError('');

        if (!formData.name.trim()) {
            setFormError('Please enter worker name');
            return;
        }
        if (!formData.phone.trim() || formData.phone.length < 10) {
            setFormError('Please enter valid 10-digit phone number');
            return;
        }
        if (!formData.pin.trim() || formData.pin.length < 4) {
            setFormError('Please enter 4-6 digit PIN');
            return;
        }

        setSaving(true);

        try {
            if (selectedWorker) {
                // Update existing worker
                const { error } = await supabase.from('profiles').update({
                    name: formData.name.trim(),
                    phone: formData.phone.trim(),
                    pin: formData.pin.trim(),
                }).eq('id', selectedWorker.id);

                if (error) throw error;
                showSuccess('✅ Updated!', `${formData.name} details have been updated.`);
            } else {
                // Create new worker
                const deviceToken = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const { error } = await supabase.from('profiles').insert({
                    name: formData.name.trim(),
                    phone: formData.phone.trim(),
                    pin: formData.pin.trim(),
                    device_token: deviceToken,
                    role: 'worker',
                    is_active: true,
                });

                if (error) throw error;
                showSuccess('✅ Worker Added!', `${formData.name} has been added successfully.`);
            }
            loadWorkers();
        } catch (err) {
            showError('❌ Error', 'Failed to save worker. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    async function confirmToggle() {
        if (!selectedWorker) return;
        setSaving(true);

        try {
            const { error } = await supabase.from('profiles').update({
                is_active: !selectedWorker.is_active
            }).eq('id', selectedWorker.id);

            if (error) throw error;

            const newStatus = !selectedWorker.is_active ? 'enabled' : 'disabled';
            showSuccess(`✅ ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}!`,
                `${selectedWorker.name} is now ${newStatus}.`);
            loadWorkers();
        } catch (err) {
            showError('❌ Error', 'Failed to update worker status.');
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (!selectedWorker) return;
        setSaving(true);

        try {
            console.log('Deleting worker:', selectedWorker.id, selectedWorker.name);

            // Delete related data first
            const { error: attError } = await supabase.from('attendance').delete().eq('worker_id', selectedWorker.id);
            console.log('Attendance delete:', attError ? attError.message : 'OK');

            const { error: taskError } = await supabase.from('tasks').delete().eq('assigned_to', selectedWorker.id);
            console.log('Tasks delete:', taskError ? taskError.message : 'OK');

            const { error: leaveError } = await supabase.from('leaves').delete().eq('worker_id', selectedWorker.id);
            console.log('Leaves delete:', leaveError ? leaveError.message : 'OK');

            // Delete the worker profile
            const { error } = await supabase.from('profiles').delete().eq('id', selectedWorker.id);
            console.log('Profile delete:', error ? error.message : 'OK');

            if (error) {
                console.error('Delete error:', error);
                throw error;
            }

            showSuccess('🗑️ Deleted!', `${selectedWorker.name} has been removed from the system.`);
            loadWorkers();
        } catch (err) {
            console.error('Delete failed:', err);
            showError('❌ Error', 'Failed to delete worker. Check if RLS is disabled in Supabase.');
        } finally {
            setSaving(false);
        }
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
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    + Add Worker
                </button>
            </div>

            {/* Workers Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : workers.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <div className="text-6xl mb-4">👤</div>
                        <p className="text-gray-500 mb-4">No workers found</p>
                        <button onClick={openAddModal} className="px-6 py-2 bg-blue-500 text-white rounded-xl">
                            Add First Worker
                        </button>
                    </div>
                ) : (
                    workers.map(worker => (
                        <div key={worker.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                            {/* Card Header */}
                            <div className={`p-4 ${worker.is_active ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                                        {worker.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 text-white">
                                        <p className="font-bold text-lg">{worker.name}</p>
                                        <p className="text-white/80 text-sm">📱 {worker.phone}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${worker.is_active ? 'bg-white/20 text-white' : 'bg-white/30 text-white'}`}>
                                        {worker.is_active ? '🟢 Active' : '⚫ Inactive'}
                                    </span>
                                </div>
                            </div>

                            {/* Card Actions */}
                            <div className="p-4">
                                <Link
                                    href={`/admin/workers/${worker.id}`}
                                    className="block w-full py-2 mb-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center rounded-xl font-medium hover:shadow-lg transition"
                                >
                                    📊 View All Data
                                </Link>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(worker)}
                                        className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => openToggleModal(worker)}
                                        className={`flex-1 py-3 rounded-xl font-medium transition ${worker.is_active
                                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                            }`}
                                    >
                                        {worker.is_active ? '⏸️ Disable' : '▶️ Enable'}
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(worker)}
                                        className="py-3 px-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ADD/EDIT MODAL */}
            {(modalType === 'add' || modalType === 'edit') && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center text-3xl">
                                {modalType === 'edit' ? '✏️' : '👤'}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">
                                {modalType === 'edit' ? 'Edit Worker' : 'Add New Worker'}
                            </h3>
                        </div>

                        {formError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                ⚠️ {formError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition text-gray-800"
                                    placeholder="Enter worker's full name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                                <input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition text-gray-800"
                                    placeholder="10 digit phone number"
                                    maxLength={10}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Login PIN</label>
                                <input
                                    value={formData.pin}
                                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition text-gray-800"
                                    placeholder="4-6 digit PIN"
                                    maxLength={6}
                                    type="password"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setModalType('none')}
                                disabled={saving}
                                className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveWorker}
                                disabled={saving}
                                className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50"
                            >
                                {saving ? '⏳ Saving...' : modalType === 'edit' ? '✅ Update' : '✅ Add Worker'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {modalType === 'delete' && selectedWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-4xl animate-bounce">
                                🗑️
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">Delete Worker?</h3>
                            <p className="text-gray-500 mt-2">
                                Are you sure you want to delete <strong className="text-red-600">{selectedWorker.name}</strong>?
                            </p>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                            <p className="text-red-700 text-sm font-medium">⚠️ This action cannot be undone!</p>
                            <p className="text-red-600 text-xs mt-1">All attendance records, tasks, and leave data will be deleted.</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalType('none')}
                                disabled={saving}
                                className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                ❌ Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={saving}
                                className="flex-1 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50"
                            >
                                {saving ? '⏳ Deleting...' : '🗑️ Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOGGLE CONFIRMATION MODAL */}
            {modalType === 'toggle' && selectedWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl ${selectedWorker.is_active ? 'bg-orange-100' : 'bg-green-100'
                                }`}>
                                {selectedWorker.is_active ? '⏸️' : '▶️'}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">
                                {selectedWorker.is_active ? 'Disable Worker?' : 'Enable Worker?'}
                            </h3>
                            <p className="text-gray-500 mt-2">
                                {selectedWorker.is_active
                                    ? `${selectedWorker.name} will not be able to login until enabled again.`
                                    : `${selectedWorker.name} will be able to login and mark attendance.`
                                }
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalType('none')}
                                disabled={saving}
                                className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmToggle}
                                disabled={saving}
                                className={`flex-1 py-4 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50 ${selectedWorker.is_active
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                    : 'bg-gradient-to-r from-green-500 to-green-600'
                                    }`}
                            >
                                {saving ? '⏳ Processing...' : selectedWorker.is_active ? '⏸️ Disable' : '▶️ Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS MODAL */}
            {modalType === 'success' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center text-5xl">
                            ✅
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">{message.title}</h3>
                        <p className="text-gray-500 mt-2">{message.text}</p>
                    </div>
                </div>
            )}

            {/* ERROR MODAL */}
            {modalType === 'error' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-5xl">
                            ❌
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">{message.title}</h3>
                        <p className="text-gray-500 mt-2">{message.text}</p>
                        <button
                            onClick={() => setModalType('none')}
                            className="mt-4 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
