import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },
    slots_booked: { type: Object, default: {} },
    address: { type: Object, required: true },
    date: { type: Number, required: true },

    // ── Doctor Schedule ────────────────────────────────────────────────────────
    schedule: {
        workDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun … 6=Sat
        startHour: { type: Number, default: 10 },   // 10 AM
        endHour: { type: Number, default: 21 },   // 9 PM
        slotDuration: { type: Number, default: 30 },   // minutes
    },

    // ── Ratings (denormalized for fast display) ────────────────────────────────
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    // ── SaaS Subscription ──────────────────────────────────────────────────────
    isPro: { type: Boolean, default: false },

}, { minimize: false })

// ─── Indexes for query performance ────────────────────────────────────────────
doctorSchema.index({ speciality: 1, available: 1 }) // filtering by speciality + availability
doctorSchema.index({ email: 1 }, { unique: true })  // ensured at index level too

const doctorModel = mongoose.models.doctor || mongoose.model("doctor", doctorSchema);
export default doctorModel;