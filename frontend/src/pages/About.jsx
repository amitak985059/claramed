import React from 'react'
import { assets } from '../assets/assets'

const About = () => {
  return (
    <div>

      <div className='text-center text-2xl pt-10 text-[#707070] dark:text-gray-400'>
        <p>ABOUT <span className='text-gray-700 dark:text-gray-200 font-semibold'>US</span></p>
      </div>

      <div className='my-10 flex flex-col md:flex-row gap-12'>
        <img className='w-full md:max-w-[360px]' src={assets.about_image} alt="" />
        <div className='flex flex-col justify-center gap-6 md:w-2/4 text-sm text-gray-600 dark:text-gray-400'>
          <p>Welcome to Claramed, your trusted partner in managing your healthcare needs conveniently and efficiently. At Claramed, we understand the challenges individuals face when it comes to scheduling doctor appointments and managing their health records.</p>
          <p>Claramed is committed to excellence in healthcare technology. We continuously strive to enhance our platform, integrating the latest advancements to improve user experience and deliver superior service. Whether you're booking your first appointment or managing ongoing care, Claramed is here to support you every step of the way.</p>
          <b className='text-gray-800 dark:text-gray-200'>Our Vision</b>
          <p>Our vision at Claramed is to create a seamless healthcare experience for every user. We aim to bridge the gap between patients and healthcare providers, making it easier for you to access the care you need, when you need it.</p>
        </div>
      </div>

      <div className='text-xl my-4 dark:text-gray-200'>
        <p>WHY  <span className='text-gray-700 dark:text-gray-200 font-semibold'>CHOOSE US</span></p>
      </div>

      <div className='flex flex-col md:flex-row mb-20'>
        <div className='border dark:border-gray-700 px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 dark:text-gray-400 cursor-pointer'>
          <b className='dark:text-gray-200'>EFFICIENCY:</b>
          <p>Streamlined appointment scheduling that fits into your busy lifestyle.</p>
        </div>
        <div className='border dark:border-gray-700 px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 dark:text-gray-400 cursor-pointer'>
          <b className='dark:text-gray-200'>CONVENIENCE: </b>
          <p>Access to a network of trusted healthcare professionals in your area.</p>
        </div>
        <div className='border dark:border-gray-700 px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 dark:text-gray-400 cursor-pointer'>
          <b className='dark:text-gray-200'>PERSONALIZATION:</b>
          <p >Tailored recommendations and reminders to help you stay on top of your health.</p>
        </div>
      </div>

    </div>
  )
}

export default About
