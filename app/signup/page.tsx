"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { SignUpForm } from "@/components/auth/signup-form"
import { CookieConsentBanner } from "@/components/CookieConsentBanner"

function SignUpContent() {
  const searchParams = useSearchParams()
  const [showDeletedMessage, setShowDeletedMessage] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)

  useEffect(() => {
    // Get referral code from URL if present
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralCode(ref)
    }
  }, [searchParams])

  useEffect(() => {
    const deletedParam = searchParams.get('deleted')
    if (deletedParam === 'true') {
      setShowDeletedMessage(true)
      
      // Sign out the user when they're redirected after account deletion
      const signOutUser = async () => {
        try {
          const { getFirebaseAuth } = await import("@/lib/firebase")
          const auth = await getFirebaseAuth()
          if (auth && auth.currentUser) {
            // console.log('Signing out user after account deletion...')
            await auth.signOut()
            // console.log('User signed out successfully')
          }
        } catch (error) {
          // console.error('Error signing out user:', error)
        }
      }
      
      signOutUser()
      
      // Auto-hide the message after 5 seconds
      const timer = setTimeout(() => {
        setShowDeletedMessage(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2 sm:p-4 font-['DM_Sans']">
      <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[60%] flex flex-col items-center justify-center">
        {/* Logo and Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 w-full flex flex-col items-center">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <Image
              src="/full-icon.svg"
              alt="DR. INFO Logo"
              width={150}
              height={32}
              className="text-white w-[150px] sm:w-[180px] md:w-[200px] lg:w-[200px]"
            />
          </div>
          <div className="w-full">
            <p 
              className="text-[#223258] mt-5 mb-2 font-medium text-[24px] sm:text-[28px] md:text-[30px] lg:text-[30px] font-['DM_Sans']" 
              style={{ 
                lineHeight: '1.2'
              }}
            >
              Instant Access To Smart Clinical Insights
            </p>
          </div>
        </div>

        {/* Account Deleted Message */}
        {showDeletedMessage && (
          <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-md mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h3 className="text-blue-800 font-medium">Account Successfully Deleted</h3>
              </div>
              <p className="text-blue-700 text-sm">
                Your account and all associated data have been permanently removed. 
                You can create a new account anytime.
              </p>
            </div>
          </div>
        )}

        {/* Sign Up Form */}
        <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-md flex flex-col items-center">
          <div className="bg-[#F4F7FF] rounded-[5px] shadow-sm border-[#3771FE]/50 border-2 p-3 sm:p-5 md:p-6 lg:p-8 w-full">
            <SignUpForm referralCode={referralCode} />
          </div>

          {/* Terms and Privacy */}
          <div className="text-center mt-4 sm:mt-5 md:mt-6 text-xs sm:text-sm text-gray-500 font-['DM_Sans'] w-full px-2">
            By signing up, you agree to our{' '}
            <Link href="https://drinfo.ai/termsofservice/" className="text-[#3771FE] hover:text-[#3771FE] font-['DM_Sans']" target="_blank" rel="noopener noreferrer">
              Terms of use
            </Link>
            {' '}and{' '}
            <Link href="https://drinfo.ai/privacy-policy/" className="text-[#3771FE] hover:text-[#3771FE] font-['DM_Sans']" target="_blank" rel="noopener noreferrer">
              Privacy policy
            </Link>
          </div>
        </div>
      </div>

      {/* Cookie Consent Banner - Overlay Modal */}
      <CookieConsentBanner />
    </div>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3771FE] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}
