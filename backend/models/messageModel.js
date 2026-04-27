import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
    appointmentId: { type: String, required: true },
    senderId: { type: String, required: true },
    senderRole: { type: String, enum: ['user', 'doctor'], required: true },
    senderName: { type: String, default: '' },
    message: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now }
})

messageSchema.index({ appointmentId: 1, createdAt: 1 })

const messageModel = mongoose.models.message || mongoose.model('message', messageSchema)
export default messageModel
