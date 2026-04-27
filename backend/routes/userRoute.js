import express from 'express';
import {
    loginUser, registerUser, getProfile, updateProfile,
    bookAppointment, listAppointment, cancelAppointment,
    paymentRazorpay, verifyRazorpay, paymentStripe, verifyStripe
} from '../controllers/userController.js';
import { addReview, getDoctorReviews, getAppointmentReview } from '../controllers/reviewController.js';
import upload from '../middleware/multer.js';
import authUser from '../middleware/authUser.js';

const userRouter = express.Router();

// ─── Auth ──────────────────────────────────────────────────────────────────────
userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)

// ─── Profile ───────────────────────────────────────────────────────────────────
userRouter.get("/get-profile", authUser, getProfile)
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile)

// ─── Appointments ──────────────────────────────────────────────────────────────
userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.get("/appointments", authUser, listAppointment)
userRouter.post("/cancel-appointment", authUser, cancelAppointment)

// ─── Payments ──────────────────────────────────────────────────────────────────
userRouter.post("/payment-razorpay", authUser, paymentRazorpay)
userRouter.post("/verifyRazorpay", authUser, verifyRazorpay)
userRouter.post("/payment-stripe", authUser, paymentStripe)
userRouter.post("/verifyStripe", authUser, verifyStripe)

// ─── Reviews ───────────────────────────────────────────────────────────────────
userRouter.post("/add-review", authUser, addReview)
userRouter.get("/review/:appointmentId", authUser, getAppointmentReview)

// ─── Public: doctor reviews (no auth needed) ──────────────────────────────────
userRouter.get("/doctor-reviews/:docId", getDoctorReviews)

export default userRouter;