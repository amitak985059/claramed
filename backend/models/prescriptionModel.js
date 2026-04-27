import mongoose from "mongoose"

const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dosage: { type: String, default: '' },
    duration: { type: String, default: '' },
    notes: { type: String, default: '' }
}, { _id: false })

const prescriptionSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'appointment',
        required: true,
        unique: true          // one prescription per appointment
    },
    docId: { type: String, required: true },
    userId: { type: String, required: true },
    diagnosis: { type: String, default: '' },
    medicines: { type: [medicineSchema], default: [] },
    notes: { type: String, default: '' },      // general doctor notes
    followUpDate: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

prescriptionSchema.index({ docId: 1, createdAt: -1 })
prescriptionSchema.index({ userId: 1 })

const prescriptionModel = mongoose.models.prescription || mongoose.model('prescription', prescriptionSchema)
export default prescriptionModel
