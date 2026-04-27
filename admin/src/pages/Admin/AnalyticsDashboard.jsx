import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#5562ea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

const KpiCard = ({ icon, label, value, sub, color = 'indigo' }) => {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600',
        green: 'bg-emerald-50 text-emerald-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        red: 'bg-red-50 text-red-600',
    }
    return (
        <div className='bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow'>
            <div className={`text-3xl w-14 h-14 flex items-center justify-center rounded-xl ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className='text-2xl font-bold text-gray-800'>{value}</p>
                <p className='text-sm text-gray-500'>{label}</p>
                {sub && <p className='text-xs text-gray-400 mt-0.5'>{sub}</p>}
            </div>
        </div>
    )
}

const AnalyticsDashboard = () => {
    const { aToken } = useContext(AdminContext)
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/analytics', { headers: { aToken } })
            if (data.success) setAnalytics(data.analytics)
            else toast.error(data.message)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { if (aToken) load() }, [aToken])

    if (loading) {
        return (
            <div className='flex items-center justify-center h-64'>
                <div className='animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent' />
            </div>
        )
    }

    if (!analytics) return null

    const { summary, revenueByMonth, appointmentsBySpeciality, topDoctors } = analytics

    const formatCurrency = (v) => `₹${v?.toLocaleString('en-IN') || 0}`

    return (
        <div className='m-5 space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold text-gray-800'>Analytics</h1>
                    <p className='text-sm text-gray-500 mt-0.5'>Platform performance overview</p>
                </div>
                <button onClick={load} className='text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all'>
                    🔄 Refresh
                </button>
            </div>

            {/* ── KPI Cards ── */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                <KpiCard icon='💰' label='Total Revenue' value={formatCurrency(summary.totalRevenue)} color='green' />
                <KpiCard icon='📅' label='Total Appointments' value={summary.totalAppointments.toLocaleString()} color='indigo' />
                <KpiCard icon='✅' label='Completion Rate' value={`${summary.completionRate}%`} sub={`${summary.completedCount} completed`} color='green' />
                <KpiCard icon='❌' label='Cancellations' value={summary.cancelledCount.toLocaleString()} color='red' />
                <KpiCard icon='🩺' label='Doctors' value={summary.totalDoctors.toLocaleString()} color='indigo' />
                <KpiCard icon='👥' label='Patients' value={summary.totalPatients.toLocaleString()} color='yellow' />
            </div>

            {/* ── Revenue Line Chart ── */}
            {revenueByMonth.length > 0 && (
                <div className='bg-white rounded-xl border border-gray-100 p-5'>
                    <p className='font-semibold text-gray-700 mb-4'>Revenue & Appointments (Last 6 Months)</p>
                    <ResponsiveContainer width='100%' height={260}>
                        <LineChart data={revenueByMonth}>
                            <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                            <XAxis dataKey='month' tick={{ fontSize: 12 }} />
                            <YAxis yAxisId='left' tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                            <YAxis yAxisId='right' orientation='right' tick={{ fontSize: 12 }} />
                            <Tooltip
                                formatter={(value, name) => name === 'revenue' ? [formatCurrency(value), 'Revenue'] : [value, 'Appointments']}
                            />
                            <Legend />
                            <Line yAxisId='left' type='monotone' dataKey='revenue' stroke='#5562ea' strokeWidth={2} dot={{ r: 4 }} name='revenue' />
                            <Line yAxisId='right' type='monotone' dataKey='appointments' stroke='#10b981' strokeWidth={2} dot={{ r: 4 }} name='appointments' />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                {/* ── Appointments by Speciality (Pie) ── */}
                {appointmentsBySpeciality.length > 0 && (
                    <div className='bg-white rounded-xl border border-gray-100 p-5'>
                        <p className='font-semibold text-gray-700 mb-4'>Appointments by Speciality</p>
                        <ResponsiveContainer width='100%' height={260}>
                            <PieChart>
                                <Pie
                                    data={appointmentsBySpeciality}
                                    cx='50%' cy='50%'
                                    innerRadius={60} outerRadius={100}
                                    dataKey='value' nameKey='name'
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {appointmentsBySpeciality.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => [v, 'Appointments']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* ── Top Doctors (Bar) ── */}
                {topDoctors.length > 0 && (
                    <div className='bg-white rounded-xl border border-gray-100 p-5'>
                        <p className='font-semibold text-gray-700 mb-4'>Top Doctors by Appointments</p>
                        <ResponsiveContainer width='100%' height={260}>
                            <BarChart data={topDoctors} layout='vertical'>
                                <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                                <XAxis type='number' tick={{ fontSize: 12 }} />
                                <YAxis dataKey='name' type='category' tick={{ fontSize: 11 }} width={100} />
                                <Tooltip formatter={(v, n) => n === 'revenue' ? [formatCurrency(v), 'Revenue'] : [v, 'Appointments']} />
                                <Legend />
                                <Bar dataKey='appointments' fill='#5562ea' radius={[0, 4, 4, 0]} name='appointments' />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* ── Top Doctors Table ── */}
            {topDoctors.length > 0 && (
                <div className='bg-white rounded-xl border border-gray-100 overflow-hidden'>
                    <div className='px-5 py-4 border-b'>
                        <p className='font-semibold text-gray-700'>Top Performing Doctors</p>
                    </div>
                    <table className='w-full text-sm'>
                        <thead className='bg-gray-50'>
                            <tr>
                                {['Doctor', 'Speciality', 'Appointments', 'Revenue'].map(h => (
                                    <th key={h} className='px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {topDoctors.map((d, i) => (
                                <tr key={i} className='border-t hover:bg-gray-50 transition-colors'>
                                    <td className='px-5 py-3 font-medium text-gray-800'>{d.name}</td>
                                    <td className='px-5 py-3 text-gray-600'>{d.speciality}</td>
                                    <td className='px-5 py-3 text-indigo-600 font-semibold'>{d.appointments}</td>
                                    <td className='px-5 py-3 text-emerald-600 font-semibold'>{formatCurrency(d.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {revenueByMonth.length === 0 && appointmentsBySpeciality.length === 0 && (
                <div className='bg-white rounded-xl border border-gray-100 p-12 text-center'>
                    <p className='text-4xl mb-3'>📊</p>
                    <p className='text-gray-500'>No appointment data yet. Charts will appear once appointments are booked.</p>
                </div>
            )}
        </div>
    )
}

export default AnalyticsDashboard
