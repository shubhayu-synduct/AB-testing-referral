"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { clearSessionCookie } from "@/lib/auth-service"

interface WaitlistModalProps {
  isOpen: boolean
}

export default function WaitlistModal({ isOpen }: WaitlistModalProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(10)

  // Auto signout after 30 seconds with countdown
  useEffect(() => {
    if (isOpen) {
      setCountdown(10)
      
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      const signoutTimer = setTimeout(async () => {
        try {
          // console.log('Auto signing out non-medical user after 30 seconds')
          
          // Sign out from Firebase
          const { getFirebaseAuth } = await import("@/lib/firebase")
          const { signOut } = await import("firebase/auth")
          const auth = await getFirebaseAuth()
          await signOut(auth)
          
          // Clear session cookie
          clearSessionCookie()
          
          // Redirect to login
          router.push('/login')
        } catch (error) {
          console.error('Error during auto signout:', error)
          // Fallback: just redirect to login
          router.push('/login')
        }
      }, 30000) // 30 seconds

      return () => {
        clearInterval(countdownTimer)
        clearTimeout(signoutTimer)
      }
    }
  }, [isOpen, router])

  if (!isOpen) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 pb-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2">
            <Image
              src="/full-icon.svg"
              alt="DR. INFO Logo"
              width={200}
              height={57}
              className="text-white"
            />
          </div>
        </div>
        
        <div className="bg-[#F4F7FF] shadow-lg border border-[#3771FE]/50 px-8 py-8 rounded-[5px] text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-[#C6D7FF]/50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-[#3771FE]" />
            </div>
            <h3 className="text-xl font-semibold text-[#223258] mb-3" style={{ fontFamily: 'DM Sans', fontSize: 20, fontWeight: 550 }}>
              You're on the Waitlist!
            </h3>
            <p className="text-[#223258] mb-6 leading-relaxed" style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: 14 }}>
              Thank you for your interest in DR. INFO. Our service is currently available only to Physicians, Medical Fellows, Medical Consultants, Medical Interns/Residents, Pharmacists, Advanced Practice Nurses, Clinical Researchers, and Dentists. We've added you to our waitlist and will get back to you soon when we expand access.
            </p>
            <div className="text-[#223258] text-sm" style={{ fontFamily: 'DM Sans', fontWeight: 400 }}>
              Signing out in <span className="font-semibold text-[#3771FE]">{countdown}</span> seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
