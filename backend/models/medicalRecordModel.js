import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    summary: { type: String, required: true },
    date: { type: Number, required: true },
});

const medicalRecordModel = mongoose.models.medicalRecord || mongoose.model("medicalRecord", medicalRecordSchema);
export default medicalRecordModel;
