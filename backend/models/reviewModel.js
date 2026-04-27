import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'appointment',
        required: true,
        unique: true          // one review per appointment, enforced at DB level
    },
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
})

// ─── Indexes ──────────────────────────────────────────────────────────────────
reviewSchema.index({ docId: 1, createdAt: -1 })  // fetch reviews for a doctor
reviewSchema.index({ userId: 1 })                 // fetch user's reviews

const reviewModel = mongoose.models.review || mongoose.model("review", reviewSchema)
export default reviewModel
