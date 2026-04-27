import reviewModel from '../models/reviewModel.js'
import appointmentModel from '../models/appointmentModel.js'
import doctorModel from '../models/doctorModel.js'

// ─── Submit a review (patient only, after completed appointment) ───────────────
export const addReview = async (req, res) => {
    try {
        const { userId, appointmentId, rating, comment } = req.body

        if (!appointmentId || !rating) {
            return res.status(400).json({ success: false, message: 'appointmentId and rating are required' })
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })
        }

        // Verify the appointment belongs to this user and is completed
        const appointment = await appointmentModel.findById(appointmentId)
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }
        if (appointment.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' })
        }
        if (!appointment.isCompleted) {
            return res.status(400).json({ success: false, message: 'You can only review a completed appointment' })
        }

        // Create review (unique constraint on appointmentId handles duplicates)
        const review = await reviewModel.create({
            appointmentId,
            userId,
            docId: appointment.docId,
            rating: Number(rating),
            comment: comment?.trim().slice(0, 500) || '',
        })

        // Recalculate and update denormalized rating on the doctor
        const stats = await reviewModel.aggregate([
            { $match: { docId: appointment.docId } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ])

        if (stats.length > 0) {
            await doctorModel.findByIdAndUpdate(appointment.docId, {
                averageRating: Math.round(stats[0].avg * 10) / 10,
                totalReviews: stats[0].count
            })
        }

        res.status(201).json({ success: true, message: 'Review submitted. Thank you!', review })

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'You have already reviewed this appointment' })
        }
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Get all reviews for a doctor (public) ────────────────────────────────────
export const getDoctorReviews = async (req, res) => {
    try {
        const { docId } = req.params
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10

        const [reviews, total] = await Promise.all([
            reviewModel.find({ docId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            reviewModel.countDocuments({ docId })
        ])

        res.json({ success: true, reviews, total, page, pages: Math.ceil(total / limit) })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Get the review for a specific appointment (for "already reviewed" check) ─
export const getAppointmentReview = async (req, res) => {
    try {
        const { appointmentId } = req.params
        const review = await reviewModel.findOne({ appointmentId }).lean()
        res.json({ success: true, review: review || null })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}
