import express from 'express';
import {
    loginDoctor, appointmentsDoctor, appointmentCancel,
    doctorList, changeAvailablity, appointmentComplete,
    doctorDashboard, doctorProfile, updateDoctorProfile, updateSchedule
} from '../controllers/doctorController.js';
import { savePrescription, getPrescription } from '../controllers/prescriptionController.js';
import authDoctor from '../middleware/authDoctor.js';

const doctorRouter = express.Router();

// ─── Auth ──────────────────────────────────────────────────────────────────────
doctorRouter.post("/login", loginDoctor)

// ─── Public ────────────────────────────────────────────────────────────────────
doctorRouter.get("/list", doctorList)

// ─── Protected ─────────────────────────────────────────────────────────────────
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor)
doctorRouter.post("/cancel-appointment", authDoctor, appointmentCancel)
doctorRouter.post("/complete-appointment", authDoctor, appointmentComplete)
doctorRouter.post("/change-availability", authDoctor, changeAvailablity)
doctorRouter.get("/dashboard", authDoctor, doctorDashboard)
doctorRouter.get("/profile", authDoctor, doctorProfile)
doctorRouter.post("/update-profile", authDoctor, updateDoctorProfile)
doctorRouter.post("/update-schedule", authDoctor, updateSchedule)

// ─── Prescriptions ─────────────────────────────────────────────────────────────
doctorRouter.post("/prescription", authDoctor, savePrescription)
doctorRouter.get("/prescription/:appointmentId", authDoctor, getPrescription)

export default doctorRouter;