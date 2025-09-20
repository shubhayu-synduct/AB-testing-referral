"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "./sidebar"
import Image from "next/image"
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query as firestoreQuery, orderBy, serverTimestamp } from 'firebase/firestore'
import { getFirebaseFirestore } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { toast } from "sonner"
import { X, Copy, Check, Mail } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
  sessionId?: string
  user?: any
}

export function DashboardLayout({ children, sessionId, user: propUser }: DashboardLayoutProps) {
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
  
  // Share functionality state
  const [showSharePopup, setShowSharePopup] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  // Chat share function - same as DrInfoSummary
  const handleShare = async () => {
    // If we're in a chat session, use chat sharing
    if (sessionId && (propUser || user)) {
      const currentUser = propUser || user;
      if (!currentUser) {
        logger.error('Cannot share: missing user');
        return;
      }

      setIsSharing(true);
      setShowSharePopup(true);

      try {
        const db = getFirebaseFirestore();
        const userId = currentUser.uid || currentUser.id;

        // Get the current chat session data
        const sessionDocRef = doc(db, "conversations", sessionId);
        const sessionDoc = await getDoc(sessionDocRef);
        
        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }

        const sessionData = sessionDoc.data();
        
        // Get all threads for this session
        const threadsRef = collection(db, "conversations", sessionId, "threads");
        const threadsQueryRef = firestoreQuery(threadsRef, orderBy("user_message.timestamp"));
        const threadsSnapshot = await getDocs(threadsQueryRef);
        
        const threads: any[] = [];
        threadsSnapshot.forEach((threadDoc) => {
          const threadData = threadDoc.data();
          // Clean the data to remove any undefined or null values
          const cleanThread = {
            user_message: {
              content: threadData.user_message?.content || '',
              timestamp: threadData.user_message?.timestamp || Date.now()
            },
            bot_response: {
              content: threadData.bot_response?.content || '',
              citations: threadData.bot_response?.citations || {},
              search_data: threadData.bot_response?.search_data || {},
              svg_content: threadData.bot_response?.svg_content || []
            },
            context: {
              parent_thread_id: threadData.context?.parent_thread_id || null
            }
          };
          threads.push(cleanThread);
        });

        // Create public chat document
        const publicChatData = {
          original_session_id: sessionId,
          user_id: userId,
          user_email: currentUser.email || '',
          title: sessionData.title || 'Shared Chat',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          threads: threads,
          is_public: true
        };

        const publicChatRef = await addDoc(collection(db, "public_chats"), publicChatData);
        
        // Generate shareable link
        const shareableLink = `${window.location.origin}/dashboard/public/${publicChatRef.id}`;
        setShareLink(shareableLink);
        
        logger.debug('Chat shared successfully:', publicChatRef.id);
      } catch (error) {
        logger.error('Error sharing chat:', error);
        setShareLink('');
      } finally {
        setIsSharing(false);
      }
    } else {
      // Fallback to simple URL sharing for non-chat pages
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
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
    }
  };

  const shareOnLinkedIn = () => {
    if (!shareLink) return;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`;
    window.open(url, '_blank');
  };

  const shareOnWhatsApp = () => {
    if (!shareLink) return;
    const url = `https://wa.me/?text=${encodeURIComponent(`Check out this chat: ${shareLink}`)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    if (!shareLink) return;
    const subject = 'Shared Chat from DR. INFO';
    const body = `I wanted to share this chat with you: ${shareLink}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
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
          if (cookieConsent && (cookieConsent.consentType === 'necessary' || cookieConsent.consentType === 'all' || cookieConsent.consentType === 'custom')) {
            console.log("User has valid consent, hiding banner");
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
          
          // Check if user has completed onboarding
          if (userData?.onboardingCompleted) {
            // Check the waitlisted field directly from Firebase
            const isWaitlisted = userData?.waitlisted === true;
            
            // If user is waitlisted, redirect to waitlist
            if (isWaitlisted) {
              console.log('Waitlisted user detected, redirecting to waitlist');
              router.push('/waitlist');
            }
          }
        }
      } catch (err) {
        console.error("Error checking user waitlist status:", err);
        logger.error("Error checking user waitlist status:", err);
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
        <svg width="120" height="32" viewBox="0 0 5471 1584" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
          <path d="M75 415V1480H843V1584H0V415H75ZM918 1376V1480H843V1376H918ZM225 415V1272H843V1376H150V415H225ZM993 1376H918V1272H993V1376ZM1068 1272H993V1168H1068V1272ZM918 1168V1272H843V1168H918ZM843 415V1168H298V415H843ZM993 1168H918V312H298V208H993V1168ZM1143 1168H1068V104H298V0H1143V1168ZM298 415H225V312H298V415ZM150 415H75V312H150V415ZM225 312H150V208H225V312ZM298 208H225V104H298V208Z" fill="url(#paint0_linear_2221_19099)"/>
          <path d="M2948.44 1019.98C2994.39 1019.98 3031.9 1056.56 3031.9 1102.5C3031.9 1148.45 2994.39 1186.9 2948.44 1186.9C2902.49 1186.9 2864.98 1148.45 2864.98 1102.5C2864.98 1056.56 2902.49 1019.98 2948.44 1019.98Z" fill="#214498"/>
          <path d="M2618.72 869.946L2818.45 1168.14H2651.54L2479.94 883.074H2478.06V1168.14H2340.22V461.102H2526.82C2666.54 461.102 2763.13 522.991 2763.13 673.963C2763.13 763.984 2713.43 854.005 2618.72 869.946ZM2478.06 573.628V786.489H2495.88C2571.83 786.489 2625.28 763.984 2625.28 677.714C2625.28 590.506 2569.96 573.628 2496.82 573.628H2478.06Z" fill="#214498"/>
          <path d="M1734 1168.14V461.102H1930.92C2135.34 461.102 2272.25 613.949 2272.25 815.559C2272.25 1014.35 2131.59 1168.14 1929.98 1168.14H1734ZM1871.84 581.129V1048.11H1894.35C2064.08 1048.11 2129.72 954.341 2129.72 814.621C2129.72 660.835 2050.95 581.129 1894.35 581.129H1871.84Z" fill="#214498"/>
          <path d="M5345.46 813.336C5345.46 1021.51 5211.37 1186.55 4995.69 1186.55C4780.02 1186.55 4645.92 1021.51 4645.92 813.336C4645.92 603.287 4784.7 442 4995.69 442C5206.68 442 5345.46 603.287 5345.46 813.336ZM5202.93 807.71C5202.93 693.308 5126.03 577.969 4995.69 577.969C4865.35 577.969 4788.45 693.308 4788.45 807.71C4788.45 916.485 4842.84 1050.58 4995.69 1050.58C5148.54 1050.58 5202.93 916.485 5202.93 807.71Z" fill="#214498"/>
          <path d="M4596.33 580.778H4383.47V736.439H4583.2V856.467H4383.47V1167.79H4245.62V460.75H4596.33V580.778Z" fill="#214498"/>
          <path d="M3534.09 1167.79V442H3633.49L4005.77 936.177H4007.64V460.754H4145.49V1181.86H4046.09L3673.81 687.682H3671.94V1167.79H3534.09Z" fill="#214498"/>
          <path d="M3433.84 460.75V1167.79H3296V460.75H3433.84Z" fill="#214498"/>
          <defs>
            <linearGradient id="paint0_linear_2221_19099" x1="1184" y1="-14" x2="1.95015" y2="1596.12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9BB8FF"/>
              <stop offset="0.45098" stopColor="#3771FE"/>
              <stop offset="1" stopColor="#214498"/>
            </linearGradient>
          </defs>
        </svg>
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
    } else if (pathname === '/ai-results') {
      return 'Drug Information';
    }
    return (
      <svg width="120" height="32" viewBox="0 0 5471 1584" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
        <path d="M75 415V1480H843V1584H0V415H75ZM918 1376V1480H843V1376H918ZM225 415V1272H843V1376H150V415H225ZM993 1376H918V1272H993V1376ZM1068 1272H993V1168H1068V1272ZM918 1168V1272H843V1168H918ZM843 415V1168H298V415H843ZM993 1168H918V312H298V208H993V1168ZM1143 1168H1068V104H298V0H1143V1168ZM298 415H225V312H298V415ZM150 415H75V312H150V415ZM225 312H150V208H225V312ZM298 208H225V104H298V208Z" fill="url(#paint0_linear_2221_19099)"/>
        <path d="M2948.44 1019.98C2994.39 1019.98 3031.9 1056.56 3031.9 1102.5C3031.9 1148.45 2994.39 1186.9 2948.44 1186.9C2902.49 1186.9 2864.98 1148.45 2864.98 1102.5C2864.98 1056.56 2902.49 1019.98 2948.44 1019.98Z" fill="#214498"/>
        <path d="M2618.72 869.946L2818.45 1168.14H2651.54L2479.94 883.074H2478.06V1168.14H2340.22V461.102H2526.82C2666.54 461.102 2763.13 522.991 2763.13 673.963C2763.13 763.984 2713.43 854.005 2618.72 869.946ZM2478.06 573.628V786.489H2495.88C2571.83 786.489 2625.28 763.984 2625.28 677.714C2625.28 590.506 2569.96 573.628 2496.82 573.628H2478.06Z" fill="#214498"/>
        <path d="M1734 1168.14V461.102H1930.92C2135.34 461.102 2272.25 613.949 2272.25 815.559C2272.25 1014.35 2131.59 1168.14 1929.98 1168.14H1734ZM1871.84 581.129V1048.11H1894.35C2064.08 1048.11 2129.72 954.341 2129.72 814.621C2129.72 660.835 2050.95 581.129 1894.35 581.129H1871.84Z" fill="#214498"/>
        <path d="M5345.46 813.336C5345.46 1021.51 5211.37 1186.55 4995.69 1186.55C4780.02 1186.55 4645.92 1021.51 4645.92 813.336C4645.92 603.287 4784.7 442 4995.69 442C5206.68 442 5345.46 603.287 5345.46 813.336ZM5202.93 807.71C5202.93 693.308 5126.03 577.969 4995.69 577.969C4865.35 577.969 4788.45 693.308 4788.45 807.71C4788.45 916.485 4842.84 1050.58 4995.69 1050.58C5148.54 1050.58 5202.93 916.485 5202.93 807.71Z" fill="#214498"/>
        <path d="M4596.33 580.778H4383.47V736.439H4583.2V856.467H4383.47V1167.79H4245.62V460.75H4596.33V580.778Z" fill="#214498"/>
        <path d="M3534.09 1167.79V442H3633.49L4005.77 936.177H4007.64V460.754H4145.49V1181.86H4046.09L3673.81 687.682H3671.94V1167.79H3534.09Z" fill="#214498"/>
        <path d="M3433.84 460.75V1167.79H3296V460.75H3433.84Z" fill="#214498"/>
        <defs>
          <linearGradient id="paint0_linear_2221_19099" x1="1184" y1="-14" x2="1.95015" y2="1596.12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9BB8FF"/>
            <stop offset="0.45098" stopColor="#3771FE"/>
            <stop offset="1" stopColor="#214498"/>
          </linearGradient>
        </defs>
      </svg>
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
        <div className="flex items-center w-full relative">
          {/* Left side - Sidebar button */}
          <div className="flex-shrink-0">
            {isOpen ? (
              <button
                className="p-2 hover:bg-gray-100 rounded-md"
                onClick={() => setIsOpen(false)}
              >
                <svg width="28" height="28" viewBox="0 0 26 27" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
                  <path d="M14.1 4H11.9H2.15712L2 14V24H11.9H14.1H24V14V4H14.1Z" stroke="#223258" strokeWidth="1.625"/>
                  <path d="M10 4V24" stroke="#223258" strokeWidth="1.625" strokeLinejoin="round"/>
                  <path d="M5 8H7" stroke="#223258" strokeWidth="1.625" strokeLinecap="square" strokeLinejoin="round"/>
                  <path d="M18 12L16 14L17.9 16" stroke="#223258" strokeWidth="1.625" strokeLinecap="square"/>
                </svg>
              </button>
            ) : (
              <button
                className="p-2 hover:bg-gray-100 rounded-md"
                onClick={() => setIsOpen(true)}
              >
                <svg width="28" height="28" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
                  <path d="M11.8961 3.00106H14.0961L23.9961 3V13.0005V23H14.0961H11.8961H1.99609V13.0005V3.00106H11.8961Z" stroke="#223258" strokeWidth="1.625"/>
                  <path d="M15.9961 4V22" stroke="#223258" strokeWidth="1.625" strokeLinecap="square"/>
                  <path d="M20.9961 7H18.9961" stroke="#223258" strokeWidth="1.625" strokeLinecap="square" strokeLinejoin="round"/>
                  <path d="M8.99609 11L10.1328 12.0572L10.9961 13.0084L10.1328 13.9428L8.99609 15" stroke="#223258" strokeWidth="1.625" strokeLinecap="square"/>
                </svg>
              </button>
            )}
          </div>
          
          {/* Center - Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-[#204398] font-semibold text-lg whitespace-nowrap">{getPageTitle()}</h1>
          </div>
          
          {/* Right side - Share button or spacer */}
          <div className="flex-shrink-0 ml-auto">
            {pathname !== '/dashboard' && !pathname.startsWith('/drug-information') && pathname !== '/ai-results' && pathname !== '/guidelines' ? (
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-md drinfo-share-step"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
                  <path d="M9.40104 4.5H8.35938H2.10938V10.5V14.5V20.5H8.35938H12.566H18.776V17" stroke="#223258" strokeWidth="1.5" strokeLinecap="square"/>
                  <path d="M16.1667 3.85355V7H12.5208C9.64435 7 7.3125 9.23858 7.3125 12V14.5C7.3125 14.5 8.875 11 13.1157 11H16.1667V14.1464C16.1667 14.3417 16.3316 14.5 16.535 14.5C16.6326 14.5 16.7263 14.4628 16.7954 14.3964L21.8958 9L16.7954 3.60355C16.7263 3.53725 16.6326 3.5 16.535 3.5C16.3316 3.5 16.1667 3.65829 16.1667 3.85355Z" stroke="#223258" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            ) : (
              <div className="w-11" />
            )}
          </div>
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
      
      {/* Share Popup - Only show for chat sessions */}
      {sessionId && showSharePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFDFF] rounded-lg shadow-xl max-w-xl w-full mx-4 border border-[#C8C8C8]">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <h2 className="text-2xl font-medium text-blue-900">
                Shareable public link
              </h2>
              <button 
                onClick={() => setShowSharePopup(false)}
                className="text-[#263969] hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6">
              {/* Link Creation Status */}
              <div className="mb-6">
                {isSharing ? (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-gray-500">Creating Link...</span>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-[#C8D8FF]">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      disabled={!shareLink}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-base rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCopied ? (
                        <>
                          <Check size={18} />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Border line */}
            <div className="border-t border-gray-200"></div>

            {/* Share Options */}
            <div className="px-6">
              <div className="flex justify-center space-x-8">
                {/* LinkedIn */}
                <button 
                  onClick={shareOnLinkedIn}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#0077B5] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <svg className="w-[70%] h-[70%] text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">LinkedIn</span>
                </button>

                {/* WhatsApp */}
                <button 
                  onClick={shareOnWhatsApp}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#25D366] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <svg className="w-[70%] h-[70%] text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.488"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                </button>

                {/* Mail */}
                <button 
                  onClick={shareViaEmail}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#214498] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <Mail className="w-[70%] h-[70%] text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Mail</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}