import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { sendCompletionEmail } from '../utils/emailService.js'

// ─── Helper: issue short-lived access token ───────────────────────────────────
const signDoctorToken = (id) =>
    jwt.sign({ id, role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: '7d' })

// ─── Doctor Login ─────────────────────────────────────────────────────────────
const loginDoctor = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' })
        }

        const user = await doctorModel.findOne({ email })
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" })
        }

        const token = signDoctorToken(user._id)
        res.json({ success: true, token })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Doctor Appointments ──────────────────────────────────────────────────────
const appointmentsDoctor = async (req, res) => {
    try {
        const { docId } = req.body
        const appointments = await appointmentModel
            .find({ docId })
            .sort({ date: -1 })
            .limit(100)
        res.json({ success: true, appointments })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Cancel Appointment (Doctor) ──────────────────────────────────────────────
const appointmentCancel = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }
        if (appointmentData.docId !== docId) {
            return res.status(403).json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // Release the slot atomically
        await doctorModel.findByIdAndUpdate(docId, {
            $pull: { [`slots_booked.${appointmentData.slotDate}`]: appointmentData.slotTime }
        })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Complete Appointment ─────────────────────────────────────────────────────
const appointmentComplete = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }
        if (appointmentData.docId !== docId) {
            return res.status(403).json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })

        // ── Send completion email prompting patient to leave a review (non-blocking)
        const [day, month, year] = appointmentData.slotDate.split('_')
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        sendCompletionEmail({
            patientEmail: appointmentData.userData.email,
            patientName: appointmentData.userData.name,
            doctorName: appointmentData.docData.name,
            slotDate: `${day} ${months[Number(month) - 1]} ${year}`,
        })

        res.json({ success: true, message: 'Appointment Completed' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── List Doctors (public) ────────────────────────────────────────────────────
const doctorList = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select(['-password', '-email'])
        res.json({ success: true, doctors })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Toggle Availability ──────────────────────────────────────────────────────
const changeAvailablity = async (req, res) => {
    try {
        const { docId } = req.body
        const docData = await doctorModel.findById(docId)
        if (!docData) return res.status(404).json({ success: false, message: 'Doctor not found' })
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({ success: true, message: 'Availability Updated' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Doctor Profile ───────────────────────────────────────────────────────────
const doctorProfile = async (req, res) => {
    try {
        const { docId } = req.body
        const profileData = await doctorModel.findById(docId).select('-password')
        if (!profileData) return res.status(404).json({ success: false, message: 'Doctor not found' })
        res.json({ success: true, profileData })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Update Doctor Profile ────────────────────────────────────────────────────
const updateDoctorProfile = async (req, res) => {
    try {
        const { docId, fees, address, available } = req.body
        if (fees === undefined || !address) {
            return res.status(400).json({ success: false, message: 'Missing required fields' })
        }
        await doctorModel.findByIdAndUpdate(docId, { fees, address, available })
        res.json({ success: true, message: 'Profile Updated' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Doctor Dashboard ─────────────────────────────────────────────────────────
const doctorDashboard = async (req, res) => {
    try {
        const { docId } = req.body
        const appointments = await appointmentModel.find({ docId })

        const earnings = appointments.reduce((sum, item) => {
            return (item.isCompleted || item.payment) ? sum + item.amount : sum
        }, 0)

        const uniquePatients = [...new Set(appointments.map(a => a.userId))]

        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: uniquePatients.length,
            latestAppointments: [...appointments].sort((a, b) => b.date - a.date).slice(0, 10)
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Update Doctor Schedule ───────────────────────────────────────────────────
const updateSchedule = async (req, res) => {
    try {
        const { docId, workDays, startHour, endHour, slotDuration } = req.body

        if (!Array.isArray(workDays) || workDays.some(d => d < 0 || d > 6)) {
            return res.status(400).json({ success: false, message: 'workDays must be an array of 0–6 (Sun–Sat)' })
        }
        if (startHour < 0 || startHour >= endHour || endHour > 23) {
            return res.status(400).json({ success: false, message: 'Invalid startHour / endHour' })
        }
        if (![15, 20, 30, 45, 60].includes(Number(slotDuration))) {
            return res.status(400).json({ success: false, message: 'slotDuration must be 15, 20, 30, 45, or 60 minutes' })
        }

        await doctorModel.findByIdAndUpdate(docId, {
            schedule: { workDays, startHour, endHour, slotDuration: Number(slotDuration) }
        })

        res.json({ success: true, message: 'Schedule updated successfully' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export {
    loginDoctor, appointmentsDoctor, appointmentCancel,
    doctorList, changeAvailablity, appointmentComplete,
    doctorDashboard, doctorProfile, updateDoctorProfile, updateSchedule
}