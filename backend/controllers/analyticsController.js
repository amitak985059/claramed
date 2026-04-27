import appointmentModel from '../models/appointmentModel.js'
import doctorModel from '../models/doctorModel.js'
import userModel from '../models/userModel.js'
import reviewModel from '../models/reviewModel.js'

// ─── Full Analytics for Admin Dashboard ───────────────────────────────────────
export const getAnalytics = async (req, res) => {
    try {
        const now = new Date()
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

        const [
            revenueByMonth,
            appointmentsBySpeciality,
            topDoctors,
            totalRevenue,
            totalAppointments,
            totalDoctors,
            totalPatients,
            completedCount,
            cancelledCount
        ] = await Promise.all([

            // Revenue & appointments per month (last 6 months)
            appointmentModel.aggregate([
                { $match: { date: { $gte: sixMonthsAgo.getTime() } } },
                {
                    $group: {
                        _id: {
                            year: { $year: { $toDate: '$date' } },
                            month: { $month: { $toDate: '$date' } }
                        },
                        revenue: { $sum: { $cond: ['$payment', '$amount', 0] } },
                        appointments: { $sum: 1 },
                        completed: { $sum: { $cond: ['$isCompleted', 1, 0] } },
                        cancelled: { $sum: { $cond: ['$cancelled', 1, 0] } }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),

            // Appointments per speciality
            appointmentModel.aggregate([
                { $match: { cancelled: false } },
                { $group: { _id: '$docData.speciality', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 8 }
            ]),

            // Top 5 doctors by appointment count + revenue
            appointmentModel.aggregate([
                { $match: { cancelled: false } },
                {
                    $group: {
                        _id: '$docId',
                        doctorName: { $first: '$docData.name' },
                        speciality: { $first: '$docData.speciality' },
                        appointments: { $sum: 1 },
                        revenue: { $sum: { $cond: ['$payment', '$amount', 0] } }
                    }
                },
                { $sort: { appointments: -1 } },
                { $limit: 5 }
            ]),

            // Total revenue
            appointmentModel.aggregate([
                { $match: { payment: true } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),

            appointmentModel.countDocuments(),
            doctorModel.countDocuments(),
            userModel.countDocuments(),
            appointmentModel.countDocuments({ isCompleted: true }),
            appointmentModel.countDocuments({ cancelled: true })
        ])

        // Format month labels
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const formattedRevenue = revenueByMonth.map(r => ({
            month: `${MONTHS[r._id.month - 1]} ${r._id.year}`,
            revenue: r.revenue,
            appointments: r.appointments,
            completed: r.completed,
            cancelled: r.cancelled
        }))

        res.json({
            success: true,
            analytics: {
                summary: {
                    totalRevenue: totalRevenue[0]?.total || 0,
                    totalAppointments,
                    totalDoctors,
                    totalPatients,
                    completedCount,
                    cancelledCount,
                    completionRate: totalAppointments > 0
                        ? Math.round((completedCount / totalAppointments) * 100)
                        : 0
                },
                revenueByMonth: formattedRevenue,
                appointmentsBySpeciality: appointmentsBySpeciality.map(s => ({
                    name: s._id || 'Unknown',
                    value: s.count
                })),
                topDoctors: topDoctors.map(d => ({
                    name: d.doctorName,
                    speciality: d.speciality,
                    appointments: d.appointments,
                    revenue: d.revenue
                }))
            }
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}
