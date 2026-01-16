'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface AuthorizedUser {
    id: string;
    gmail: string;
    role: string;
    full_name: string;
    is_active: boolean;
    last_login: string | null;
    created_at: string;
}

export default function AuthorizedUsersPage() {
    const supabase = createClient();
    const [users, setUsers] = useState<AuthorizedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [newUser, setNewUser] = useState({
        gmail: '',
        full_name: '',
        role: 'worker'
    });

    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('authorized_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            showNotification('error', 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }

    async function handleAddUser() {
        if (!newUser.gmail || !newUser.full_name) {
            showNotification('error', 'Please fill all required fields');
            return;
        }


        const isGmail = newUser.gmail.endsWith('@gmail.com');
        const isOrgEmail = newUser.gmail.endsWith('@aakb.org.in');

        if (!isGmail && !isOrgEmail) {
            showNotification('error', 'Only Gmail or @aakb.org.in addresses are allowed');
            return;
        }


        try {
            const response = await fetch('/api/invite-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newUser.gmail.toLowerCase().trim(),
                    full_name: newUser.full_name.trim(),
                    role: newUser.role,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to invite user');
            }

            // Log activity
            await supabase.from('activity_log').insert({
                action: 'user_invited',
                description: `New authorized user invited: ${newUser.gmail} (${newUser.role})`,
            });

            showNotification('success', 'User invited! They will receive a password reset email.');
            setShowAddModal(false);
            setNewUser({ gmail: '', full_name: '', role: 'worker' });
            fetchUsers();
        } catch (error: any) {
            console.error('Error inviting user:', error);
            showNotification('error', error.message || 'Failed to invite user');
        }
    }

    async function handleToggleActive(userId: string, currentStatus: boolean) {
        try {
            const { error } = await supabase
                .from('authorized_users')
                .update({ is_active: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            showNotification('success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            fetchUsers();
        } catch (error: any) {
            console.error('Error toggling user status:', error);
            showNotification('error', 'Failed to update user status');
        }
    }

    async function handleUpdateRole(userId: string, newRole: string) {
        try {
            const { error } = await supabase
                .from('authorized_users')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            showNotification('success', 'Role updated successfully');
            fetchUsers();
        } catch (error: any) {
            console.error('Error updating role:', error);
            showNotification('error', 'Failed to update role');
        }
    }

    async function handleDeleteUser(userId: string, gmail: string) {
        if (!confirm(`Are you sure you want to remove ${gmail} from authorized users?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('authorized_users')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            showNotification('success', 'User removed successfully');
            fetchUsers();
        } catch (error: any) {
            console.error('Error deleting user:', error);
            showNotification('error', 'Failed to remove user');
        }
    }

    function showNotification(type: 'success' | 'error', message: string) {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.gmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.full_name.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'all') return matchesSearch;
        if (filter === 'active') return matchesSearch && user.is_active;
        if (filter === 'inactive') return matchesSearch && !user.is_active;
        return matchesSearch && user.role === filter;
    });

    const roleColors: { [key: string]: string } = {
        admin: 'bg-purple-100 text-purple-700',
        manager: 'bg-blue-100 text-blue-700',
        swamiji: 'bg-orange-100 text-orange-700',
        worker: 'bg-gray-100 text-gray-700',
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">🔐 Authorized Users</h1>
                <p className="text-gray-600">Manage Gmail whitelist and user roles</p>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`mb-4 p-4 rounded-xl ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {notification.message}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <div className="text-lg font-bold text-gray-800">{users.length}</div>
                    <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <div className="text-lg font-bold text-green-600">{users.filter(u => u.is_active).length}</div>
                    <div className="text-sm text-gray-600">Active</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <div className="text-lg font-bold text-purple-600">{users.filter(u => u.role === 'admin').length}</div>
                    <div className="text-sm text-gray-600">Admins</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <div className="text-lg font-bold text-gray-600">{users.filter(u => u.role === 'worker').length}</div>
                    <div className="text-sm text-gray-600">Workers</div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="🔍 Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none"
                    />

                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'active', 'inactive', 'admin', 'manager', 'swamiji', 'worker'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl capitalize transition-all ${filter === f
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Add User Button */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                    >
                        ➕ Add User
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No users found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Gmail</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Last Login</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{user.full_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.gmail}</td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${roleColors[user.role]}`}
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="manager">Manager</option>
                                                <option value="swamiji">Swamiji</option>
                                                <option value="worker">Worker</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleActive(user.id, user.is_active)}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${user.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {user.is_active ? '✓ Active' : '✗ Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.gmail)}
                                                className="text-red-600 hover:text-red-800 font-semibold text-sm"
                                            >
                                                🗑️ Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">➕ Add Authorized User</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gmail Address *</label>
                                <input
                                    type="email"
                                    value={newUser.gmail}
                                    onChange={(e) => setNewUser({ ...newUser, gmail: e.target.value })}
                                    placeholder="user@gmail.com"
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    value={newUser.full_name}
                                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none"
                                >
                                    <option value="worker">Worker</option>
                                    <option value="manager">Manager</option>
                                    <option value="swamiji">Swamiji</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowAddModal(false); setNewUser({ gmail: '', full_name: '', role: 'worker' }); }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                            >
                                Add User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
