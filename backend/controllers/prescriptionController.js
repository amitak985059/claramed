import prescriptionModel from '../models/prescriptionModel.js'
import appointmentModel from '../models/appointmentModel.js'

// ─── Doctor: Create / Update Prescription ─────────────────────────────────────
export const savePrescription = async (req, res) => {
    try {
        const { docId, appointmentId, diagnosis, medicines, notes, followUpDate } = req.body

        if (!appointmentId) {
            return res.status(400).json({ success: false, message: 'appointmentId is required' })
        }

        // Verify appointment belongs to this doctor and is completed
        const appointment = await appointmentModel.findById(appointmentId)
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }
        if (appointment.docId !== docId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' })
        }
        if (!appointment.isCompleted) {
            return res.status(400).json({ success: false, message: 'Prescription can only be added for completed appointments' })
        }

        // Upsert — create or update if already exists
        const prescription = await prescriptionModel.findOneAndUpdate(
            { appointmentId },
            {
                docId,
                userId: appointment.userId,
                diagnosis: diagnosis?.trim() || '',
                medicines: medicines || [],
                notes: notes?.trim() || '',
                followUpDate: followUpDate || '',
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        )

        res.json({ success: true, message: 'Prescription saved successfully', prescription })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Get prescription for an appointment (doctor or patient) ──────────────────
export const getPrescription = async (req, res) => {
    try {
        const { appointmentId } = req.params
        const prescription = await prescriptionModel.findOne({ appointmentId }).lean()

        if (!prescription) {
            return res.json({ success: true, prescription: null })
        }

        res.json({ success: true, prescription })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Patient: Get all their prescriptions ─────────────────────────────────────
export const myPrescriptions = async (req, res) => {
    try {
        const { userId } = req.body
        const prescriptions = await prescriptionModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .lean()
        res.json({ success: true, prescriptions })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}
