import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'

const SmartRecords = () => {
    const { backendUrl, token, doctors } = useContext(AppContext)
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [title, setTitle] = useState('')
    const [file, setFile] = useState(null)
    const [selectedDocId, setSelectedDocId] = useState('')

    const fetchRecords = async () => {
        try {
            setLoading(true)
            const { data } = await axios.get(backendUrl + '/api/user/records', { headers: { token } })
            if (data.success) {
                setRecords(data.records)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!title || !file) {
            toast.error("Please provide a title and select a file.")
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('title', title)
            formData.append('image', file)

            const { data } = await axios.post(backendUrl + '/api/user/upload-record', formData, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
                setTitle('')
                setFile(null)
                fetchRecords()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || "Upload failed")
        } finally {
            setUploading(false)
        }
    }

    const requestReview = async (recordId) => {
        if (!selectedDocId) {
            toast.error("Please select a doctor for review");
            return;
        }
        try {
            const { data } = await axios.post(backendUrl + '/api/user/request-review', { recordId, docId: selectedDocId }, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
                fetchRecords()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || "Failed to request review")
        }
    }

    useEffect(() => {
        if (token) {
            fetchRecords()
        }
    }, [token])

    return (
        <div className='mt-10 max-w-2xl'>
            <p className='text-[#797979] dark:text-gray-400 underline mb-4 uppercase'>AI Smart Records</p>
            
            {/* Upload Form */}
            <form onSubmit={handleUpload} className='bg-blue-50 dark:bg-gray-800 p-4 rounded-xl mb-6 border border-blue-100 dark:border-gray-700'>
                <p className='text-sm text-gray-600 dark:text-gray-300 mb-3'>
                    Upload your past medical records or lab reports. Our AI will automatically analyze them and generate a summary for your doctor.
                </p>
                <div className='flex flex-col sm:flex-row gap-3 items-end'>
                    <div className='flex-1 w-full'>
                        <label className='text-xs font-medium mb-1 block'>Record Title</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Blood Test Nov 2023"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className='w-full border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary dark:bg-gray-700 dark:border-gray-600'
                        />
                    </div>
                    <div className='flex-1 w-full'>
                        <label className='text-xs font-medium mb-1 block'>Document Image (JPG/PNG)</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files[0])}
                            className='w-full border rounded px-3 py-1.5 text-sm outline-none bg-white dark:bg-gray-700 dark:border-gray-600'
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={uploading}
                        className='bg-primary text-white px-6 py-2 rounded text-sm hover:bg-primary/90 disabled:opacity-50 transition-all w-full sm:w-auto'
                    >
                        {uploading ? 'Analyzing...' : 'Upload'}
                    </button>
                </div>
            </form>

            {/* Records List */}
            {loading ? (
                <p className='text-sm text-gray-500'>Loading records...</p>
            ) : records.length === 0 ? (
                <p className='text-sm text-gray-500 italic'>No records uploaded yet.</p>
            ) : (
                <div className='space-y-4'>
                    {records.map((record) => (
                        <div key={record._id} className='border dark:border-gray-700 rounded-xl overflow-hidden'>
                            <div className='bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center'>
                                <div className='flex items-center gap-3'>
                                    <h3 className='font-medium text-gray-800 dark:text-gray-200'>{record.title}</h3>
                                    {record.status === 'Pending Review' && <span className='text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium'>⏳ Pending Review</span>}
                                    {record.status === 'Reviewed' && <span className='text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium'>✅ Reviewed</span>}
                                </div>
                                <a 
                                    href={record.fileUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className='text-xs text-primary hover:underline'
                                >
                                    View Original Document
                                </a>
                            </div>
                            <div className='p-4 bg-white dark:bg-gray-900'>
                                <p className='text-xs text-emerald-600 font-semibold mb-2 flex items-center gap-1'>
                                    ✨ AI Summary
                                </p>
                                <div className='text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed'>
                                    {record.summary}
                                </div>
                                
                                {/* Doctor Review Section */}
                                {record.status === 'Self' && (
                                    <div className='mt-4 pt-4 border-t border-gray-100 dark:border-gray-700'>
                                        <p className='text-xs text-gray-500 mb-2'>Want a human doctor to review this report?</p>
                                        <div className='flex gap-2 items-center'>
                                            <select 
                                                className='border rounded text-xs px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 outline-none flex-1 max-w-[200px]'
                                                value={selectedDocId}
                                                onChange={(e) => setSelectedDocId(e.target.value)}
                                            >
                                                <option value="">Select Doctor</option>
                                                {doctors.map(doc => (
                                                    <option key={doc._id} value={doc._id}>{doc.name} ({doc.speciality})</option>
                                                ))}
                                            </select>
                                            <button 
                                                onClick={() => requestReview(record._id)}
                                                className='bg-purple-600 text-white text-xs px-4 py-1.5 rounded hover:bg-purple-700 transition-colors'
                                            >
                                                Pay ₹199 & Send
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {record.status === 'Reviewed' && (
                                    <div className='mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800'>
                                        <p className='text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1'>
                                            👨‍⚕️ Doctor's Note
                                        </p>
                                        <p className='text-sm text-gray-700 dark:text-gray-300'>
                                            {record.doctorNote}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default SmartRecords
