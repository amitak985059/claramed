import React, { useContext, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import { DoctorContext } from '../context/DoctorContext'

const ProPaywall = ({ featureName, onUpgrade }) => {
    const { backendUrl } = useContext(AppContext)
    const { dToken } = useContext(DoctorContext)
    const [loading, setLoading] = useState(false)

    const handleUpgrade = async () => {
        setLoading(true)
        try {
            const { data } = await axios.post(
                backendUrl + '/api/doctor/upgrade-pro',
                {},
                { headers: { dToken } }
            )
            if (data.success) {
                toast.success(data.message)
                if (onUpgrade) onUpgrade()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message || "Upgrade failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-2xl shadow-xl max-w-2xl mx-auto mt-10 text-center relative overflow-hidden'>
            {/* Background design elements */}
            <div className='absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl'></div>
            <div className='absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl'></div>

            <span className='text-6xl mb-4 relative z-10'>💎</span>
            <h2 className='text-3xl font-bold text-gray-800 mb-2 relative z-10'>
                Unlock <span className='text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600'>Claramed Pro</span>
            </h2>
            <p className='text-gray-600 mb-8 max-w-md relative z-10 text-sm'>
                The <span className='font-semibold'>{featureName}</span> feature is exclusively available for Claramed Pro subscribers.
            </p>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8 relative z-10'>
                <div className='bg-gray-50 border border-gray-100 p-4 rounded-xl text-left'>
                    <span className='text-xl'>🎙️</span>
                    <h3 className='font-semibold text-gray-800 mt-2'>AI Voice Prescriptions</h3>
                    <p className='text-xs text-gray-500 mt-1'>Speak to instantly generate perfectly formatted prescriptions.</p>
                </div>
                <div className='bg-gray-50 border border-gray-100 p-4 rounded-xl text-left'>
                    <span className='text-xl'>🗂️</span>
                    <h3 className='font-semibold text-gray-800 mt-2'>Asynchronous Income</h3>
                    <p className='text-xs text-gray-500 mt-1'>Charge patients to review their AI Smart Records on your phone.</p>
                </div>
            </div>

            <button 
                onClick={handleUpgrade}
                disabled={loading}
                className='relative z-10 bg-gradient-to-r from-primary to-purple-600 text-white px-8 py-3 rounded-full font-semibold text-lg hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all w-full sm:w-auto min-w-[250px]'
            >
                {loading ? 'Upgrading...' : 'Upgrade Now for ₹999/mo'}
            </button>
            <p className='text-xs text-gray-400 mt-3 relative z-10'>Mock upgrade for MVP demo. Instantly unlocks features.</p>
        </div>
    )
}

export default ProPaywall
