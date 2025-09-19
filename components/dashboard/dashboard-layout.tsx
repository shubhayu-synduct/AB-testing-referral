"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "./sidebar"
import Image from "next/image"
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { toast } from "sonner"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebarOpen')
      return stored === null ? false : stored === 'true'
    }
    return false
  })
  const [showCookieBanner, setShowCookieBanner] = useState(false)
  const pathname = usePathname()

  // Simple share function for current page
  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      
      if (navigator.share) {
        // Use native share API if available (mobile)
        await navigator.share({
          title: 'DR. INFO',
          text: 'Check out DR. INFO - AI-powered medical assistant',
          url: currentUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(currentUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      } catch (clipboardError) {
        toast.error('Failed to share');
      }
    }
  };

  // Keep sidebar open/close state in sync with localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isOpen.toString())
  }, [isOpen])

  // Check Firebase for cookie consent status
  useEffect(() => {
    if (!user) return;

    const checkCookieConsent = async () => {
      try {
        const db = getFirebaseFirestore();
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        // console.log("Checking cookie consent for user:", user.uid);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const cookieConsent = userData.cookieConsent;
          
          // console.log("User document exists, cookieConsent:", cookieConsent);
          // console.log("User data:", userData);
          
          // Check if user has given necessary or all consent
          if (cookieConsent && (cookieConsent.consentType === 'necessary' || cookieConsent.consentType === 'all')) {
            // console.log("User has valid consent, hiding banner");
            setShowCookieBanner(false);
          } else {
            console.log("User has no valid consent, showing banner");
            setShowCookieBanner(true);
          }
          
          // Debug: Log the state change
          // console.log("Setting showCookieBanner to:", true);
        } else {
          console.log("User document doesn't exist, showing banner");
          // User document doesn't exist, show cookie banner
          setShowCookieBanner(true);
        }
      } catch (err) {
        console.error("Error checking cookie consent:", err);
        logger.error("Error checking cookie consent:", err);
        // On error, show cookie banner as fallback
        setShowCookieBanner(true);
      }
    };

    checkCookieConsent();
  }, [user]);

  // Check user profession and redirect non-medical users to waitlist
  useEffect(() => {
    if (!user) return;

    const checkUserProfession = async () => {
      try {
        const db = getFirebaseFirestore();
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const profile = userData?.profile || userData;
          
          // Check if user has completed onboarding and has a profession
          if (userData?.onboardingCompleted && profile?.occupation) {
            // Define medical professions (these are allowed access)
            const medicalProfessions = [
              'Physician', 'Medical fellow', 'Medical consultant', 
              'Medical intern/resident', 'Medical student', 'Dentist'
            ];
            
            const isMedicalProfessional = medicalProfessions.includes(profile.occupation);
            
            // If NOT a medical professional, redirect to waitlist
            if (!isMedicalProfessional) {
              console.log('Non-medical user detected, redirecting to waitlist');
              router.push('/waitlist');
            }
          }
        }
      } catch (err) {
        console.error("Error checking user profession:", err);
        logger.error("Error checking user profession:", err);
        // On error, allow access (fail-safe)
      }
    };

    checkUserProfession();
  }, [user, router]);

  // TEMPORARILY DISABLE COMPETING REDIRECT - AuthProvider handles this
  // useEffect(() => {
  //   if (!loading && !user) {
  //     console.log("User not authenticated, redirecting to login...")
  //     router.push("/login")
  //   }
  // }, [user, loading, router])

  // Function to update Firebase with cookie consent
  const updateFirebaseConsent = async (consentData: any) => {
    if (!user) return;
    
    try {
      const db = getFirebaseFirestore();
      const userDocRef = doc(db, "users", user.uid);
      
      // Update or create user document with cookie consent
      await setDoc(userDocRef, {
        cookieConsent: {
          ...consentData,
          updatedAt: Date.now()
        }
      }, { merge: true });
      
      logger.debug("Cookie consent updated in Firebase:", consentData);
      
      // Hide the banner after successful Firebase update
      setShowCookieBanner(false);
    } catch (err) {
      logger.error("Error updating Firebase with cookie consent:", err);
      // Keep banner visible if Firebase update fails
    }
  };

  const getPageTitle = () => {
    if (pathname === '/dashboard/history') {
      return 'History'
    } else if (pathname === '/dashboard/profile') {
      return 'Profile'
    } else if (pathname.startsWith('/dashboard/')) {
      return 'DR. INFO Summary'
    } else if (pathname === '/dashboard') {
      return (
        <Image 
          src="/full-icon.svg" 
          alt="Dr.Info" 
          width={120}
          height={32}
          className="h-8 w-auto"
          priority
        />
      )
    } else if (pathname === '/guidelines') {
      return (
        <div className="flex flex-col items-center">
          <h1 className="text-[#204398] font-semibold text-lg">Guidelines</h1>
        </div>
      )
    } else if (pathname === '/drug-information') {
      return 'Drug Information'
    } else if (pathname.startsWith('/drug-information/')) {
      // Extract drug name from URL and format it
      const drugName = pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return 'Drug Information';
    }
    return (
      <Image 
        src="/full-icon.svg" 
        alt="Dr.Info" 
        width={120}
        height={32}
        className="h-8 w-auto"
        priority
      />
    )
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="flex space-x-1 justify-center mb-4">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render anything
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Top Navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center px-4">
        <div className="flex items-center justify-between w-full">
          {isOpen ? (
            <button
              className="p-2 hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              <Image 
                src="/sidebar_close_icon.svg" 
                alt="Close Sidebar" 
                width={28}
                height={28}
                className="w-7 h-7"
                priority
              />
            </button>
          ) : (
            <button
              className="p-2 hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(true)}
            >
              <Image 
                src="/open-sidebar.svg" 
                alt="Open Sidebar" 
                width={28}
                height={28}
                className="w-7 h-7"
                priority
              />
            </button>
          )}
          <div className="flex-1 flex justify-center">
            <h1 className="text-[#204398] font-semibold text-lg">{getPageTitle()}</h1>
          </div>
          {pathname !== '/dashboard' && (
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <Image 
                src="/Share icon.svg" 
                alt="Share" 
                width={28}
                height={28}
                className="w-7 h-7"
                priority
              />
            </button>
          )}
          {pathname === '/dashboard' && <div className="w-11" />}
        </div>
      </div>
      
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      {/* Main content */} 
      <main className="flex-1 overflow-auto md:mt-0 mt-14">
        {children}
      </main>
      
      {/* Cookie Consent Banner - Show based on Firebase status */}
      {showCookieBanner && <CookieConsentBanner onConsentUpdate={updateFirebaseConsent} forceShow={true} />}
    </div>
  )
}