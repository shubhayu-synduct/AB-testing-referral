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
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div className="bg-white text-gray-800 rounded-lg shadow-xl p-6 w-[85vw] md:w-auto md:max-w-lg mx-1 md:mx-2 border border-gray-200">
        <div className="flex items-center justify-center mb-3 relative">
            <img src="/new-logo.svg" alt="DR. INFO Logo" className="h-[18px]" />
          <button
            onClick={onClose}
            className="absolute right-0 text-gray-500 hover:text-gray-700 transition-colors duration-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="mb-4 font-['DM_Sans'] text-center" style={{ fontSize: '16px', lineHeight: '24px', letterSpacing: '0%', fontWeight: '500', color: '#181D27' }}>
          Empower your peers with trusted, evidence-based insights from DR. INFO.
        </p>
        
        <div className="flex flex-col md:flex-row gap-2">
          <button
            onClick={onShareWhatsApp}
            className="flex-1 bg-white hover:bg-gray-50 px-3 py-2 transition-colors duration-200 flex items-center justify-center gap-1.5 border"
            style={{ fontFamily: 'DM Sans', fontWeight: '500', fontSize: '16px', lineHeight: '24px', letterSpacing: '0%', color: '#414651', borderRadius: '3px', borderColor: '#D5D7DA' }}
          >
            <img src="/whatsapp.svg" alt="WhatsApp" className="w-5 h-5" />
            WhatsApp
          </button>
          
          <button
            onClick={onShareLinkedIn}
            className="flex-1 bg-white hover:bg-gray-50 px-3 py-2 transition-colors duration-200 flex items-center justify-center gap-1.5 border"
            style={{ fontFamily: 'DM Sans', fontWeight: '500', fontSize: '16px', lineHeight: '24px', letterSpacing: '0%', color: '#414651', borderRadius: '3px', borderColor: '#D5D7DA' }}
          >
            <img src="/linkedin.svg" alt="LinkedIn" className="w-5 h-5" />
            LinkedIn
          </button>
          
          <button
            onClick={onShareEmail}
            className="flex-1 bg-white hover:bg-gray-50 px-3 py-2 transition-colors duration-200 flex items-center justify-center gap-1.5 border"
            style={{ fontFamily: 'DM Sans', fontWeight: '500', fontSize: '16px', lineHeight: '24px', letterSpacing: '0%', color: '#414651', borderRadius: '3px', borderColor: '#D5D7DA' }}
          >
            <img src="/email.svg" alt="Email" className="w-5 h-5" />
            Email
          </button>
        </div>
        
        <div className="mt-3 pt-3">
          <button
            onClick={onShare}
            className="w-full transition-colors duration-200 flex items-center justify-center"
            style={{ 
              fontFamily: 'Inter', 
              fontWeight: '400', 
              fontSize: '14px', 
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
