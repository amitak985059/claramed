import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";
import { sendCompletionEmail, sendReminderEmail } from "../utils/emailService.js";

// ─── Helper: sign admin token with role claim ─────────────────────────────────
const signAdminToken = () =>
    jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' })

// ─── Admin Login ──────────────────────────────────────────────────────────────
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' })
        }

        // Compare against env credentials (hashed password approach)
        if (email !== process.env.ADMIN_EMAIL) {
            return res.status(401).json({ success: false, message: "Invalid credentials" })
        }

        // Support both plaintext (legacy) and bcrypt-hashed ADMIN_PASSWORD in .env
        let passwordValid = false
        if (process.env.ADMIN_PASSWORD.startsWith('$2')) {
            // Bcrypt hash stored in env
            passwordValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD)
        } else {
            // Plaintext — still works but warn in dev
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[SECURITY] ADMIN_PASSWORD is stored in plaintext. Hash it with bcrypt.')
            }
            passwordValid = (password === process.env.ADMIN_PASSWORD)
        }

        if (!passwordValid) {
            return res.status(401).json({ success: false, message: "Invalid credentials" })
        }

        const token = signAdminToken()
        res.json({ success: true, token })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── All Appointments ─────────────────────────────────────────────────────────
const appointmentsAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20

        const [appointments, total] = await Promise.all([
            appointmentModel.find({}).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
            appointmentModel.countDocuments()
        ])

        res.json({ success: true, appointments, total, page, pages: Math.ceil(total / limit) })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Cancel Appointment (Admin) ───────────────────────────────────────────────
const appointmentCancel = async (req, res) => {
    try {
        const { appointmentId } = req.body
        const appt = await appointmentModel.findById(appointmentId)
        if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // Release the slot atomically
        await doctorModel.findByIdAndUpdate(appt.docId, {
            $pull: { [`slots_booked.${appt.slotDate}`]: appt.slotTime }
        })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Add Doctor ───────────────────────────────────────────────────────────────
const addDoctor = async (req, res) => {
    try {
        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
        const imageFile = req.file

        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.status(400).json({ success: false, message: "Missing Details" })
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" })
        }

        const existing = await doctorModel.findOne({ email })
        if (existing) {
            return res.status(409).json({ success: false, message: "Doctor with this email already exists" })
        }

        if (!imageFile) {
            return res.status(400).json({ success: false, message: "Doctor image is required" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })

        const doctorData = {
            name, email,
            image: imageUpload.secure_url,
            password: hashedPassword,
            speciality, degree, experience, about, fees,
            address: JSON.parse(address),
            date: Date.now()
        }

        await new doctorModel(doctorData).save()
        res.status(201).json({ success: true, message: 'Doctor Added' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── All Doctors ──────────────────────────────────────────────────────────────
const allDoctors = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select('-password')
        res.json({ success: true, doctors })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
const adminDashboard = async (req, res) => {
    try {
        const [doctors, users, appointments] = await Promise.all([
            doctorModel.countDocuments(),
            userModel.countDocuments(),
            appointmentModel.find({}).sort({ date: -1 }).limit(10)
        ])

        const allAppointments = await appointmentModel.find({})
        const revenue = allAppointments.reduce((sum, a) => (a.payment ? sum + a.amount : sum), 0)

        const dashData = {
            doctors,
            patients: users,
            appointments: allAppointments.length,
            revenue,
            latestAppointments: appointments
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Mark Appointment Complete (Admin) ───────────────────────────────────────────────
const appointmentComplete = async (req, res) => {
    try {
        const { appointmentId } = req.body
        const appt = await appointmentModel.findById(appointmentId)
        if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })

        if (appt.cancelled || appt.isCompleted) {
            return res.status(400).json({ success: false, message: 'Cannot mark as complete. Appointment is already completed or cancelled.' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })
        
        const userData = await userModel.findById(appt.userId)
        const doctorData = await doctorModel.findById(appt.docId)

        // Trigger email
        if (userData && doctorData) {
             await sendCompletionEmail({
                patientEmail: userData.email,
                patientName: userData.name,
                doctorName: doctorData.name,
                slotDate: appt.slotDate
            })
        }

        res.json({ success: true, message: 'Appointment Marked Completed' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Send Appointment Reminder (Admin) ───────────────────────────────────────────────
const appointmentReminder = async (req, res) => {
    try {
        const { appointmentId } = req.body
        const appt = await appointmentModel.findById(appointmentId)
        if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })

        if (appt.cancelled || appt.isCompleted) {
            return res.status(400).json({ success: false, message: 'Cannot send reminder for cancelled or completed appointment' })
        }
        
        const userData = await userModel.findById(appt.userId)
        const doctorData = await doctorModel.findById(appt.docId)

        if (userData && doctorData) {
             await sendReminderEmail({
                patientEmail: userData.email,
                patientName: userData.name,
                doctorName: doctorData.name,
                speciality: doctorData.speciality,
                slotDate: appt.slotDate,
                slotTime: appt.slotTime
            })
            res.json({ success: true, message: 'Reminder email sent successfully' })
        } else {
             res.status(404).json({ success: false, message: 'User or Doctor details not found' })
        }

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export { loginAdmin, appointmentsAdmin, appointmentCancel, addDoctor, allDoctors, adminDashboard, appointmentComplete, appointmentReminder }