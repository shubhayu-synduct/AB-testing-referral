"use client"

import React from 'react'
import { X, Share2, MessageCircle, Linkedin, Mail } from 'lucide-react'

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
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg shadow-lg p-4 max-w-md mx-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            <h3 className="font-semibold text-sm font-['DM_Sans']">
              Share with your peers
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-white/90 text-xs mb-4 font-['DM_Sans'] leading-relaxed">
          If you're finding DrInfo helpful, share it with your colleagues and help them discover AI-powered medical insights.
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={onShareWhatsApp}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          
          <button
            onClick={onShareLinkedIn}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-1.5"
          >
            <Linkedin className="w-3.5 h-3.5" />
            LinkedIn
          </button>
          
          <button
            onClick={onShareEmail}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </button>
        </div>
        
        <div className="mt-3 pt-3 border-t border-white/20">
          <button
            onClick={onShare}
            className="w-full text-white/80 hover:text-white text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            More sharing options
          </button>
        </div>
      </div>
    </div>
  )
}
