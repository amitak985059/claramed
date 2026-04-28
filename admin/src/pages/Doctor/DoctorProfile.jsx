import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'
import ClinicQRCodeModal from '../../components/ClinicQRCodeModal'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLOT_DURATIONS = [15, 20, 30, 45, 60]

const DoctorProfile = () => {

    const { dToken, profileData, setProfileData, getProfileData } = useContext(DoctorContext)
    const { currency, backendUrl } = useContext(AppContext)
    const [isEdit, setIsEdit] = useState(false)
    const [scheduleEdit, setScheduleEdit] = useState(false)
    const [showQR, setShowQR] = useState(false)
    const [schedule, setSchedule] = useState({
        workDays: [1, 2, 3, 4, 5],
        startHour: 10,
        endHour: 21,
        slotDuration: 30
    })

    // Sync schedule state when profile loads
    useEffect(() => {
        if (profileData?.schedule) {
            setSchedule({
                workDays: profileData.schedule.workDays ?? [1, 2, 3, 4, 5],
                startHour: profileData.schedule.startHour ?? 10,
                endHour: profileData.schedule.endHour ?? 21,
                slotDuration: profileData.schedule.slotDuration ?? 30,
            })
        }
    }, [profileData])

    const updateProfile = async () => {
        try {
            const updateData = {
                address: profileData.address,
                fees: profileData.fees,
                about: profileData.about,
                available: profileData.available
            }
            const { data } = await axios.post(backendUrl + '/api/doctor/update-profile', updateData, { headers: { dToken } })
            if (data.success) {
                toast.success(data.message)
                setIsEdit(false)
                getProfileData()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const updateSchedule = async () => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/doctor/update-schedule',
                { ...schedule },
                { headers: { dToken } }
            )
            if (data.success) {
                toast.success(data.message)
                setScheduleEdit(false)
                getProfileData()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const toggleWorkDay = (day) => {
        setSchedule(prev => ({
            ...prev,
            workDays: prev.workDays.includes(day)
                ? prev.workDays.filter(d => d !== day)
                : [...prev.workDays, day].sort()
        }))
    }

    useEffect(() => {
        if (dToken) getProfileData()
    }, [dToken])

    return profileData && (
        <div>
            <div className='flex flex-col gap-4 m-5'>
                <div>
                    <img className='bg-primary/80 w-full sm:max-w-64 rounded-lg' src={profileData.image} alt="" />
                </div>

                {/* ── Profile Info ── */}
                <div className='flex-1 border border-stone-100 rounded-lg p-8 py-7 bg-white'>
                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>{profileData.name}</p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{profileData.degree} - {profileData.speciality}</p>
                        <button className='py-0.5 px-2 border text-xs rounded-full'>{profileData.experience}</button>
                    </div>

                    <div className='mt-3'>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626]'>About:</p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>
                            {isEdit
                                ? <textarea
                                    onChange={e => setProfileData(prev => ({ ...prev, about: e.target.value }))}
                                    className='w-full outline-primary p-2 border rounded'
                                    rows={8}
                                    value={profileData.about}
                                />
                                : profileData.about
                            }
                        </p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>
                        Appointment fee:&nbsp;
                        <span className='text-gray-800'>
                            {currency}&nbsp;
                            {isEdit
                                ? <input type='number' className='border rounded px-1 w-24' onChange={e => setProfileData(prev => ({ ...prev, fees: e.target.value }))} value={profileData.fees} />
                                : profileData.fees
                            }
                        </span>
                    </p>

                    <div className='flex gap-2 py-2'>
                        <p>Address:</p>
                        <p className='text-sm'>
                            {isEdit
                                ? <>
                                    <input type='text' className='border rounded px-1 w-full mb-1' onChange={e => setProfileData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))} value={profileData.address.line1} />
                                    <input type='text' className='border rounded px-1 w-full' onChange={e => setProfileData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))} value={profileData.address.line2} />
                                </>
                                : <>{profileData.address.line1}<br />{profileData.address.line2}</>
                            }
                        </p>
                    </div>

                    <div className='flex gap-1 pt-2'>
                        <input type="checkbox" onChange={() => isEdit && setProfileData(prev => ({ ...prev, available: !prev.available }))} checked={profileData.available} readOnly={!isEdit} />
                        <label>Available</label>
                    </div>

                    <div className='flex gap-3'>
                        {isEdit
                            ? <button onClick={updateProfile} className='px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all'>Save</button>
                            : <button onClick={() => setIsEdit(true)} className='px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all'>Edit Profile</button>
                        }
                        {!isEdit && (
                            <button 
                                onClick={() => setShowQR(true)} 
                                className='px-4 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 text-sm rounded-full mt-5 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1'
                            >
                                <span>📱</span> Get Clinic QR Code
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Schedule Editor ── */}
                <div className='border border-stone-100 rounded-lg p-8 py-7 bg-white'>
                    <div className='flex items-center justify-between mb-4'>
                        <p className='text-lg font-medium text-gray-700'>📅 Working Schedule</p>
                        {!scheduleEdit
                            ? <button onClick={() => setScheduleEdit(true)} className='px-4 py-1 border border-primary text-sm rounded-full hover:bg-primary hover:text-white transition-all'>Edit Schedule</button>
                            : <div className='flex gap-2'>
                                <button onClick={updateSchedule} className='px-4 py-1 bg-primary text-white text-sm rounded-full hover:bg-primary/90 transition-all'>Save</button>
                                <button onClick={() => { setScheduleEdit(false); setSchedule(profileData.schedule || {}) }} className='px-4 py-1 border text-sm rounded-full hover:bg-gray-100 transition-all'>Cancel</button>
                            </div>
                        }
                    </div>

                    {/* Work Days */}
                    <div className='mb-4'>
                        <p className='text-sm font-medium text-gray-600 mb-2'>Working Days</p>
                        <div className='flex gap-2 flex-wrap'>
                            {DAY_LABELS.map((label, i) => (
                                <button
                                    key={i}
                                    type='button'
                                    disabled={!scheduleEdit}
                                    onClick={() => scheduleEdit && toggleWorkDay(i)}
                                    className={`px-3 py-1 text-sm rounded-full border transition-all
                                        ${schedule.workDays?.includes(i)
                                            ? 'bg-primary text-white border-primary'
                                            : 'text-gray-500 border-gray-300 hover:border-primary'
                                        }
                                        ${!scheduleEdit ? 'cursor-default opacity-80' : 'cursor-pointer'}
                                    `}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hours */}
                    <div className='flex gap-6 mb-4 flex-wrap'>
                        <div>
                            <p className='text-sm font-medium text-gray-600 mb-1'>Start Hour</p>
                            {scheduleEdit
                                ? <input
                                    type='number' min={0} max={22}
                                    className='border rounded px-2 py-1 w-20 text-sm'
                                    value={schedule.startHour}
                                    onChange={e => setSchedule(prev => ({ ...prev, startHour: Number(e.target.value) }))}
                                />
                                : <p className='text-gray-800 font-medium'>{schedule.startHour}:00</p>
                            }
                        </div>
                        <div>
                            <p className='text-sm font-medium text-gray-600 mb-1'>End Hour</p>
                            {scheduleEdit
                                ? <input
                                    type='number' min={1} max={23}
                                    className='border rounded px-2 py-1 w-20 text-sm'
                                    value={schedule.endHour}
                                    onChange={e => setSchedule(prev => ({ ...prev, endHour: Number(e.target.value) }))}
                                />
                                : <p className='text-gray-800 font-medium'>{schedule.endHour}:00</p>
                            }
                        </div>
                        <div>
                            <p className='text-sm font-medium text-gray-600 mb-1'>Slot Duration</p>
                            {scheduleEdit
                                ? <select
                                    className='border rounded px-2 py-1 text-sm'
                                    value={schedule.slotDuration}
                                    onChange={e => setSchedule(prev => ({ ...prev, slotDuration: Number(e.target.value) }))}
                                >
                                    {SLOT_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                                </select>
                                : <p className='text-gray-800 font-medium'>{schedule.slotDuration} min</p>
                            }
                        </div>
                    </div>

                    {/* Preview */}
                    <p className='text-xs text-gray-400 mt-2'>
                        Working: {DAY_LABELS.filter((_, i) => schedule.workDays?.includes(i)).join(', ') || 'None'} &nbsp;|&nbsp;
                        Hours: {schedule.startHour}:00 – {schedule.endHour}:00 &nbsp;|&nbsp;
                        {schedule.slotDuration} min slots
                    </p>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQR && (
                <ClinicQRCodeModal 
                    profileData={profileData} 
                    onClose={() => setShowQR(false)} 
                />
            )}
        </div>
    )
}

export default DoctorProfile