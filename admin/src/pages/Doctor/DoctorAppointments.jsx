import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'
import axios from 'axios'
import { toast } from 'react-toastify'

// ─── Prescription Editor Modal ────────────────────────────────────────────────
const PrescriptionEditor = ({ appointment, dToken, backendUrl, onClose }) => {
  const [form, setForm] = useState({
    diagnosis: '',
    notes: '',
    followUpDate: '',
    medicines: [{ name: '', dosage: '', duration: '', notes: '' }]
  })
  const [saving, setSaving] = useState(false)

  // Load existing prescription
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/doctor/prescription/${appointment._id}`,
          { headers: { dToken } }
        )
        if (data.prescription) {
          setForm({
            diagnosis: data.prescription.diagnosis || '',
            notes: data.prescription.notes || '',
            followUpDate: data.prescription.followUpDate || '',
            medicines: data.prescription.medicines?.length
              ? data.prescription.medicines
              : [{ name: '', dosage: '', duration: '', notes: '' }]
          })
        }
      } catch (_) { }
    }
    load()
  }, [appointment._id])

  const addMedicine = () => setForm(prev => ({
    ...prev,
    medicines: [...prev.medicines, { name: '', dosage: '', duration: '', notes: '' }]
  }))

  const removeMedicine = (i) => setForm(prev => ({
    ...prev,
    medicines: prev.medicines.filter((_, idx) => idx !== i)
  }))

  const updateMedicine = (i, field, value) => setForm(prev => ({
    ...prev,
    medicines: prev.medicines.map((m, idx) => idx === i ? { ...m, [field]: value } : m)
  }))

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/doctor/prescription`,
        {
          appointmentId: appointment._id,
          ...form,
          medicines: form.medicines.filter(m => m.name.trim())
        },
        { headers: { dToken } }
      )
      if (data.success) { toast.success('Prescription saved!'); onClose() }
      else toast.error(data.message)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = 'border rounded px-2 py-1 text-sm w-full outline-primary focus:ring-1 focus:ring-primary/30'

  return (
    <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-emerald-600 px-6 py-4 flex items-center justify-between rounded-t-2xl'>
          <div>
            <p className='text-white font-bold text-lg'>📋 Prescription</p>
            <p className='text-emerald-100 text-xs'>Patient: {appointment.userData.name}</p>
          </div>
          <button onClick={onClose} className='text-white/70 hover:text-white text-xl'>✕</button>
        </div>

        <div className='p-6 space-y-5'>
          {/* Diagnosis */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Diagnosis</label>
            <textarea
              value={form.diagnosis}
              onChange={e => setForm(prev => ({ ...prev, diagnosis: e.target.value }))}
              className={inputCls + ' resize-none'} rows={2}
              placeholder='Primary diagnosis...'
            />
          </div>

          {/* Medicines */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <label className='text-sm font-medium text-gray-700'>Medicines</label>
              <button onClick={addMedicine}
                className='text-xs text-primary border border-primary px-2 py-0.5 rounded-full hover:bg-primary hover:text-white transition-all'>
                + Add medicine
              </button>
            </div>
            <div className='space-y-3'>
              {form.medicines.map((med, i) => (
                <div key={i} className='border rounded-lg p-3 space-y-2 bg-gray-50'>
                  <div className='flex gap-2'>
                    <input placeholder='Medicine name *' value={med.name}
                      onChange={e => updateMedicine(i, 'name', e.target.value)}
                      className={inputCls + ' flex-1'} />
                    {form.medicines.length > 1 && (
                      <button onClick={() => removeMedicine(i)} className='text-red-400 hover:text-red-600 text-lg px-1'>×</button>
                    )}
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <input placeholder='Dosage (e.g. 500mg)' value={med.dosage}
                      onChange={e => updateMedicine(i, 'dosage', e.target.value)} className={inputCls} />
                    <input placeholder='Duration (e.g. 5 days)' value={med.duration}
                      onChange={e => updateMedicine(i, 'duration', e.target.value)} className={inputCls} />
                  </div>
                  <input placeholder='Instructions (e.g. After meals)' value={med.notes}
                    onChange={e => updateMedicine(i, 'notes', e.target.value)} className={inputCls} />
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Follow-up */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Doctor's Notes</label>
              <textarea value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className={inputCls + ' resize-none'} rows={3} placeholder='General advice...' />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Follow-up Date</label>
              <input type='date' value={form.followUpDate}
                onChange={e => setForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                className={inputCls} />
            </div>
          </div>

          <div className='flex gap-3 pt-2'>
            <button onClick={save} disabled={saving}
              className='px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all text-sm'>
              {saving ? 'Saving…' : 'Save Prescription'}
            </button>
            <button onClick={onClose}
              className='px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 transition-all text-sm'>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Chat Window (admin-side) ─────────────────────────────────────────────────
import ChatWindow from '../../components/ChatWindow'

const DoctorAppointments = () => {
  const { dToken, appointments, getAppointments, cancelAppointment, completeAppointment, profileData } = useContext(DoctorContext)
  const { slotDateFormat, calculateAge, currency, backendUrl } = useContext(AppContext)

  const [prescriptionAppt, setPrescriptionAppt] = useState(null)
  const [chatAppt, setChatAppt] = useState(null)

  useEffect(() => {
    if (dToken) getAppointments()
  }, [dToken])

  return (
    <div className='w-full max-w-6xl m-5'>
      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-3 px-6 border-b'>
          <p>#</p><p>Patient</p><p>Payment</p><p>Age</p><p>Date & Time</p><p>Fees</p><p>Action</p>
        </div>

        {appointments.map((item, index) => (
          <div key={index} className='flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50'>
            <p className='max-sm:hidden'>{index + 1}</p>
            <div className='flex items-center gap-2'>
              <img src={item.userData.image} className='w-8 rounded-full' alt="" />
              <p>{item.userData.name}</p>
            </div>
            <div>
              <p className='text-xs inline border border-primary px-2 rounded-full'>
                {item.payment ? 'Online' : 'CASH'}
              </p>
            </div>
            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
            <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
            <p>{currency}{item.amount}</p>

            <div className='flex items-center gap-1 flex-wrap'>
              {item.cancelled ? (
                <p className='text-red-400 text-xs font-medium'>Cancelled</p>
              ) : item.isCompleted ? (
                <div className='flex flex-col gap-1'>
                  <p className='text-green-500 text-xs font-medium'>Completed</p>
                  <button
                    onClick={() => setPrescriptionAppt(item)}
                    className='text-xs border border-emerald-500 text-emerald-600 px-2 py-0.5 rounded-full hover:bg-emerald-500 hover:text-white transition-all'
                  >📋 Rx</button>
                  <button
                    onClick={() => setChatAppt(item)}
                    className='text-xs border border-primary text-primary px-2 py-0.5 rounded-full hover:bg-primary hover:text-white transition-all'
                  >💬 Chat</button>
                </div>
              ) : (
                <div className='flex flex-col gap-1'>
                  <div className='flex'>
                    <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />
                    <img onClick={() => completeAppointment(item._id)} className='w-10 cursor-pointer' src={assets.tick_icon} alt="" />
                  </div>
                  <button
                    onClick={() => setChatAppt(item)}
                    className='text-xs border border-primary text-primary px-2 py-0.5 rounded-full hover:bg-primary hover:text-white transition-all'
                  >💬 Chat</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Prescription Editor Modal ── */}
      {prescriptionAppt && (
        <PrescriptionEditor
          appointment={prescriptionAppt}
          dToken={dToken}
          backendUrl={backendUrl}
          onClose={() => setPrescriptionAppt(null)}
        />
      )}

      {/* ── Chat Window ── */}
      {chatAppt && profileData && (
        <ChatWindow
          appointmentId={chatAppt._id}
          currentUserId={profileData._id}
          currentUserRole='doctor'
          currentUserName={profileData.name}
          onClose={() => setChatAppt(null)}
        />
      )}
    </div>
  )
}

export default DoctorAppointments