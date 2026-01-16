'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Task {
    id: string;
    title: string;
    description: string | null;
    assigned_to: string | null;
    assigned_to_name: string;
    priority: string;
    status: string;
    due_date: string | null;
    created_at: string;
}

interface Worker {
    id: string;
    name: string;
}

export default function TasksPage() {
    const supabase = createClient();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'medium' | 'important' | 'urgent'>('all');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        due_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);

        // Load workers - removed is_active filter to avoid column not found error
        const { data: workersData, error: workersError } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('role', 'worker');

        console.log('Workers loaded:', workersData, 'Error:', workersError);
        setWorkers(workersData || []);

        // Load tasks
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        const tasksList: Task[] = (tasksData || []).map(t => ({
            ...t,
            assigned_to_name: workersData?.find(w => w.id === t.assigned_to)?.name || 'Unassigned',
        }));
        setTasks(tasksList);
        setLoading(false);
    }

    async function addTask() {
        if (!formData.title) {
            alert('Please enter a task title');
            return;
        }

        await supabase.from('tasks').insert({
            title: formData.title,
            description: formData.description || null,
            assigned_to: formData.assigned_to || null,
            priority: formData.priority,
            due_date: formData.due_date,
            status: 'pending',
        });

        setShowModal(false);
        setFormData({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: new Date().toISOString().split('T')[0] });
        loadData();
    }

    async function updateTaskStatus(taskId: string, status: string) {
        await supabase.from('tasks').update({
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
        }).eq('id', taskId);
        loadData();
    }

    async function deleteTask(taskId: string) {
        if (!confirm('Delete this task?')) return;
        await supabase.from('tasks').delete().eq('id', taskId);
        loadData();
    }

    const filteredTasks = tasks.filter(t => {
        // Status filter
        if (filter === 'pending' && t.status === 'completed') return false;
        if (filter === 'completed' && t.status !== 'completed') return false;

        // Priority filter
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

        return true;
    });

    function getPriorityBadge(priority: string) {
        const badges: Record<string, { bg: string; text: string; emoji: string }> = {
            urgent: { bg: 'bg-red-100', text: 'text-red-700', emoji: '🔴' },
            important: { bg: 'bg-yellow-100', text: 'text-yellow-700', emoji: '🟡' },
            medium: { bg: 'bg-green-100', text: 'text-green-700', emoji: '🟢' },
        };
        return badges[priority] || badges.medium;
    }

    function getPriorityDot(priority: string) {
        const colors: Record<string, string> = {
            urgent: 'bg-red-500',
            important: 'bg-yellow-500',
            medium: 'bg-green-500',
        };
        return colors[priority] || 'bg-green-500';
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📋 Task Management</h1>
                    <p className="text-gray-500">{tasks.length} total tasks</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium"
                >
                    + Add Task
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 space-y-3">
                <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Status</p>
                    <div className="flex gap-2">
                        {(['all', 'pending', 'completed'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl capitalize transition ${filter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Priority</p>
                    <div className="flex gap-2">
                        {(['all', 'urgent', 'important', 'medium'] as const).map(p => {
                            const badge = p !== 'all' ? getPriorityBadge(p) : null;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPriorityFilter(p)}
                                    className={`px-4 py-2 rounded-xl capitalize transition ${priorityFilter === p ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {badge && <span>{badge.emoji} </span>}
                                    {p}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : filteredTasks.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                        No tasks found
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className="bg-white rounded-xl shadow p-4 border-l-4" style={{ borderColor: task.priority === 'urgent' ? '#EF4444' : task.priority === 'important' ? '#F59E0B' : '#10B981' }}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className={`font-medium text-lg ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                            {task.title}
                                        </p>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(task.priority).bg} ${getPriorityBadge(task.priority).text}`}>
                                            {getPriorityBadge(task.priority).emoji} {task.priority}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                        <span>📅 {task.due_date || 'No due date'}</span>
                                        <span>👤 {task.assigned_to_name}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {task.status !== 'completed' && (
                                    <button
                                        onClick={() => updateTaskStatus(task.id, 'completed')}
                                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                    >
                                        ✓
                                    </button>
                                )}
                                {task.status === 'completed' && (
                                    <button
                                        onClick={() => updateTaskStatus(task.id, 'pending')}
                                        className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                                    >
                                        ↩
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteTask(task.id)}
                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Task Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Task</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Task Title *</label>
                                <input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl"
                                    placeholder="What needs to be done?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl min-h-[80px]"
                                    placeholder="Additional details..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Assign To</label>
                                    <select
                                        value={formData.assigned_to}
                                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl"
                                    >
                                        <option value="">Unassigned</option>
                                        {workers.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl"
                                    >
                                        <option value="medium">🟢 Medium</option>
                                        <option value="important">🟡 Important</option>
                                        <option value="urgent">🔴 Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                            <button onClick={addTask} className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl">Add Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
