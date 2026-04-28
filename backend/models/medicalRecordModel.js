import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    summary: { type: String, required: true }, // AI Summary
    date: { type: Number, required: true },
    // New fields for Paid Report Review feature
    docId: { type: String, default: null }, // If sent to a doctor
    status: { type: String, default: 'Self' }, // 'Self', 'Pending Review', 'Reviewed'
    doctorNote: { type: String, default: '' }, // The human doctor's response
});

const medicalRecordModel = mongoose.models.medicalRecord || mongoose.model("medicalRecord", medicalRecordSchema);
export default medicalRecordModel;
