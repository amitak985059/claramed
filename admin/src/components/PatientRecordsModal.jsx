import React, { useEffect, useState } from 'react'
import axios from 'axios'

const PatientRecordsModal = ({ patientId, patientName, dToken, backendUrl, onClose }) => {
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                // Pass patientId as query param
                const { data } = await axios.get(
                    `${backendUrl}/api/doctor/patient-records?userId=${patientId}`,
                    { headers: { dToken } }
                )
                if (data.success) {
                    setRecords(data.records)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchRecords()
    }, [patientId, dToken, backendUrl])

    return (
        <div className='fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4'>
            <div className='bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col'>
                <div className='bg-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0'>
                    <div>
                        <p className='text-white font-bold text-lg'>🗂️ Smart Records & Lab Reports</p>
                        <p className='text-blue-100 text-xs'>Patient: {patientName}</p>
                    </div>
                    <button onClick={onClose} className='text-white/70 hover:text-white text-xl'>✕</button>
                </div>

                <div className='p-6 overflow-y-auto flex-1'>
                    {loading ? (
                        <p className='text-sm text-gray-500 text-center py-10'>Loading AI-summarized records...</p>
                    ) : records.length === 0 ? (
                        <div className='text-center py-10'>
                            <p className='text-gray-500 mb-2'>No medical records found.</p>
                            <p className='text-xs text-gray-400'>The patient has not uploaded any documents yet.</p>
                        </div>
                    ) : (
                        <div className='space-y-6'>
                            {records.map((record) => (
                                <div key={record._id} className='border rounded-xl overflow-hidden shadow-sm'>
                                    <div className='bg-gray-50 px-4 py-3 border-b flex justify-between items-center'>
                                        <div>
                                            <h3 className='font-semibold text-gray-800'>{record.title}</h3>
                                            <p className='text-[10px] text-gray-500'>{new Date(record.date).toLocaleDateString()}</p>
                                        </div>
                                        <a 
                                            href={record.fileUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className='text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors'
                                        >
                                            View Original PDF/Image
                                        </a>
                                    </div>
                                    <div className='p-4 bg-white'>
                                        <div className='flex items-center gap-1.5 mb-3'>
                                            <span className='bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider'>
                                                AI Extracted Summary
                                            </span>
                                            <span className='text-[10px] text-gray-400'>Powered by Gemini</span>
                                        </div>
                                        <div className='text-sm text-gray-700 whitespace-pre-wrap leading-relaxed'>
                                            {record.summary}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className='p-4 border-t shrink-0 flex justify-end'>
                    <button onClick={onClose} className='px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm'>
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PatientRecordsModal
