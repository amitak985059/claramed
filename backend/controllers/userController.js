import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from 'cloudinary'
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import medicalRecordModel from "../models/medicalRecordModel.js";
import stripe from "stripe";
import razorpay from 'razorpay';
import { sendBookingConfirmation, sendCancellationEmail } from '../utils/emailService.js'

// Gateway Initialize
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// ─── Helper: issue short-lived access token ───────────────────────────────────
const signAccessToken = (id) =>
    jwt.sign({ id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' })

// ─── Register ─────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Missing Details' })
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" })
        }

        const existing = await userModel.findOne({ email })
        if (existing) {
            return res.status(409).json({ success: false, message: "Email already registered" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        const newUser = new userModel({ name, email, password: hashedPassword })
        const user = await newUser.save()

        const token = signAccessToken(user._id)
        res.status(201).json({ success: true, token })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Login ────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            // Don't reveal whether the email exists
            return res.status(401).json({ success: false, message: "Invalid email or password" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" })
        }

        const token = signAccessToken(user._id)
        res.json({ success: true, token })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const { userId } = req.body
        const userData = await userModel.findById(userId).select('-password')
        if (!userData) return res.status(404).json({ success: false, message: 'User not found' })
        res.json({ success: true, userData })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.status(400).json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
            await userModel.findByIdAndUpdate(userId, { image: imageUpload.secure_url })
        }

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Book Appointment (atomic slot claim) ─────────────────────────────────────
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body

        const updatedDoctor = await doctorModel.findOneAndUpdate(
            {
                _id: docId,
                available: true,
                [`slots_booked.${slotDate}`]: { $not: { $elemMatch: { $eq: slotTime } } }
            },
            { $push: { [`slots_booked.${slotDate}`]: slotTime } },
            { new: true }
        )

        if (!updatedDoctor) {
            const doctor = await doctorModel.findById(docId).select('available')
            if (!doctor || !doctor.available) {
                return res.status(409).json({ success: false, message: 'Doctor Not Available' })
            }
            return res.status(409).json({ success: false, message: 'Slot Not Available' })
        }

        const userData = await userModel.findById(userId).select("-password")
        const docData = { ...updatedDoctor.toObject() }
        delete docData.slots_booked

        const newAppointment = new appointmentModel({
            userId, docId, userData, docData,
            amount: updatedDoctor.fees, slotTime, slotDate, date: Date.now()
        })
        await newAppointment.save()

        // ── Send confirmation email (non-blocking) ────────────────────────────
        const [day, month, year] = slotDate.split('_')
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const formattedDate = `${day} ${months[Number(month) - 1]} ${year}`
        sendBookingConfirmation({
            patientEmail: userData.email,
            patientName: userData.name,
            doctorName: updatedDoctor.name,
            speciality: updatedDoctor.speciality,
            slotDate: formattedDate,
            slotTime,
            fees: updatedDoctor.fees,
        })

        res.status(201).json({ success: true, message: 'Appointment Booked' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Cancel Appointment ───────────────────────────────────────────────────────
const cancelAppointment = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }
        if (appointmentData.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        const { docId, slotDate, slotTime } = appointmentData
        await doctorModel.findByIdAndUpdate(docId, {
            $pull: { [`slots_booked.${slotDate}`]: slotTime }
        })

        // ── Send cancellation email (non-blocking) ────────────────────────────
        const [day, month, year] = slotDate.split('_')
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        sendCancellationEmail({
            patientEmail: appointmentData.userData.email,
            patientName: appointmentData.userData.name,
            doctorName: appointmentData.docData.name,
            slotDate: `${day} ${months[Number(month) - 1]} ${year}`,
            slotTime,
        })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── List User Appointments ───────────────────────────────────────────────────
const listAppointment = async (req, res) => {
    try {
        const { userId } = req.body
        const appointments = await appointmentModel
            .find({ userId })
            .sort({ date: -1 })
            .limit(50)
        res.json({ success: true, appointments })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Razorpay: Create Order ───────────────────────────────────────────────────
const paymentRazorpay = async (req, res) => {
    try {
        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.status(400).json({ success: false, message: 'Appointment cancelled or not found' })
        }

        const options = {
            amount: appointmentData.amount * 100,
            currency: process.env.CURRENCY,
            receipt: appointmentId,
        }
        const order = await razorpayInstance.orders.create(options)
        res.json({ success: true, order })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Razorpay: Verify Payment (HMAC signature check) ─────────────────────────
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment details' })
        }

        // Cryptographic HMAC-SHA256 signature verification
        const body = razorpay_order_id + "|" + razorpay_payment_id
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex')

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' })
        }

        // Signature valid — fetch the order to get the appointment ID
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
        await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true })
        res.json({ success: true, message: 'Payment Successful' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Stripe: Create Checkout Session ─────────────────────────────────────────
const paymentStripe = async (req, res) => {
    try {
        const { appointmentId } = req.body
        const { origin } = req.headers

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (!appointmentData || appointmentData.cancelled) {
            return res.status(400).json({ success: false, message: 'Appointment cancelled or not found' })
        }

        const currency = process.env.CURRENCY.toLowerCase()
        const line_items = [{
            price_data: {
                currency,
                product_data: { name: "Appointment Fees" },
                unit_amount: appointmentData.amount * 100
            },
            quantity: 1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
            cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
            line_items,
            mode: 'payment',
        })

        res.json({ success: true, session_url: session.url })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── Stripe: Verify Payment ───────────────────────────────────────────────────
const verifyStripe = async (req, res) => {
    try {
        const { appointmentId, success } = req.body

        if (success === "true") {
            await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true })
            return res.json({ success: true, message: 'Payment Successful' })
        }

        res.json({ success: false, message: 'Payment Failed' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ─── AI Smart Records ───────────────────────────────────────────────────────────
const uploadMedicalRecord = async (req, res) => {
    try {
        const { userId, title } = req.body;
        const imageFile = req.file;

        if (!title || !imageFile) {
            return res.status(400).json({ success: false, message: "Missing title or file" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ success: false, message: "GEMINI_API_KEY is not configured on the backend." });
        }

        // Upload to cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });

        // Summarize with Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const imagePart = {
            inlineData: {
                data: Buffer.from(fs.readFileSync(imageFile.path)).toString("base64"),
                mimeType: imageFile.mimetype || "image/jpeg"
            }
        };

        const prompt = "You are a medical assistant AI. Read this medical document/lab report. Extract key anomalies, high/low values, and provide a short summary for a doctor. Use bullet points.";
        const result = await model.generateContent([prompt, imagePart]);
        const summary = result.response.text();

        const newRecord = new medicalRecordModel({
            userId,
            title,
            fileUrl: imageUpload.secure_url,
            summary,
            date: Date.now()
        });

        await newRecord.save();
        res.status(201).json({ success: true, message: "Record uploaded and summarized", record: newRecord });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const getMedicalRecords = async (req, res) => {
    try {
        const { userId } = req.body; 
        const records = await medicalRecordModel.find({ userId }).sort({ date: -1 });
        // Populate doctor names if possible, but for MVP just return records
        res.json({ success: true, records });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const requestReportReview = async (req, res) => {
    try {
        const { userId, recordId, docId } = req.body;
        const record = await medicalRecordModel.findById(recordId);
        if (!record || record.userId !== userId) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }
        record.docId = docId;
        record.status = 'Pending Review';
        await record.save();
        res.json({ success: true, message: "Review requested successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export {
    loginUser, registerUser, getProfile, updateProfile,
    bookAppointment, listAppointment, cancelAppointment,
    paymentRazorpay, verifyRazorpay, paymentStripe, verifyStripe,
    uploadMedicalRecord, getMedicalRecords, requestReportReview
}