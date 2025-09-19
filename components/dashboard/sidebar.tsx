"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Home,
  FileText,
  Pill,
  ExternalLink as ExternalLinkIcon,
  Stethoscope,
  GraduationCap,
  Folder,
  History,
  Menu,
  X,
  LogOut,
  Plus,
  ChevronDown,
  Settings,
} from "lucide-react"
import { clearSessionCookie, getSessionCookie } from "@/lib/auth-service"
import { SidebarHistory } from "./sidebar-history"
import { useAuth } from '@/hooks/use-auth'
import { doc, getDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { track } from '@/lib/analytics'

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const user = getSessionCookie()
  const sidebarRef = useRef<HTMLElement>(null)
  const { user: authUser } = useAuth()
  const [userProfile, setUserProfile] = useState<{ firstName?: string; lastName?: string; occupation?: string }>({})

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return
      
      try {
        const db = getFirebaseFirestore()
        const docRef = doc(db, "users", authUser.uid)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const profileData = docSnap.data().profile || {}
          setUserProfile({
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            occupation: profileData.occupation
          })
        }
      } catch (error) {
        logger.error("Error fetching user profile:", error)
      }
    }

    fetchUserProfile()
  }, [authUser])

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Only close on mobile view
        if (window.innerWidth < 768) {
          setIsOpen(false)
        }
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside)
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setIsOpen])

  // Listen for tour events to open sidebar
  useEffect(() => {
    const handleTourSidebarOpen = () => {
      setIsOpen(true);
    };

    const handleTourSidebarClose = () => {
      setIsOpen(false);
    };

    window.addEventListener('tourSidebarOpen', handleTourSidebarOpen);
    window.addEventListener('tourSidebarClose', handleTourSidebarClose);
    
    return () => {
      window.removeEventListener('tourSidebarOpen', handleTourSidebarOpen);
      window.removeEventListener('tourSidebarClose', handleTourSidebarClose);
    };
  }, [setIsOpen]);

  const handleSignOut = async () => {
    try {
      // Dynamically import Firebase auth
      const { getFirebaseAuth } = await import("@/lib/firebase")
      const { signOut } = await import("firebase/auth")

      const auth = await getFirebaseAuth()
      if (!auth) {
        throw new Error("Auth not initialized")
      }

      // Sign out of Firebase
      await signOut(auth)
      
      // Track logout event
      track.userLogout('manual', user?.uid)
      
      // Clear our custom session cookie
      clearSessionCookie()
      
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      logger.error("Error signing out:", error)
    }
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <>
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`bg-white border-r border-gray-200 h-[100dvh] flex flex-col transition-all duration-300 ease-in-out font-['DM_Sans'] ${
          isOpen ? "w-72" : "w-20"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-40`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4">
            {/* Logo */}
            <div className={`flex ${isOpen ? 'items-center justify-between' : 'flex-col items-center'} mb-8`}>
              <div className="flex items-center">
                {isOpen ? (
                  <svg 
                    width="120" 
                    height="32" 
                    viewBox="0 0 5471 1584" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => router.push('/dashboard')}
                  >
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
                ) : (
                  <div className="relative w-8 h-8">
                    <svg 
                      width="32" 
                      height="32" 
                      viewBox="0 0 1143 1584" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={() => router.push('/dashboard')}
                    >
                      <path d="M75 415V1480H843V1584H0V415H75ZM918 1376V1480H843V1376H918ZM225 415V1272H843V1376H150V415H225ZM993 1376H918V1272H993V1376ZM1068 1272H993V1168H1068V1272ZM918 1168V1272H843V1168H918ZM843 415V1168H298V415H843ZM993 1168H918V312H298V208H993V1168ZM1143 1168H1068V104H298V0H1143V1168ZM298 415H225V312H298V415ZM150 415H75V312H150V415ZM225 312H150V208H225V312ZM298 208H225V104H298V208Z" fill="url(#paint0_linear_2221_19099)"/>
                      <defs>
                        <linearGradient id="paint0_linear_2221_19099" x1="1184" y1="-14" x2="1.95015" y2="1596.12" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#9BB8FF"/>
                          <stop offset="0.45098" stopColor="#3771FE"/>
                          <stop offset="1" stopColor="#214498"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}
              </div>
              {isOpen ? (
                <button
                  className="flex items-center justify-center hover:bg-gray-100 rounded-md"
                  onClick={() => {
                    setIsOpen(false);
                    setIsProfileOpen(false);
                  }}
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
                  className="hidden md:flex items-center justify-center hover:bg-gray-100 rounded-md mt-4"
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

            {/* Navigation */}
            <nav className="space-y-1">
              <div className="mb-6">
                <button
                  className="flex items-center justify-center w-full rounded-md p-2 border border-solid border-[#cecece] hover:bg-gray-50 sidebar-new-search"
                  onClick={() => {
                    router.push("/dashboard");
                    if (window.innerWidth < 768) {
                      setIsOpen(false);
                    }
                  }}
                >
                  <img src="/new-search.svg" alt="New Search" className="w-5 h-5" />
                  {isOpen && <span className="ml-3 text-[16px] font-medium text-[#223258]">New Search</span>}
                </button>
              </div>

              <Link
                href="/dashboard"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg font-medium ${
                  isActive('/dashboard') 
                    ? 'text-[#223258] bg-blue-50' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                  <g clipPath="url(#clip0_0_95)">
                    <path d="M10.5054 25.6667L10.213 21.573C10.0558 19.372 11.7989 17.5 14.0054 17.5C16.2119 17.5 17.955 19.372 17.7978 21.573L17.5054 25.6667" stroke="#223258" strokeWidth="1.75"/>
                    <g clipPath="url(#clip1_0_95)">
                      <path d="M10.3023 25.6667L10.0099 21.573C9.85265 19.372 11.5957 17.5 13.8023 17.5C16.0088 17.5 17.7519 19.372 17.5946 21.573L17.3023 25.6667" stroke="#223258" strokeWidth="1.75"/>
                      <path d="M2 10L14 1.5L26 10L22 25.5H5L2 10Z" stroke="#223258" strokeWidth="1.75"/>
                    </g>
                  </g>
                  <defs>
                    <clipPath id="clip0_0_95">
                      <rect width="28" height="28" fill="white"/>
                    </clipPath>
                    <clipPath id="clip1_0_95">
                      <rect width="28" height="28" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
                {isOpen && <span className="ml-3">Home</span>}
              </Link>

              <Link 
                href="/guidelines"
                onClick={() => {
                  if (user) {
                    track.guidelinesClicked(user.uid, pathname)
                  }
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg sidebar-guidelines ${
                  isActive('/guidelines') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                  <g clipPath="url(#clip0_0_105)">
                    <path d="M21 24.4974H1.75V4.66406V1.16406H21V8.7474M21 24.4974V8.7474M21 24.4974H25.6667V8.7474H21" stroke="#223258" strokeWidth="1.75"/>
                    <path d="M4.66406 5.83594H16.3307" stroke="#223258" strokeWidth="1.75"/>
                    <path d="M4.66406 10.5H16.3307" stroke="#223258" strokeWidth="1.75"/>
                    <path d="M4.66406 15.1641H11.6641" stroke="#223258" strokeWidth="1.75"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_0_105">
                      <rect width="28" height="28" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
                {isOpen && <span className="ml-3">Guidelines</span>}
              </Link>

              <Link 
                href="/drug-information"
                onClick={() => {
                  if (user) {
                    track.drugInformationViewed('drug_search', 'search', user.uid, pathname)
                  }
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg sidebar-drug-info ${
                  isActive('/drug-information') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 31 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                  <path d="M18.2182 15.6583L9.5154 9.58487L14.373 2.62006C16.4869 0.217519 19.4819 0.866857 20.7772 1.48326C24.8844 4.00449 24.0217 7.34233 23.077 8.6961L18.2182 15.6583Z" stroke="#223258" strokeWidth="1.75"/>
                  <path d="M7.27854 11.9149L16.1214 18.1704L11.2089 25.3106C9.06971 27.7727 6.02976 27.0993 4.71423 26.4634C0.541691 23.8655 1.40943 20.4403 2.36487 19.0525L7.27854 11.9149Z" fill="#223258" stroke="#223258" strokeWidth="1.75"/>
                  <path d="M29.7529 19.3946C30.1322 20.1818 30.3451 21.0643 30.3451 21.9966C30.3451 25.3122 27.6573 28 24.3417 28C22.98 28 21.7249 27.5456 20.7176 26.7815L29.7529 19.3946ZM24.3417 15.9933C26.1375 15.9933 27.748 16.7828 28.8481 18.0325L19.5597 25.6247C18.7939 24.6168 18.3384 23.3602 18.3384 21.9966C18.3384 18.6811 21.0261 15.9933 24.3417 15.9933Z" fill="#223258"/>
                </svg>
                {isOpen && <span className="ml-3">Drug Information</span>}
              </Link>

              <Link 
                href="/image-generator"
                onClick={() => {
                  if (user) {
                    track.visualAbstractClicked(user.uid, pathname)
                  }
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg sidebar-visual-abstract ${
                  isActive('/image-generator') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isOpen && (
                  <div className="ml-3 flex items-center">
                    <span>Visual Abstract</span>
                    <span className="ml-2 px-1.5 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-[#3771FE] to-[#5B8AFF] rounded-full shadow-sm">NEW</span>
                  </div>
                )}
              </Link>

              <Link 
                href="/library"
                onClick={() => {
                  if (user) {
                    track.libraryClicked(user.uid, pathname)
                  }
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg sidebar-history ${
                  isActive('/library') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                  <path d="M8.16406 8.16406H17.4974M8.16406 12.8307H12.8307" stroke="#223258" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="round"/>
                  <path d="M21 21.5807L19.25 20.9391V18.0807M14 20.4141C14 23.3136 16.3505 25.6641 19.25 25.6641C22.1495 25.6641 24.5 23.3136 24.5 20.4141C24.5 17.5145 22.1495 15.1641 19.25 15.1641C16.3505 15.1641 14 17.5145 14 20.4141Z" stroke="#223258" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 25.5H3.5V2.5H22V13.5" stroke="#223258" strokeWidth="1.75"/>
                </svg>
                {isOpen && <span className="ml-3">Library</span>}
              </Link>
              
              {/* <Link 
                href="/dashboard/history"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg ${
                  isActive('/dashboard/history') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                  <path d="M8.16406 8.16406H17.4974M8.16406 12.8307H12.8307" stroke="#223258" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="round"/>
                  <path d="M21 21.5807L19.25 20.9391V18.0807M14 20.4141C14 23.3136 16.3505 25.6641 19.25 25.6641C22.1495 25.6641 24.5 23.3136 24.5 20.4141C24.5 17.5145 22.1495 15.1641 19.25 15.1641C16.3505 15.1641 14 17.5145 14 20.4141Z" stroke="#223258" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 25.5H3.5V2.5H22V13.5" stroke="#223258" strokeWidth="1.75"/>
                </svg>
                {isOpen && <span className="ml-3">History</span>}
              </Link> */}
            </nav>
          </div>

          {/* Sidebar History List - fills available space, scrollable, no overlap */}
          {isOpen && (
            <div className="flex-1 min-h-0 px-2 pb-2 border-b border-gray-200 overflow-y-auto scrollbar-hide">
              <SidebarHistory />
            </div>
          )}

          {/* Profile Section (always at bottom) */}
          <div className="mt-auto w-full p-2 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-gray-50 sidebar-profile"
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-[8px] bg-[#E4ECFF] flex items-center justify-center text-[#223258] font-semibold border border-[#223258]">
                    {(userProfile.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  {isOpen && (
                    <div className="ml-3 text-left">
                      <p className="font-semibold text-sm text-[#223258]">
                        {userProfile.firstName && userProfile.lastName 
                          ? `${userProfile.firstName} ${userProfile.lastName}`
                          : user?.email || 'User'}
                      </p>
                      <p className="text-xs text-[#223258]/70">
                        {userProfile.occupation 
                          ? userProfile.occupation.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')
                          : 'User'}
                      </p>
                    </div>
                  )}
                </div>
                {isOpen && (
                  <ChevronDown className={`h-5 w-5 text-[#223258] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className={`absolute ${isOpen ? 'bottom-full left-0 w-full' : 'bottom-0 left-full ml-2 w-48'} mb-2 bg-white rounded-[10px] shadow-lg border border-[#B5C9FC]`}>
                  <div className="p-2">
                    {/* Profile Settings */}
                    <button
                      className="flex items-center w-full px-3 py-2 rounded-[8px] text-[#223258] hover:bg-[#E4ECFF] font-semibold mb-1"
                      onClick={() => {
                        router.push("/dashboard/profile");
                        if (window.innerWidth < 768) {
                          setIsOpen(false);
                          setIsProfileOpen(false);
                        }
                      }}
                    >
                      <svg className="mr-3 h-5 w-5" fill="none" stroke="#223258" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Profile Settings
                    </button>
                    
                    {/* Upgrade Plan */}
                    {/* <button
                      className="flex items-center w-full px-3 py-2 text-[#223258] hover:bg-[#E4ECFF] rounded-[8px] mb-1 font-semibold"
                      onClick={() => {
                        router.push("/dashboard/profile?tab=subscription");
                        if (window.innerWidth < 768) {
                          setIsOpen(false);
                          setIsProfileOpen(false);
                        }
                      }}
                    >
                      <svg className="mr-3 h-5 w-5" fill="none" stroke="#223258" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      Upgrade Plan
                    </button> */}
                    
                    {/* Sign Out */}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-3 py-2 text-[#223258] hover:bg-[#E4ECFF] rounded-[8px] mt-1 font-semibold"
                    >
                      <svg className="mr-3 h-5 w-5" fill="none" stroke="#223258" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}