'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface AttendanceRecord {
    id: string;
    worker_name: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
    hours_worked: number;
}

export default function AttendancePage() {
    const supabase = createClient();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadAttendance();
    }, [selectedDate]);

    async function loadAttendance() {
        setLoading(true);
        try {
            // Get all workers
            const { data: workers } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('role', 'worker')
                .eq('is_active', true);

            // Get attendance for selected date
            const { data: attendance } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', selectedDate);

            // Merge data
            const recordsList: AttendanceRecord[] = (workers || []).map(w => {
                const att = attendance?.find(a => a.worker_id === w.id);
                let hoursWorked = 0;

                if (att?.check_in_time && att?.check_out_time) {
                    const checkIn = new Date(att.check_in_time);
                    const checkOut = new Date(att.check_out_time);
                    hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                } else if (att?.check_in_time) {
                    const checkIn = new Date(att.check_in_time);
                    hoursWorked = (new Date().getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                }

                return {
                    id: att?.id || w.id,
                    worker_name: w.name,
                    date: selectedDate,
                    check_in_time: att?.check_in_time || null,
                    check_out_time: att?.check_out_time || null,
                    status: att?.status || 'absent',
                    hours_worked: hoursWorked,
                };
            });

            setRecords(recordsList);
        } catch (err) {
            console.error('Error loading attendance:', err);
        } finally {
            setLoading(false);
        }
    }

    function formatTime(isoString: string | null): string {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    function getStatusBadge(status: string) {
        const styles: Record<string, string> = {
            present: 'bg-green-100 text-green-700',
            late: 'bg-orange-100 text-orange-700',
            absent: 'bg-gray-100 text-gray-500',
            field: 'bg-blue-100 text-blue-700',
            event: 'bg-purple-100 text-purple-700',
            completed: 'bg-green-100 text-green-700',
            undertime: 'bg-red-100 text-red-700',
            early_approved: 'bg-blue-100 text-blue-700',
            overtime: 'bg-amber-100 text-amber-700',
        };
        return styles[status] || 'bg-gray-100 text-gray-500';
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📅 Attendance Records</h1>
                    <p className="text-gray-500">Daily check-in/out history</p>
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="text-2xl font-bold text-gray-800">{records.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Present</p>
                    <p className="text-2xl font-bold text-green-600">
                        {records.filter(r => r.status !== 'absent').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Late</p>
                    <p className="text-2xl font-bold text-orange-500">
                        {records.filter(r => r.status === 'late').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                    <p className="text-xs text-gray-500 uppercase">Absent</p>
                    <p className="text-2xl font-bold text-red-500">
                        {records.filter(r => r.status === 'absent').length}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-4 font-medium text-gray-600">Worker</th>
                                <th className="text-left p-4 font-medium text-gray-600">Check In</th>
                                <th className="text-left p-4 font-medium text-gray-600">Check Out</th>
                                <th className="text-left p-4 font-medium text-gray-600">Hours</th>
                                <th className="text-left p-4 font-medium text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-400">No records found</td>
                                </tr>
                            ) : (
                                records.map(record => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-800">{record.worker_name}</td>
                                        <td className="p-4 text-gray-600">{formatTime(record.check_in_time)}</td>
                                        <td className="p-4 text-gray-600">{formatTime(record.check_out_time)}</td>
                                        <td className="p-4 text-gray-600">
                                            {record.hours_worked > 0 ? record.hours_worked.toFixed(1) + 'h' : '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
