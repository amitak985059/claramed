import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import ChatWindow from '../components/ChatWindow'
import VideoCallWindow from '../components/VideoCallWindow'

// ─── Star picker ──────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => (
    <div className='flex gap-1'>
        {[1, 2, 3, 4, 5].map(s => (
            <button key={s} type='button' onClick={() => onChange(s)}
                className={`text-2xl transition-colors ${s <= value ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>★</button>
        ))}
    </div>
)

// ─── Prescription Viewer ──────────────────────────────────────────────────────
const PrescriptionView = ({ prescription, onClose }) => (
    <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto'>
            <div className='sticky top-0 bg-emerald-600 px-6 py-4 flex items-center justify-between rounded-t-2xl'>
                <p className='text-white font-bold text-lg'>📋 Prescription</p>
                <button onClick={onClose} className='text-white/70 hover:text-white text-xl'>✕</button>
            </div>
            <div className='p-6 space-y-4'>
                {prescription.diagnosis && (
                    <div>
                        <p className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>Diagnosis</p>
                        <p className='text-gray-800 dark:text-gray-200 text-sm bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3'>{prescription.diagnosis}</p>
                    </div>
                )}
                {prescription.medicines?.length > 0 && (
                    <div>
                        <p className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2'>Medicines</p>
                        <div className='space-y-2'>
                            {prescription.medicines.map((m, i) => (
                                <div key={i} className='bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm'>
                                    <p className='font-semibold text-gray-800 dark:text-gray-200'>{m.name}</p>
                                    {m.dosage && <p className='text-gray-600 dark:text-gray-400'>Dosage: {m.dosage}</p>}
                                    {m.duration && <p className='text-gray-600 dark:text-gray-400'>Duration: {m.duration}</p>}
                                    {m.notes && <p className='text-gray-500 dark:text-gray-400 italic'>{m.notes}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {prescription.notes && (
                    <div>
                        <p className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>Doctor's Notes</p>
                        <p className='text-gray-700 dark:text-gray-300 text-sm'>{prescription.notes}</p>
                    </div>
                )}
                {prescription.followUpDate && (
                    <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3'>
                        <p className='text-sm text-blue-700 dark:text-blue-300'>
                            📅 Follow-up: <strong>{prescription.followUpDate}</strong>
                        </p>
                    </div>
                )}
            </div>
        </div>
    </div>
)

const MyAppointments = () => {
    const { backendUrl, token, userData } = useContext(AppContext)
    const navigate = useNavigate()

    const [appointments, setAppointments] = useState([])
    const [payment, setPayment] = useState('')
    const [reviewingId, setReviewingId] = useState(null)
    const [existingReviews, setExistingReviews] = useState({})
    const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' })
    const [submitting, setSubmitting] = useState(false)
    const [chatAppt, setChatAppt] = useState(null)   // appointment being chatted
    const [videoAppt, setVideoAppt] = useState(null) // appointment in video call
    const [prescriptions, setPrescriptions] = useState({})     // appointmentId → prescription
    const [viewPrescription, setViewPrescription] = useState(null)

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const slotDateFormat = (slotDate) => {
        const [d, m, y] = slotDate.split('_')
        return `${d} ${months[Number(m)]} ${y}`
    }

    const getUserAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            setAppointments(data.appointments)
        } catch (error) { toast.error(error.message) }
    }

    const fetchExistingReviews = async (appts) => {
        const completed = appts.filter(a => a.isCompleted)
        const results = {}
        await Promise.all(completed.map(async (a) => {
            try {
                const { data } = await axios.get(backendUrl + `/api/user/review/${a._id}`, { headers: { token } })
                results[a._id] = data.review
            } catch (_) { }
        }))
        setExistingReviews(results)
    }

    const fetchPrescriptions = async (appts) => {
        const completed = appts.filter(a => a.isCompleted)
        const results = {}
        await Promise.all(completed.map(async (a) => {
            try {
                const { data } = await axios.get(backendUrl + `/api/user/prescription/${a._id}`, { headers: { token } })
                if (data.prescription) results[a._id] = data.prescription
            } catch (_) { }
        }))
        setPrescriptions(results)
    }

    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })
            if (data.success) { toast.success(data.message); getUserAppointments() }
            else toast.error(data.message)
        } catch (error) { toast.error(error.message) }
    }

    const submitReview = async (appointmentId) => {
        if (reviewForm.rating === 0) return toast.warning('Please select a star rating')
        setSubmitting(true)
        try {
            const { data } = await axios.post(backendUrl + '/api/user/add-review',
                { appointmentId, rating: reviewForm.rating, comment: reviewForm.comment },
                { headers: { token } }
            )
            if (data.success) {
                toast.success('Review submitted!')
                setReviewingId(null)
                setReviewForm({ rating: 0, comment: '' })
                setExistingReviews(prev => ({ ...prev, [appointmentId]: data.review }))
            } else toast.error(data.message)
        } catch (error) { toast.error(error.message) }
        finally { setSubmitting(false) }
    }

    const initPay = (order) => {
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount, currency: order.currency,
            name: 'Appointment Payment', description: 'Appointment Payment',
            order_id: order.id, receipt: order.receipt,
            handler: async (response) => {
                try {
                    const { data } = await axios.post(backendUrl + "/api/user/verifyRazorpay", response, { headers: { token } })
                    if (data.success) { navigate('/my-appointments'); getUserAppointments() }
                } catch (error) { toast.error(error.message) }
            }
        }
        new window.Razorpay(options).open()
    }

    const appointmentRazorpay = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } })
            if (data.success) initPay(data.order)
            else toast.error(data.message)
        } catch (error) { toast.error(error.message) }
    }

    const appointmentStripe = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) window.location.replace(data.session_url)
            else toast.error(data.message)
        } catch (error) { toast.error(error.message) }
    }

    useEffect(() => { if (token) getUserAppointments() }, [token])
    useEffect(() => {
        if (appointments.length > 0) {
            fetchExistingReviews(appointments)
            fetchPrescriptions(appointments)
        }
    }, [appointments])

    return (
        <div>
            <p className='pb-3 mt-12 text-lg font-medium text-gray-600 dark:text-gray-300 border-b dark:border-gray-700'>My appointments</p>
            <div>
                {appointments.map((item, index) => (
                    <div key={index} className='border-b dark:border-gray-700 py-4'>
                        <div className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6'>
                            <div>
                                <img className='w-36 bg-[#EAEFFF] dark:bg-gray-700' src={item.docData.image} alt="" />
                            </div>
                            <div className='flex-1 text-sm text-[#5E5E5E] dark:text-gray-400'>
                                <p className='text-[#262626] dark:text-gray-100 text-base font-semibold'>{item.docData.name}</p>
                                <p>{item.docData.speciality}</p>
                                <p className='text-[#464646] dark:text-gray-300 font-medium mt-1'>Address:</p>
                                <p>{item.docData.address.line1}</p>
                                <p>{item.docData.address.line2}</p>
                                <p className='mt-1'>
                                    <span className='text-sm text-[#3C3C3C] dark:text-gray-300 font-medium'>Date & Time: </span>
                                    {slotDateFormat(item.slotDate)} | {item.slotTime}
                                </p>
                            </div>
                            <div></div>
                            {/* ── Action Buttons ── */}
                            <div className='flex flex-col gap-2 justify-end text-sm text-center'>
                                {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id &&
                                    <button onClick={() => setPayment(item._id)} className='text-[#696969] dark:text-gray-300 dark:border-gray-600 sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300'>Pay Online</button>}
                                {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id &&
                                    <button onClick={() => appointmentStripe(item._id)} className='text-[#696969] dark:border-gray-600 sm:min-w-48 py-2 border rounded hover:bg-gray-100 transition-all flex items-center justify-center'>
                                        <img className='max-w-20 max-h-5' src={assets.stripe_logo} alt="" /></button>}
                                {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id &&
                                    <button onClick={() => appointmentRazorpay(item._id)} className='text-[#696969] dark:border-gray-600 sm:min-w-48 py-2 border rounded hover:bg-gray-100 transition-all flex items-center justify-center'>
                                        <img className='max-w-20 max-h-5' src={assets.razorpay_logo} alt="" /></button>}
                                {!item.cancelled && item.payment && !item.isCompleted &&
                                    <button className='sm:min-w-48 py-2 border rounded text-[#696969] dark:text-gray-300 bg-[#EAEFFF] dark:bg-indigo-900'>Paid</button>}
                                {item.isCompleted &&
                                    <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500'>Completed</button>}

                                {/* ── Chat & Video Buttons (active, non-cancelled appointments) ── */}
                                {!item.cancelled && (
                                    <div className='flex gap-2 sm:min-w-48'>
                                        <button
                                            onClick={() => setChatAppt(item)}
                                            className='flex-1 py-2 border border-primary rounded text-primary hover:bg-primary hover:text-white transition-all duration-300 text-sm'
                                            title="Chat with Doctor"
                                        >💬 Chat</button>
                                        <button
                                            onClick={() => setVideoAppt(item)}
                                            className='flex-1 py-2 border border-blue-500 rounded text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-300 text-sm'
                                            title="Join Video Call"
                                        >📹 Video</button>
                                    </div>
                                )}

                                {/* ── Prescription button ── */}
                                {item.isCompleted && prescriptions[item._id] && (
                                    <button
                                        onClick={() => setViewPrescription(prescriptions[item._id])}
                                        className='sm:min-w-48 py-2 border border-emerald-500 rounded text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-300'
                                    >📋 View Prescription</button>
                                )}

                                {/* ── Review ── */}
                                {item.isCompleted && (
                                    existingReviews[item._id]
                                        ? <div className='sm:min-w-48 py-2 text-yellow-500 text-xs'>{'★'.repeat(existingReviews[item._id].rating)} Reviewed</div>
                                        : <button onClick={() => { setReviewingId(item._id); setReviewForm({ rating: 0, comment: '' }) }}
                                            className='sm:min-w-48 py-2 border border-yellow-400 rounded text-yellow-500 hover:bg-yellow-400 hover:text-white transition-all'>Rate & Review</button>
                                )}

                                {!item.cancelled && !item.isCompleted &&
                                    <button onClick={() => cancelAppointment(item._id)} className='text-[#696969] dark:text-gray-300 dark:border-gray-600 sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'>Cancel appointment</button>}
                                {item.cancelled && !item.isCompleted &&
                                    <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>Appointment cancelled</button>}
                            </div>
                        </div>

                        {/* ── Inline Review Form ── */}
                        {reviewingId === item._id && (
                            <div className='mt-4 ml-0 sm:ml-44 p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50'>
                                <p className='text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>Rate Dr. {item.docData.name}</p>
                                <StarPicker value={reviewForm.rating} onChange={r => setReviewForm(prev => ({ ...prev, rating: r }))} />
                                <textarea
                                    value={reviewForm.comment}
                                    onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                    placeholder='Share your experience (optional, max 500 chars)...'
                                    maxLength={500} rows={3}
                                    className='w-full mt-3 p-2 text-sm border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-200 outline-primary resize-none'
                                />
                                <div className='flex gap-2 mt-2'>
                                    <button onClick={() => submitReview(item._id)} disabled={submitting}
                                        className='px-4 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-50 transition-all'>
                                        {submitting ? 'Submitting...' : 'Submit Review'}</button>
                                    <button onClick={() => setReviewingId(null)}
                                        className='px-4 py-1.5 border dark:border-gray-600 text-sm rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all'>Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Prescription Modal ── */}
            {viewPrescription && (
                <PrescriptionView prescription={viewPrescription} onClose={() => setViewPrescription(null)} />
            )}

            {/* ── Chat Window ── */}
            {chatAppt && userData && (
                <ChatWindow
                    appointmentId={chatAppt._id}
                    currentUserId={userData._id}
                    currentUserRole='user'
                    currentUserName={userData.name}
                    onClose={() => setChatAppt(null)}
                />
            )}

            {/* ── Video Call Window ── */}
            {videoAppt && userData && (
                <VideoCallWindow
                    appointmentId={videoAppt._id}
                    currentUserName={userData.name}
                    onClose={() => setVideoAppt(null)}
                />
            )}
        </div>
    )
}

export default MyAppointments