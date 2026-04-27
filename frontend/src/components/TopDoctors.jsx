import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const TopDoctors = () => {

    const navigate = useNavigate()
    const { doctors } = useContext(AppContext)

    return (
        <div className='flex flex-col items-center gap-4 my-16 text-[#262626] dark:text-gray-200 md:mx-10'>
            <h1 className='text-3xl font-medium'>Top Doctors to Book</h1>
            <p className='sm:w-1/3 text-center text-sm dark:text-gray-400'>Simply browse through our extensive list of trusted doctors.</p>
            <div className='w-full grid grid-cols-auto gap-4 pt-5 gap-y-6 px-3 sm:px-0'>
                {doctors.slice(0, 10).map((item, index) => (
                    <div onClick={() => { navigate(`/appointment/${item._id}`); scrollTo(0, 0) }} className='border border-[#C9D8FF] dark:border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500 bg-white dark:bg-gray-800' key={index}>
                        <img className='bg-[#bdbcd3] dark:bg-gray-700 w-full' src={item.image} alt="" />
                        <div className='p-4'>
                            <div className={`flex items-center gap-2 text-sm text-center ${item.available ? 'text-green-500' : "text-gray-500"}`}>
                                <p className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-500' : "bg-gray-500"}`}></p><p>{item.available ? 'Available' : "Not Available"}</p>
                            </div>
                            <p className='text-[#262626] dark:text-gray-100 text-lg font-medium'>{item.name}</p>
                            <p className='text-[#5C5C5C] dark:text-gray-400 text-sm'>{item.speciality}</p>
                            {item.totalReviews > 0 && (
                                <div className='flex items-center gap-1 mt-1'>
                                    <span className='text-yellow-400 text-xs'>{'★'.repeat(Math.round(item.averageRating))}{'☆'.repeat(5 - Math.round(item.averageRating))}</span>
                                    <span className='text-xs text-gray-400'>({item.totalReviews})</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => { navigate('/doctors'); scrollTo(0, 0) }} className='bg-[#e4eafe] dark:bg-gray-700 dark:text-gray-200 text-gray-600 px-12 py-3 rounded-full mt-10'>more</button>
        </div>
    )
}

export default TopDoctors