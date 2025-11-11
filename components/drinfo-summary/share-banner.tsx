"use client"

import React from 'react'
import { Copy, Check, Mail, MessageCircle, MoreHorizontal } from 'lucide-react'

interface ShareBannerProps {
  isVisible: boolean
  referralLink: string
  onShare: () => void
  onShareWhatsApp: () => void
  onShareLinkedIn: () => void
  onShareEmail: () => void
}

export function ShareBanner({
  isVisible,
  referralLink,
  onShare,
  onShareWhatsApp,
  onShareLinkedIn,
  onShareEmail
}: ShareBannerProps) {
  const [copied, setCopied] = React.useState(false)
  const [showMoreOptions, setShowMoreOptions] = React.useState(false)
  const shareLink = referralLink || 'https://app.drinfo.ai/signup'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleShareiMessage = () => {
    const smsUrl = `sms:&body=${encodeURIComponent('Check out DR. INFO: ' + shareLink)}`
    window.open(smsUrl)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DR. INFO',
          text: 'Check out DR. INFO - Your AI medical assistant',
          url: shareLink
        })
      } catch (error) {
        console.error('Share failed:', error)
      }
    } else {
      // Fallback to copying link
      handleCopy()
    }
  }

  if (!isVisible) return null

  return (
    <div className="w-full flex justify-center px-3 sm:px-4">
      <div className="w-full max-w-[480px] rounded-[10px] bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 border border-blue-400/20 animate-slide-up overflow-hidden relative">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-float" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 animate-float-delayed" />
        </div>
        <div className="p-5 space-y-4 relative z-10">
          {/* Animated Heading */}
          <div className="text-center animate-fade-in">
            <h3 className="text-xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
              Earn 1 Month Free
            </h3>
            <p className="text-sm text-blue-100 mt-1 font-medium leading-relaxed animate-fade-in animation-delay-100">
              Invite your colleagues to <span className="font-bold text-white">DR. INFO</span> Now
            </p>
          </div>

          {/* Copy Link with inline share button */}
          <div className="space-y-2">
            <div className="relative animate-fade-in animation-delay-100">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="w-full rounded-[10px] bg-white/20 border border-white/30 px-4 py-3 pr-20 text-sm text-white font-mono transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent hover:bg-white/25 placeholder-white/60"
              />
              <button
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 transform hover:scale-105 bg-white text-blue-700 shadow-md hover:bg-blue-50 active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Subtle share options toggle */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="text-xs text-blue-100 hover:text-white transition-all duration-300 flex items-center gap-1.5 animate-fade-in animation-delay-200 font-medium hover:scale-105 transform"
              >
                <span>More sharing options</span>
                <svg
                  className={`h-3 w-3 transition-transform duration-200 ${showMoreOptions ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Expandable Share Options - Grid Layout */}
          {showMoreOptions && (
            <div className="space-y-2 overflow-hidden pt-2 border-t border-white/20 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onShareEmail}
                  className="flex flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] bg-white/90 hover:bg-white transition-all duration-300 group active:scale-[0.98] animate-slide-in-bottom animation-delay-100 border border-white/50 hover:border-white transform hover:scale-105"
                >
                  <Mail className="h-4 w-4 text-gray-800 group-hover:animate-wiggle" />
                  <span className="text-sm text-gray-900 font-medium">Mail</span>
                </button>

                <button
                  onClick={onShareWhatsApp}
                  className="flex flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] bg-white/90 hover:bg-white transition-all duration-300 group active:scale-[0.98] animate-slide-in-bottom animation-delay-150 border border-white/50 hover:border-[#25D366] transform hover:scale-105"
                >
                  <svg className="h-4 w-4 text-[#25D366] group-hover:animate-wiggle" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.298-.495.099-.198.05-.372-.025-.521-.074-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="text-sm text-gray-900 font-medium">WhatsApp</span>
                </button>

                <button
                  onClick={onShareLinkedIn}
                  className="flex flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] bg-white/90 hover:bg-white transition-all duration-300 group active:scale-[0.98] animate-slide-in-bottom animation-delay-200 border border-white/50 hover:border-[#0077B5] transform hover:scale-105"
                >
                  <svg className="h-4 w-4 text-[#0077B5] group-hover:animate-wiggle" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  <span className="text-sm text-gray-900 font-medium">LinkedIn</span>
                </button>

                <button
                  onClick={handleShareiMessage}
                  className="flex flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] bg-white/90 hover:bg-white transition-all duration-300 group active:scale-[0.98] animate-slide-in-bottom animation-delay-250 border border-white/50 hover:border-white transform hover:scale-105"
                >
                  <MessageCircle className="h-4 w-4 text-gray-800 group-hover:animate-wiggle" />
                  <span className="text-sm text-gray-900 font-medium">Messages</span>
                </button>
              </div>

              <button
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-white/90 hover:bg-white transition-all duration-300 group active:scale-[0.98] animate-slide-in-bottom animation-delay-300 border border-white/50 hover:border-white transform hover:scale-[1.02]"
              >
                <MoreHorizontal className="h-5 w-5 text-gray-800" />
                <span className="text-sm text-gray-900 font-medium">More options</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes slide-in-bottom {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes check-bounce {
          0% {
            transform: scale(0) rotate(-45deg);
          }
          50% {
            transform: scale(1.2) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          33% {
            transform: translate(30px, -30px) rotate(120deg);
          }
          66% {
            transform: translate(-20px, 20px) rotate(240deg);
          }
        }
        
        @keyframes float-delayed {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          33% {
            transform: translate(-30px, 30px) rotate(-120deg);
          }
          66% {
            transform: translate(20px, -20px) rotate(-240deg);
          }
        }
        
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes wiggle {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-10deg);
          }
          75% {
            transform: rotate(10deg);
          }
        }
        
        @keyframes bounce-once {
          0%, 100% {
            transform: translateY(-50%) scale(1);
          }
          50% {
            transform: translateY(-50%) scale(1.1);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        
        .animate-slide-in-bottom {
          animation: slide-in-bottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        
        .animate-check-bounce {
          animation: check-bounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 20s ease-in-out infinite;
          animation-delay: -5s;
        }
        
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        
        .animate-wiggle {
          animation: wiggle 0.3s ease-in-out;
        }
        
        .animate-bounce-once {
          animation: bounce-once 0.3s ease;
        }
        
        .animation-delay-100 {
          animation-delay: 0.1s;
        }
        
        .animation-delay-150 {
          animation-delay: 0.15s;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-250 {
          animation-delay: 0.25s;
        }
        
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  )
}
