'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface ReportData {
    totalWorkers: number;
    avgAttendance: number;
    avgHoursWorked: number;
    monthlyStats: { month: string; present: number; late: number; absent: number }[];
    topWorkers: { name: string; hours: number; attendance: number }[];
}

export default function AdminReportsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    const [report, setReport] = useState<ReportData>({
        totalWorkers: 0,
        avgAttendance: 0,
        avgHoursWorked: 0,
        monthlyStats: [],
        topWorkers: [],
    });

    useEffect(() => {
        loadReportData();
    }, [dateRange]);

    async function loadReportData() {
        setLoading(true);
        try {
            // Get workers
            const { data: workers, count: totalWorkers } = await supabase
                .from('profiles')
                .select('id, name', { count: 'exact' })
                .eq('role', 'worker')
                .eq('is_active', true);

            // Get attendance for date range
            const { data: attendance } = await supabase
                .from('attendance')
                .select('*')
                .gte('date', dateRange.start)
                .lte('date', dateRange.end);

            // Calculate stats
            const presentDays = attendance?.filter(a => a.status !== 'absent').length || 0;
            const totalPossibleDays = (workers?.length || 0) * getDaysBetween(dateRange.start, dateRange.end);
            const avgAttendance = totalPossibleDays > 0 ? (presentDays / totalPossibleDays) * 100 : 0;

            // Calculate hours worked
            let totalHours = 0;
            attendance?.forEach(a => {
                if (a.check_in_time && a.check_out_time) {
                    totalHours += (new Date(a.check_out_time).getTime() - new Date(a.check_in_time).getTime()) / (1000 * 60 * 60);
                }
            });
            const avgHoursWorked = presentDays > 0 ? totalHours / presentDays : 0;

            // Top workers by hours
            const workerHours: Record<string, { name: string; hours: number; days: number }> = {};
            (workers || []).forEach(w => {
                workerHours[w.id] = { name: w.name, hours: 0, days: 0 };
            });
            attendance?.forEach(a => {
                if (workerHours[a.worker_id] && a.check_in_time && a.check_out_time) {
                    const hours = (new Date(a.check_out_time).getTime() - new Date(a.check_in_time).getTime()) / (1000 * 60 * 60);
                    workerHours[a.worker_id].hours += hours;
                    workerHours[a.worker_id].days += 1;
                }
            });

            const topWorkers = Object.values(workerHours)
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 5)
                .map(w => ({
                    name: w.name,
                    hours: Math.round(w.hours * 10) / 10,
                    attendance: w.days,
                }));

            setReport({
                totalWorkers: totalWorkers || 0,
                avgAttendance: Math.round(avgAttendance),
                avgHoursWorked: Math.round(avgHoursWorked * 10) / 10,
                monthlyStats: [],
                topWorkers,
            });

        } catch (err) {
            console.error('Error loading report:', err);
        } finally {
            setLoading(false);
        }
    }

    function getDaysBetween(start: string, end: string): number {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📈 Reports</h1>
                    <p className="text-gray-600">Attendance and performance analytics</p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-xl text-gray-900"
                    />
                    <span className="py-2 text-gray-700">to</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-xl text-gray-900"
                    />
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 shadow">
                    <p className="text-sm text-gray-600">Total Workers</p>
                    <p className="text-3xl font-bold text-gray-900">{report.totalWorkers}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow">
                    <p className="text-sm text-gray-600">Avg Attendance</p>
                    <p className="text-3xl font-bold text-green-600">{report.avgAttendance}%</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow">
                    <p className="text-sm text-gray-600">Avg Hours/Day</p>
                    <p className="text-3xl font-bold text-blue-600">{report.avgHoursWorked}h</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow">
                    <p className="text-sm text-gray-600">Date Range</p>
                    <p className="text-xl font-bold text-gray-900">{getDaysBetween(dateRange.start, dateRange.end)} days</p>
                </div>
            </div>

            {/* Top Workers */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Workers by Hours</h2>

                {report.topWorkers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No data for this period</p>
                ) : (
                    <div className="space-y-3">
                        {report.topWorkers.map((worker, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-blue-400'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <p className="font-medium text-gray-900">{worker.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">{worker.hours}h</p>
                                    <p className="text-sm text-gray-600">{worker.attendance} days</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Export */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h2>
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition">
                        📊 Export CSV
                    </button>
                    <button className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition">
                        📄 Export PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
