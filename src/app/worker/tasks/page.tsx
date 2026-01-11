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
    is_custom: boolean;
}

export default function WorkerTasksPage() {
    const supabase = createClient();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '' });
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

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

        // Load tasks assigned to this worker
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', profile.id)
            .order('created_at', { ascending: false });

        setTasks((tasksData || []).map(t => ({
            ...t,
            is_custom: t.assigned_by === profile.id, // Custom if assigned by self
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
            assigned_by: workerId, // Self-assigned
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
        return true;
    });

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const pendingCount = tasks.filter(t => t.status !== 'completed').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📋 My Tasks</h1>
                    <p className="text-gray-500">{completedCount}/{tasks.length} completed</p>
                </div>
                <button
                    onClick={() => setShowAddTask(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium"
                >
                    + Add Custom Task
                </button>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl p-4 shadow">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Today's Progress</span>
                    <span className="font-medium text-gray-700">{tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                        style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
                    ></div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(['all', 'pending', 'completed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl capitalize transition ${filter === f ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {f} {f === 'pending' ? `(${pendingCount})` : f === 'completed' ? `(${completedCount})` : ''}
                    </button>
                ))}
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
                {loading ? (
                    <p className="text-gray-400 text-center py-8">Loading...</p>
                ) : filteredTasks.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                        {filter === 'all' ? 'No tasks yet. Add a custom task or wait for admin to assign.' : `No ${filter} tasks`}
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className="bg-white rounded-xl shadow p-4">
                            <div className="flex items-start gap-4">
                                <button
                                    onClick={() => toggleTaskStatus(task.id, task.status)}
                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition ${task.status === 'completed'
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : 'border-gray-300 hover:border-green-400'
                                        }`}
                                >
                                    {task.status === 'completed' && '✓'}
                                </button>

                                <div className="flex-1">
                                    <p className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                        {task.title}
                                    </p>
                                    {task.description && (
                                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {task.is_custom && (
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Custom</span>
                                        )}
                                        {(task.priority === 'high' || task.priority === 'urgent') && (
                                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Critical</span>
                                        )}
                                        {task.due_date && (
                                            <span className="text-xs text-gray-400">📅 {task.due_date}</span>
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
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Add Custom Task</h3>
                        <p className="text-sm text-gray-500 mb-4">Track additional work you're doing today</p>

                        <div className="space-y-4">
                            <input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-xl"
                                placeholder="What are you working on?"
                            />
                            <textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-xl min-h-[80px]"
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
