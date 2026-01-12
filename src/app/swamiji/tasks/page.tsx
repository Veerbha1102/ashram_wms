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
}

export default function SwamijiTasksPage() {
    const supabase = createClient();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [workerName, setWorkerName] = useState('');
    const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });

    useEffect(() => {
        loadWorkerAndTasks();
    }, [filter]);

    async function loadWorkerAndTasks() {
        setLoading(true);

        // Get worker
        const { data: workers } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('role', 'worker')
            .eq('is_active', true)
            .limit(1);

        if (workers && workers.length > 0) {
            setWorkerId(workers[0].id);
            setWorkerName(workers[0].name);

            // Get tasks
            let query = supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to', workers[0].id)
                .order('created_at', { ascending: false });

            if (filter === 'pending') query = query.neq('status', 'completed');
            if (filter === 'completed') query = query.eq('status', 'completed');

            const { data } = await query;
            setTasks(data || []);
        }
        setLoading(false);
    }

    async function addTask() {
        if (!newTask.title.trim() || !workerId) {
            alert('Please enter a task title');
            return;
        }

        await supabase.from('tasks').insert({
            title: newTask.title,
            description: newTask.description || null,
            priority: newTask.priority,
            assigned_to: workerId,
            status: 'pending',
            due_date: new Date().toISOString().split('T')[0],
        });

        setShowAddModal(false);
        setNewTask({ title: '', description: '', priority: 'medium' });
        loadWorkerAndTasks();
    }

    async function deleteTask(taskId: string) {
        if (!confirm('Delete this task?')) return;
        await supabase.from('tasks').delete().eq('id', taskId);
        loadWorkerAndTasks();
    }

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const pendingCount = tasks.filter(t => t.status !== 'completed').length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">📋 Tasks</h2>
                    <p className="text-gray-500 text-sm">Manage {workerName}'s tasks</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium"
                >
                    + Add
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-orange-500">{pendingCount}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-green-500">{completedCount}</p>
                    <p className="text-xs text-gray-500">Done</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                {(['pending', 'completed', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full capitalize text-sm font-medium ${filter === f ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Task List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                        No {filter} tasks
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="bg-white rounded-xl shadow-sm p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${task.status === 'completed' ? 'bg-green-500 text-white' : 'border-2 border-gray-300'
                                            }`}>
                                            {task.status === 'completed' && '✓'}
                                        </span>
                                        <p className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                            {task.title}
                                        </p>
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-gray-500 ml-7">{task.description}</p>
                                    )}
                                    <div className="flex gap-2 mt-2 ml-7">
                                        {(task.priority === 'high' || task.priority === 'urgent') && (
                                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Critical</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteTask(task.id)}
                                    className="text-gray-400 hover:text-red-500 p-1"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Task Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Task</h3>
                        <div className="space-y-3">
                            <input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-xl text-gray-900"
                                placeholder="Task title..."
                            />
                            <textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 min-h-[80px]"
                                placeholder="Details (optional)..."
                            />
                            <select
                                value={newTask.priority}
                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-xl text-gray-900"
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High (Critical)</option>
                            </select>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium">
                                Cancel
                            </button>
                            <button onClick={addTask} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium">
                                Add Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
