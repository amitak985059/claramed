import React, { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const ClinicQRCodeModal = ({ profileData, onClose }) => {
    const printRef = useRef()

    // Assuming frontend is running on standard port 5173 locally, or can be configured via env
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin.replace('5174', '5173')
    const bookingUrl = `${frontendUrl}/appointment/${profileData._id}`

    const handlePrint = () => {
        const printContent = printRef.current.innerHTML
        const originalContent = document.body.innerHTML

        // Temporarily replace body content with print content
        document.body.innerHTML = printContent
        window.print()
        
        // Restore and reload to re-attach react event listeners
        document.body.innerHTML = originalContent
        window.location.reload()
    }

    return (
        <div className='fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4'>
            <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden'>
                <div className='bg-primary px-6 py-4 flex items-center justify-between'>
                    <p className='text-white font-bold text-lg'>Clinic QR Poster</p>
                    <button onClick={onClose} className='text-white/70 hover:text-white text-xl'>✕</button>
                </div>

                <div className='p-8 flex flex-col items-center bg-gray-50'>
                    {/* The Printable Area */}
                    <div 
                        ref={printRef} 
                        className='bg-white border-2 border-gray-100 rounded-2xl p-8 flex flex-col items-center shadow-sm w-full max-w-sm'
                        style={{ padding: '40px', textAlign: 'center', backgroundColor: '#ffffff' }}
                    >
                        <h1 className='text-2xl font-bold text-gray-800 mb-1 tracking-tight' style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#1f2937' }}>
                            {profileData.name}
                        </h1>
                        <p className='text-primary font-medium mb-6' style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#5f6FFF' }}>
                            {profileData.speciality}
                        </p>

                        <div className='bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-6 inline-block'>
                            <QRCodeSVG 
                                value={bookingUrl} 
                                size={200}
                                level="H"
                                includeMargin={false}
                                fgColor="#1f2937"
                            />
                        </div>

                        <h2 className='text-xl font-bold text-gray-800 mb-2' style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#1f2937' }}>
                            Scan to Book
                        </h2>
                        <p className='text-sm text-gray-500 max-w-[250px]' style={{ margin: '0 auto', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                            Skip the queue! Scan this code with your phone camera to book an appointment or follow-up instantly.
                        </p>
                        
                        <div className='mt-8 pt-6 border-t border-gray-100 w-full' style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f3f4f6', width: '100%' }}>
                            <p className='text-xs text-gray-400 font-medium' style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Powered by Claramed</p>
                        </div>
                    </div>

                    <div className='mt-8 flex gap-4 w-full'>
                        <button 
                            onClick={onClose}
                            className='flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors'
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handlePrint}
                            className='flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20'
                        >
                            <span>🖨️</span> Print Poster
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ClinicQRCodeModal
