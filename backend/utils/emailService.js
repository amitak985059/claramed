import nodemailer from 'nodemailer'

// ─── Build transporter (lazy — only if SMTP is configured) ───────────────────
let transporter = null

const getTransporter = () => {
    if (transporter) return transporter

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        // Email not configured — skip silently
        return null
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false }  // required for Brevo
    })

    return transporter
}

// ─── Core send helper ─────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
    const t = getTransporter()
    if (!t) {
        console.log('[Email] Skipped — SMTP not configured')
        return
    }

    console.log(`[Email] Sending "${subject}" → ${to}`)
    try {
        await t.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'Claramed'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        })
        console.log(`[Email] ✅ Sent successfully → ${to}`)
    } catch (err) {
        console.error('[Email] ❌ Failed:', err.message)
    }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

/** Sent to patient when appointment is booked */
export const sendBookingConfirmation = async ({ patientEmail, patientName, doctorName, speciality, slotDate, slotTime, fees, currency = '₹' }) => {
    await sendEmail({
        to: patientEmail,
        subject: `Appointment Confirmed — Dr. ${doctorName}`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
            <div style="background:#5562ea;padding:16px 24px;border-radius:8px;text-align:center">
                <h2 style="color:#fff;margin:0">Appointment Confirmed ✓</h2>
            </div>
            <p style="margin-top:24px">Hi <strong>${patientName}</strong>,</p>
            <p>Your appointment has been successfully booked. Here are the details:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr style="background:#f3f4f6"><td style="padding:10px 14px;font-weight:600">Doctor</td><td style="padding:10px 14px">Dr. ${doctorName} (${speciality})</td></tr>
                <tr><td style="padding:10px 14px;font-weight:600">Date</td><td style="padding:10px 14px">${slotDate}</td></tr>
                <tr style="background:#f3f4f6"><td style="padding:10px 14px;font-weight:600">Time</td><td style="padding:10px 14px">${slotTime}</td></tr>
                <tr><td style="padding:10px 14px;font-weight:600">Fees</td><td style="padding:10px 14px">${currency}${fees}</td></tr>
            </table>
            <p style="color:#6b7280;font-size:13px">Please arrive 10 minutes before your scheduled time. You can manage your appointments from the Claramed portal.</p>
            <p style="margin-top:24px">See you soon,<br><strong>The Claramed Team</strong></p>
        </div>`,
    })
}

/** Sent to patient when appointment is cancelled */
export const sendCancellationEmail = async ({ patientEmail, patientName, doctorName, slotDate, slotTime }) => {
    await sendEmail({
        to: patientEmail,
        subject: `Appointment Cancelled — Dr. ${doctorName}`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
            <div style="background:#ef4444;padding:16px 24px;border-radius:8px;text-align:center">
                <h2 style="color:#fff;margin:0">Appointment Cancelled</h2>
            </div>
            <p style="margin-top:24px">Hi <strong>${patientName}</strong>,</p>
            <p>Your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${slotDate}</strong> at <strong>${slotTime}</strong> has been cancelled.</p>
            <p>You can book a new appointment anytime from the Claramed portal.</p>
            <p style="margin-top:24px">Best regards,<br><strong>The Claramed Team</strong></p>
        </div>`,
    })
}

/** Sent to patient when appointment is completed */
export const sendCompletionEmail = async ({ patientEmail, patientName, doctorName, slotDate }) => {
    await sendEmail({
        to: patientEmail,
        subject: `Appointment Completed — Please Rate Dr. ${doctorName}`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
            <div style="background:#10b981;padding:16px 24px;border-radius:8px;text-align:center">
                <h2 style="color:#fff;margin:0">Appointment Completed ✓</h2>
            </div>
            <p style="margin-top:24px">Hi <strong>${patientName}</strong>,</p>
            <p>Your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${slotDate}</strong> has been marked as completed.</p>
            <p>We'd love to hear how it went — please log in to Claramed to leave a rating and review for Dr. ${doctorName}.</p>
            <p style="margin-top:24px">Thank you for choosing Claramed,<br><strong>The Claramed Team</strong></p>
        </div>`,
    })
}
