import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

// ─── Star picker component ─────────────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => (
    <div className='flex gap-1'>
        {[1, 2, 3, 4, 5].map(s => (
            <button
                key={s}
                type='button'
                onClick={() => onChange(s)}
                className={`text-2xl transition-colors ${s <= value ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
            >★</button>
        ))}
    </div>
)

const MyAppointments = () => {

    const { backendUrl, token } = useContext(AppContext)
    const navigate = useNavigate()

    const [appointments, setAppointments] = useState([])
    const [payment, setPayment] = useState('')
    const [reviewingId, setReviewingId]   = useState(null)  // appointmentId being reviewed
    const [existingReviews, setExistingReviews] = useState({}) // appointmentId → review
    const [reviewForm, setReviewForm]     = useState({ rating: 0, comment: '' })
    const [submitting, setSubmitting]     = useState(false)

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const slotDateFormat = (slotDate) => {
        const [d, m, y] = slotDate.split('_')
        return `${d} ${months[Number(m)]} ${y}`
    }

    // ─── Fetch appointments ────────────────────────────────────────────────────
    const getUserAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            setAppointments(data.appointments)
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // ─── Fetch which completed appointments already have a review ─────────────
    const fetchExistingReviews = async (appts) => {
        const completed = appts.filter(a => a.isCompleted)
        const results = {}
        await Promise.all(completed.map(async (a) => {
            try {
                const { data } = await axios.get(
                    backendUrl + `/api/user/review/${a._id}`,
                    { headers: { token } }
                )
                results[a._id] = data.review  // null if not yet reviewed
            } catch (_) {}
        }))
        setExistingReviews(results)
    }

    // ─── Cancel appointment ────────────────────────────────────────────────────
    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/cancel-appointment',
                { appointmentId },
                { headers: { token } }
            )
            if (data.success) {
                toast.success(data.message)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // ─── Submit review ─────────────────────────────────────────────────────────
    const submitReview = async (appointmentId) => {
        if (reviewForm.rating === 0) return toast.warning('Please select a star rating')
        setSubmitting(true)
        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/add-review',
                { appointmentId, rating: reviewForm.rating, comment: reviewForm.comment },
                { headers: { token } }
            )
            if (data.success) {
                toast.success('Review submitted!')
                setReviewingId(null)
                setReviewForm({ rating: 0, comment: '' })
                // Mark this appointment as reviewed locally
                setExistingReviews(prev => ({ ...prev, [appointmentId]: data.review }))
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    // ─── Razorpay ─────────────────────────────────────────────────────────────
    const initPay = (order) => {
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Appointment Payment',
            description: 'Appointment Payment',
            order_id: order.id,
            receipt: order.receipt,
            handler: async (response) => {
                try {
                    const { data } = await axios.post(backendUrl + "/api/user/verifyRazorpay", response, { headers: { token } })
                    if (data.success) {
                        navigate('/my-appointments')
                        getUserAppointments()
                    }
                } catch (error) {
                    toast.error(error.message)
                }
            }
        }
        new window.Razorpay(options).open()
    }

    const appointmentRazorpay = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } })
            if (data.success) initPay(data.order)
            else toast.error(data.message)
        } catch (error) {
            toast.error(error.message)
        }
    }

    const appointmentStripe = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) window.location.replace(data.session_url)
            else toast.error(data.message)
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (token) getUserAppointments()
    }, [token])

    useEffect(() => {
        if (appointments.length > 0) fetchExistingReviews(appointments)
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
                                    <button onClick={() => appointmentStripe(item._id)} className='text-[#696969] dark:border-gray-600 sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'>
                                        <img className='max-w-20 max-h-5' src={assets.stripe_logo} alt="" />
                                    </button>}
                                {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id &&
                                    <button onClick={() => appointmentRazorpay(item._id)} className='text-[#696969] dark:border-gray-600 sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'>
                                        <img className='max-w-20 max-h-5' src={assets.razorpay_logo} alt="" />
                                    </button>}
                                {!item.cancelled && item.payment && !item.isCompleted &&
                                    <button className='sm:min-w-48 py-2 border rounded text-[#696969] dark:text-gray-300 dark:border-gray-600 bg-[#EAEFFF] dark:bg-indigo-900'>Paid</button>}
                                {item.isCompleted &&
                                    <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500'>Completed</button>}
                                {!item.cancelled && !item.isCompleted &&
                                    <button onClick={() => cancelAppointment(item._id)} className='text-[#696969] dark:text-gray-300 dark:border-gray-600 sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'>Cancel appointment</button>}
                                {item.cancelled && !item.isCompleted &&
                                    <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>Appointment cancelled</button>}

                                {/* ── Review button for completed appointments ── */}
                                {item.isCompleted && (
                                    existingReviews[item._id]
                                        ? <div className='sm:min-w-48 py-2 text-yellow-500 text-xs'>
                                            {'★'.repeat(existingReviews[item._id].rating)} Reviewed
                                          </div>
                                        : <button
                                            onClick={() => { setReviewingId(item._id); setReviewForm({ rating: 0, comment: '' }) }}
                                            className='sm:min-w-48 py-2 border border-yellow-400 rounded text-yellow-500 hover:bg-yellow-400 hover:text-white transition-all duration-300'
                                          >
                                            Rate & Review
                                          </button>
                                )}
                            </div>
                        </div>

                        {/* ── Inline Review Form ── */}
                        {reviewingId === item._id && (
                            <div className='mt-4 ml-0 sm:ml-44 p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50'>
                                <p className='text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                                    Rate Dr. {item.docData.name}
                                </p>
                                <StarPicker value={reviewForm.rating} onChange={r => setReviewForm(prev => ({ ...prev, rating: r }))} />
                                <textarea
                                    value={reviewForm.comment}
                                    onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                    placeholder='Share your experience (optional, max 500 chars)...'
                                    maxLength={500}
                                    rows={3}
                                    className='w-full mt-3 p-2 text-sm border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-200 outline-primary resize-none'
                                />
                                <div className='flex gap-2 mt-2'>
                                    <button
                                        onClick={() => submitReview(item._id)}
                                        disabled={submitting}
                                        className='px-4 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-50 transition-all'
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                    <button
                                        onClick={() => setReviewingId(null)}
                                        className='px-4 py-1.5 border dark:border-gray-600 text-sm rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all'
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MyAppointments