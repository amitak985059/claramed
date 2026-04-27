import mongoose from "mongoose"

const appointmentSchema = new mongoose.Schema({
    userId:      { type: String, required: true },
    docId:       { type: String, required: true },
    slotDate:    { type: String, required: true },
    slotTime:    { type: String, required: true },
    userData:    { type: Object, required: true },
    docData:     { type: Object, required: true },
    amount:      { type: Number, required: true },
    date:        { type: Number, required: true },
    cancelled:   { type: Boolean, default: false },
    payment:     { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false }
})

// ─── Indexes for query performance ────────────────────────────────────────────
appointmentSchema.index({ userId: 1, date: -1 })   // user's appointment history
appointmentSchema.index({ docId: 1, slotDate: 1 }) // doctor's slots for a date
appointmentSchema.index({ cancelled: 1, date: -1 }) // admin filtered views
appointmentSchema.index({ payment: 1 })             // payment reconciliation

const appointmentModel = mongoose.models.appointment || mongoose.model("appointment", appointmentSchema)
export default appointmentModel