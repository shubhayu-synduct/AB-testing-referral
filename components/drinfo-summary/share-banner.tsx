"use client"

import React from 'react'
import { X } from 'lucide-react'

interface ShareBannerProps {
  isVisible: boolean
  onClose: () => void
  onShare: () => void
  onShareWhatsApp: () => void
  onShareLinkedIn: () => void
  onShareEmail: () => void
}

export function ShareBanner({
  isVisible,
  onClose,
  onShare,
  onShareWhatsApp,
  onShareLinkedIn,
  onShareEmail
}: ShareBannerProps) {
  if (!isVisible) return null

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
      <div 
        className="text-gray-800 shadow-xl border border-gray-200 flex flex-col w-[90vw] sm:w-[80vw] md:w-[629px] h-auto rounded-3xl px-6 py-6 md:px-6 md:py-6 gap-4 md:gap-6 relative"
        style={{
          background: 'linear-gradient(358.48deg, #FFFFFF -1.72%, #E2EAFF 103.93%)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 p-1 z-10"
          aria-label="Close banner"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Banner Image */}
        <div className="flex justify-center">
            <img src="/banner.svg" alt="Banner" className="h-48 sm:h-56 md:h-auto w-full object-cover max-w-full rounded-2xl" />
        </div>
        
        <p className="font-['DM_Sans'] text-center max-w-md lg:max-w-lg mx-auto text-base md:text-lg lg:text-2xl leading-6 lg:leading-8" style={{ letterSpacing: '0%', fontWeight: '500', color: '#181D27' }}>
          Empower your peers with trusted, evidence-based insights from DR. INFO.
        </p>
        
        {/* Share Link Section */}
        <div className="space-y-1">
          <h3 className="text-left font-['DM_Sans'] text-sm md:text-base" style={{ fontWeight: '500', color: '#475569' }}>
            Share your link
          </h3>
          <div className="relative">
            <input
              type="text"
              value="join.drinfo.com/invite"
              readOnly
              className="w-full px-3 py-3 pr-24 bg-white rounded-lg text-xs md:text-sm font-['DM_Sans'] focus:outline-none"
              style={{ color: '#475569', boxShadow: '0px 1px 2px 0px #0A0D120D' }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText('join.drinfo.com/invite');
                // You could add a toast notification here
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-200 flex items-center gap-1.5"
            >
              <span className="text-sm md:text-base font-['DM_Sans']" style={{ color: '#475569' }}>Copy</span>
              <svg className="w-5 h-5" style={{ color: '#475569' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="space-y-1">
          <h3 className="text-left font-['DM_Sans'] text-sm md:text-base" style={{ fontWeight: '500', color: '#475569' }}>
            Share to
          </h3>
          <div className="flex gap-2">
            <button
              onClick={onShareWhatsApp}
              className="flex-1 bg-white hover:bg-gray-50 px-3 py-2 transition-colors duration-200 flex flex-col items-center justify-center gap-1"
              style={{ fontFamily: 'DM Sans', fontWeight: '500', fontSize: '16px', lineHeight: '24px', letterSpacing: '0%', color: '#414651', borderRadius: '3px', boxShadow: '0px 4px 6px 0px #ABC4FF1A' }}
            >
              <img src="/whatsapp.svg" alt="WhatsApp" className="w-5 h-5" />
              <span className="font-['DM_Sans'] font-light lg:font-medium text-sm md:text-base" style={{ lineHeight: '24px', letterSpacing: '0%', color: '#414651' }}>WhatsApp</span>
            </button>
            
            <button
              onClick={onShareLinkedIn}
              className="flex-1 bg-white hover:bg-gray-50 px-3 py-2 transition-colors duration-200 flex flex-col items-center justify-center gap-1"
              style={{ fontFamily: 'DM Sans', fontWeight: '500', fontSize: '16px', lineHeight: '24px', letterSpacing: '0%', color: '#414651', borderRadius: '3px', boxShadow: '0px 4px 6px 0px #ABC4FF1A' }}
            >
              <img src="/linkedin.svg" alt="LinkedIn" className="w-5 h-5" />
              <span className="font-['DM_Sans'] font-light lg:font-medium text-sm md:text-base" style={{ lineHeight: '24px', letterSpacing: '0%', color: '#414651' }}>LinkedIn</span>
            </button>
            
            <button
              onClick={onShareEmail}
              className="flex-1 bg-white hover:bg-gray-50 px-3 py-2 transition-colors duration-200 flex flex-col items-center justify-center gap-1"
              style={{ fontFamily: 'DM Sans', fontWeight: '500', fontSize: '16px', lineHeight: '24px', letterSpacing: '0%', color: '#414651', borderRadius: '3px', boxShadow: '0px 4px 6px 0px #ABC4FF1A' }}
            >
              <img src="/email.svg" alt="Email" className="w-5 h-5" />
              <span className="font-['DM_Sans'] font-light lg:font-medium text-sm md:text-base" style={{ lineHeight: '24px', letterSpacing: '0%', color: '#414651' }}>Email</span>
            </button>
          </div>
        </div>
        
        <div>
          <button
            onClick={onShare}
            className="w-full transition-colors duration-200 flex items-center justify-center text-sm md:text-base"
            style={{
              fontFamily: 'Inter',
              fontWeight: '400',
              lineHeight: '24px',
              letterSpacing: '0%',
              textDecoration: 'underline',
              textDecorationStyle: 'solid',
              textDecorationOffset: '0%',
              textDecorationThickness: '0%',
              color: '#214398'
            }}
          >
            More sharing options
          </button>
        </div>
      </div>
    </div>
  )
}
