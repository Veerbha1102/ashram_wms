'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Task {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    due_date: string | null;
    created_at: string;
    is_custom: boolean;
    is_overdue: boolean;
    is_new: boolean;
}

export default function WorkerTasksPage() {
    const supabase = createClient();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '' });
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');

    useEffect(() => {
        loadWorkerAndTasks();
    }, []);

    async function loadWorkerAndTasks() {
        const token = localStorage.getItem('aakb_device_token');
        if (!token) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('device_token', token)
            .single();

        if (!profile) return;
        setWorkerId(profile.id);

        // Load ALL tasks assigned to this worker (including past due dates)
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', profile.id)
            .order('created_at', { ascending: false });

        const today = new Date().toISOString().split('T')[0];
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        setTasks((tasksData || []).map(t => ({
            ...t,
            is_custom: t.assigned_by === profile.id,
            // Task is overdue if: not completed AND due_date is before today
            is_overdue: t.status !== 'completed' && t.due_date && t.due_date < today,
            // Task is new if created in last 5 minutes
            is_new: t.created_at > fiveMinAgo && t.status === 'pending',
        })));
        setLoading(false);
    }

    async function addCustomTask() {
        if (!newTask.title.trim() || !workerId) {
            alert('Please enter a task title');
            return;
        }

        await supabase.from('tasks').insert({
            title: newTask.title,
            description: newTask.description || null,
            assigned_to: workerId,
            assigned_by: workerId,
            priority: 'medium',
            status: 'pending',
            due_date: new Date().toISOString().split('T')[0],
        });

        setShowAddTask(false);
        setNewTask({ title: '', description: '' });
        loadWorkerAndTasks();
    }

    async function toggleTaskStatus(taskId: string, currentStatus: string) {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

        await supabase.from('tasks').update({
            status: newStatus,
            completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        }).eq('id', taskId);

        loadWorkerAndTasks();
    }

    async function deleteTask(taskId: string) {
        if (!confirm('Delete this task?')) return;
        await supabase.from('tasks').delete().eq('id', taskId);
        loadWorkerAndTasks();
    }

    const filteredTasks = tasks.filter(t => {
        if (filter === 'pending') return t.status !== 'completed';
        if (filter === 'completed') return t.status === 'completed';
        if (filter === 'overdue') return t.is_overdue;
        return true;
    });

    // Sort: overdue first, then new, then by date
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        if (a.is_new && !b.is_new) return -1;
        if (!a.is_new && b.is_new) return 1;
        return 0;
    });

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const pendingCount = tasks.filter(t => t.status !== 'completed').length;
    const overdueCount = tasks.filter(t => t.is_overdue).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📋 My Tasks</h1>
                    <p className="text-gray-600">{completedCount}/{tasks.length} completed</p>
                </div>
                <button
                    onClick={() => setShowAddTask(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium"
                >
                    + Add Custom Task
                </button>
            </div>

            {/* Overdue Alert */}
            {overdueCount > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                    <p className="text-red-700 font-bold">⚠️ {overdueCount} Overdue Task{overdueCount > 1 ? 's' : ''}!</p>
                    <p className="text-red-600 text-sm">Please complete these tasks. They will stay highlighted until done.</p>
                </div>
            )}

            {/* Progress */}
            <div className="bg-white rounded-xl p-4 shadow">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-800">{tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                        style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
                    ></div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto">
                {(['all', 'pending', 'overdue', 'completed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl capitalize whitespace-nowrap transition ${filter === f
                                ? f === 'overdue' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {f} {f === 'pending' ? `(${pendingCount})` : f === 'completed' ? `(${completedCount})` : f === 'overdue' ? `(${overdueCount})` : ''}
                    </button>
                ))}
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
                {loading ? (
                    <p className="text-gray-500 text-center py-8">Loading...</p>
                ) : sortedTasks.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                        {filter === 'all' ? 'No tasks yet. Add a custom task or wait for Swamiji to assign.' : `No ${filter} tasks`}
                    </div>
                ) : (
                    sortedTasks.map(task => (
                        <div
                            key={task.id}
                            className={`rounded-xl shadow p-4 ${task.is_overdue
                                    ? 'bg-red-50 border-2 border-red-400'
                                    : task.is_new
                                        ? 'bg-yellow-50 border-2 border-yellow-400'
                                        : 'bg-white'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <button
                                    onClick={() => toggleTaskStatus(task.id, task.status)}
                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition ${task.status === 'completed'
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : task.is_overdue
                                                ? 'border-red-400 hover:border-red-500'
                                                : 'border-gray-300 hover:border-green-400'
                                        }`}
                                >
                                    {task.status === 'completed' && '✓'}
                                </button>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : task.is_overdue ? 'text-red-700' : 'text-gray-900'}`}>
                                            {task.title}
                                        </p>
                                        {task.is_new && (
                                            <span className="text-xs px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded font-bold">NEW</span>
                                        )}
                                        {task.is_overdue && (
                                            <span className="text-xs px-2 py-0.5 bg-red-500 text-white rounded font-bold">OVERDUE</span>
                                        )}
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {task.is_custom && (
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Custom</span>
                                        )}
                                        {(task.priority === 'high' || task.priority === 'urgent') && (
                                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Critical</span>
                                        )}
                                        {task.due_date && (
                                            <span className={`text-xs ${task.is_overdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                                📅 {task.due_date}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {task.is_custom && (
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="p-2 text-gray-400 hover:text-red-500"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Task Modal */}
            {showAddTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Add Custom Task</h3>
                        <p className="text-sm text-gray-600 mb-4">Track additional work you're doing</p>

                        <div className="space-y-4">
                            <input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-xl text-gray-900"
                                placeholder="What are you working on?"
                            />
                            <textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-xl min-h-[80px] text-gray-900"
                                placeholder="Additional details (optional)"
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddTask(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                            <button onClick={addCustomTask} className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl">Add Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
