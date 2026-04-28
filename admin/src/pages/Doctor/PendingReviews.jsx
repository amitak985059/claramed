import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const PendingReviews = () => {
    const { dToken, profileData, getProfileData } = useContext(DoctorContext)
    const { backendUrl } = useContext(AppContext)
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState({})

    const fetchReviews = async () => {
        if (!profileData?._id) return;
        try {
            setLoading(true)
            const { data } = await axios.get(
                backendUrl + '/api/doctor/pending-reviews',
                { headers: { dToken } }
            )
            if (data.success) {
                setReviews(data.records)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const submitReview = async (recordId) => {
        const note = notes[recordId]
        if (!note || note.trim() === '') {
            toast.error("Please enter a note before submitting")
            return
        }

        try {
            const { data } = await axios.post(
                backendUrl + '/api/doctor/submit-review',
                { docId: profileData._id, recordId, doctorNote: note },
                { headers: { dToken } }
            )
            if (data.success) {
                toast.success(data.message)
                fetchReviews()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || "Submit failed")
        }
    }

    useEffect(() => {
        if (dToken) {
            if (!profileData) {
                getProfileData()
            } else {
                fetchReviews()
            }
        }
    }, [dToken, profileData])

    return (
        <div className='w-full max-w-6xl m-5'>
            <p className='mb-3 text-lg font-medium'>Pending Paid Reviews</p>

            <div className='bg-white border rounded text-sm min-h-[60vh] p-5'>
                <p className='text-gray-500 mb-6'>These patients have paid to have their uploaded records asynchronously reviewed by you.</p>

                {loading ? (
                    <p className='text-gray-500'>Loading...</p>
                ) : reviews.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-10'>
                        <span className='text-4xl mb-3'>🗂️</span>
                        <p className='text-gray-500 italic'>No pending reviews. You're all caught up!</p>
                    </div>
                ) : (
                    <div className='space-y-6'>
                        {reviews.map((record) => (
                            <div key={record._id} className='border rounded-xl overflow-hidden bg-gray-50'>
                                <div className='px-5 py-4 border-b flex justify-between items-center bg-white'>
                                    <div>
                                        <h3 className='font-semibold text-lg text-gray-800'>{record.title}</h3>
                                        <p className='text-xs text-gray-500'>Uploaded: {new Date(record.date).toLocaleDateString()}</p>
                                    </div>
                                    <a
                                        href={record.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className='text-primary border border-primary px-4 py-1.5 rounded-full text-sm hover:bg-primary hover:text-white transition-all'
                                    >
                                        View Original Image
                                    </a>
                                </div>
                                <div className='p-5'>
                                    <div className='mb-5 p-4 bg-blue-50/50 rounded-lg border border-blue-100'>
                                        <p className='text-xs font-semibold text-blue-600 mb-2'>✨ AI Pre-Summary</p>
                                        <p className='text-sm text-gray-700 whitespace-pre-wrap'>{record.summary}</p>
                                    </div>

                                    <div>
                                        <p className='text-sm font-medium text-gray-700 mb-2'>Your Review Note</p>
                                        <textarea
                                            className='w-full border rounded-lg p-3 text-sm outline-primary focus:ring-1 focus:ring-primary/30 resize-none bg-white'
                                            rows={3}
                                            placeholder="Write your professional assessment here (e.g., 'Everything looks normal, continue same medication...')"
                                            value={notes[record._id] || ''}
                                            onChange={(e) => setNotes(prev => ({ ...prev, [record._id]: e.target.value }))}
                                        />
                                        <div className='mt-3 flex justify-end'>
                                            <button
                                                onClick={() => submitReview(record._id)}
                                                className='bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors shadow-sm'
                                            >
                                                Submit & Claim Payment
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PendingReviews
