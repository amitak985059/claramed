import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import axios from 'axios'
import { toast } from 'react-toastify'

const StarRating = ({ rating, size = 'sm' }) => {
    const sz = size === 'lg' ? 'text-xl' : 'text-sm'
    return (
        <span className={`${sz} tracking-wide`}>
            {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
            ))}
        </span>
    )
}

const Appointment = () => {

    const { docId } = useParams()
    const { doctors, currencySymbol, backendUrl, token, getDoctosData } = useContext(AppContext)
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    const [docInfo, setDocInfo]     = useState(false)
    const [docSlots, setDocSlots]   = useState([])
    const [slotIndex, setSlotIndex] = useState(0)
    const [slotTime, setSlotTime]   = useState('')
    const [reviews, setReviews]     = useState([])

    const navigate = useNavigate()

    const fetchDocInfo = () => {
        const doc = doctors.find(d => d._id === docId)
        setDocInfo(doc)
    }

    // ─── Build slot grid from doctor's schedule ──────────────────────────────
    const getAvailableSlots = () => {
        setDocSlots([])

        const schedule = docInfo.schedule || {}
        const workDays    = schedule.workDays    ?? [1, 2, 3, 4, 5]
        const startHour   = schedule.startHour   ?? 10
        const endHour     = schedule.endHour     ?? 21
        const slotDuration = schedule.slotDuration ?? 30

        const today = new Date()
        const slotsPerDay = []

        // Build next 7 available work-days (skip days doctor doesn't work)
        let daysChecked = 0
        let dayOffset   = 0

        while (slotsPerDay.length < 7 && daysChecked < 30) {
            const currentDate = new Date(today)
            currentDate.setDate(today.getDate() + dayOffset)
            dayOffset++
            daysChecked++

            const dayOfWeek = currentDate.getDay()
            if (!workDays.includes(dayOfWeek)) continue  // doctor doesn't work this day

            const endTime = new Date(currentDate)
            endTime.setHours(endHour, 0, 0, 0)

            // For today: start from next available slot
            if (daysChecked === 1) {
                const nowHour = today.getHours()
                currentDate.setHours(nowHour > startHour ? nowHour + 1 : startHour)
                currentDate.setMinutes(today.getMinutes() > 30 ? 30 : 0, 0, 0)
            } else {
                currentDate.setHours(startHour, 0, 0, 0)
            }

            const timeSlots = []

            while (currentDate < endTime) {
                const formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                const d = currentDate.getDate()
                const m = currentDate.getMonth() + 1
                const y = currentDate.getFullYear()
                const slotDate = `${d}_${m}_${y}`

                const isBooked = docInfo.slots_booked[slotDate]?.includes(formattedTime)

                if (!isBooked) {
                    timeSlots.push({ datetime: new Date(currentDate), time: formattedTime })
                }

                currentDate.setMinutes(currentDate.getMinutes() + slotDuration)
            }

            slotsPerDay.push(timeSlots)
        }

        setDocSlots(slotsPerDay)
    }

    const bookAppointment = async () => {
        if (!token) {
            toast.warning('Login to book appointment')
            return navigate('/login')
        }
        if (!slotTime) {
            return toast.warning('Please select a time slot')
        }

        const date = docSlots[slotIndex][0]?.datetime
        if (!date) return toast.error('No slot selected')

        const slotDate = `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`

        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/book-appointment',
                { docId, slotDate, slotTime },
                { headers: { token } }
            )
            if (data.success) {
                toast.success(data.message)
                getDoctosData()
                navigate('/my-appointments')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // ─── Fetch reviews for this doctor ────────────────────────────────────────
    const fetchReviews = async () => {
        try {
            const { data } = await axios.get(backendUrl + `/api/user/doctor-reviews/${docId}`)
            if (data.success) setReviews(data.reviews)
        } catch (_) { /* non-critical */ }
    }

    useEffect(() => {
        if (doctors.length > 0) fetchDocInfo()
    }, [doctors, docId])

    useEffect(() => {
        if (docInfo) {
            getAvailableSlots()
            fetchReviews()
        }
    }, [docInfo])

    return docInfo ? (
        <div>
            {/* ── Doctor Details ── */}
            <div className='flex flex-col sm:flex-row gap-4'>
                <div>
                    <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt="" />
                </div>

                <div className='flex-1 border border-[#ADADAD] dark:border-gray-700 rounded-lg p-8 py-7 bg-white dark:bg-gray-800 mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>
                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700 dark:text-gray-100'>
                        {docInfo.name} <img className='w-5' src={assets.verified_icon} alt="" />
                    </p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600 dark:text-gray-400'>
                        <p>{docInfo.degree} - {docInfo.speciality}</p>
                        <button className='py-0.5 px-2 border dark:border-gray-600 text-xs rounded-full'>{docInfo.experience}</button>
                    </div>

                    {/* Rating badge */}
                    {docInfo.totalReviews > 0 && (
                        <div className='flex items-center gap-2 mt-2'>
                            <StarRating rating={docInfo.averageRating} />
                            <span className='text-sm text-gray-500 dark:text-gray-400'>
                                {docInfo.averageRating.toFixed(1)} ({docInfo.totalReviews} review{docInfo.totalReviews !== 1 ? 's' : ''})
                            </span>
                        </div>
                    )}

                    <div className='mt-3'>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] dark:text-gray-200'>
                            About <img className='w-3' src={assets.info_icon} alt="" />
                        </p>
                        <p className='text-sm text-gray-600 dark:text-gray-400 max-w-[700px] mt-1'>{docInfo.about}</p>
                    </div>

                    <p className='text-gray-600 dark:text-gray-400 font-medium mt-4'>
                        Appointment fee: <span className='text-gray-800 dark:text-gray-200'>{currencySymbol}{docInfo.fees}</span>
                    </p>
                </div>
            </div>

            {/* ── Booking Slots ── */}
            <div className='sm:ml-72 sm:pl-4 mt-8 font-medium text-[#565656] dark:text-gray-300'>
                <p>Booking slots</p>

                {docSlots.length === 0 ? (
                    <p className='text-sm text-gray-400 mt-4'>No available slots in the next 30 days.</p>
                ) : (
                    <>
                        <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4'>
                            {docSlots.map((item, index) => (
                                <div
                                    onClick={() => { setSlotIndex(index); setSlotTime('') }}
                                    key={index}
                                    className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${slotIndex === index ? 'bg-primary text-white' : 'border border-[#DDDDDD] dark:border-gray-600 dark:text-gray-300'}`}
                                >
                                    <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                                    <p>{item[0] && item[0].datetime.getDate()}</p>
                                </div>
                            ))}
                        </div>

                        <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
                            {docSlots[slotIndex]?.length === 0 ? (
                                <p className='text-sm text-gray-400'>All slots booked for this day.</p>
                            ) : (
                                docSlots[slotIndex]?.map((item, index) => (
                                    <p
                                        onClick={() => setSlotTime(item.time)}
                                        key={index}
                                        className={`text-sm font-light flex-shrink-0 px-5 py-2 rounded-full cursor-pointer ${item.time === slotTime ? 'bg-primary text-white' : 'text-[#949494] dark:text-gray-400 border border-[#B4B4B4] dark:border-gray-600'}`}
                                    >
                                        {item.time.toLowerCase()}
                                    </p>
                                ))
                            )}
                        </div>
                    </>
                )}

                <button onClick={bookAppointment} className='bg-primary text-white text-sm font-light px-20 py-3 rounded-full my-6'>
                    Book an appointment
                </button>
            </div>

            {/* ── Reviews Section ── */}
            {reviews.length > 0 && (
                <div className='sm:ml-72 sm:pl-4 mt-4'>
                    <p className='text-lg font-medium text-gray-700 dark:text-gray-200 mb-4'>
                        Patient Reviews ({reviews.length})
                    </p>
                    <div className='flex flex-col gap-4'>
                        {reviews.map((r, i) => (
                            <div key={i} className='border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800'>
                                <div className='flex items-center gap-2 mb-1'>
                                    <StarRating rating={r.rating} />
                                    <span className='text-xs text-gray-400'>
                                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                {r.comment && <p className='text-sm text-gray-600 dark:text-gray-400'>{r.comment}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <RelatedDoctors speciality={docInfo.speciality} docId={docId} />
        </div>
    ) : null
}

export default Appointment