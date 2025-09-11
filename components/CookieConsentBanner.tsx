'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  consentedAt: string;
  consentType: 'none' | 'necessary' | 'all' | 'custom';
}

interface CookieConsentBannerProps {
  onConsentUpdate?: (consentData: CookieConsent) => void;
  forceShow?: boolean; // New prop to force show the banner
}

export function CookieConsentBanner({ onConsentUpdate, forceShow }: CookieConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showManagePreferences, setShowManagePreferences] = useState(false);
  const [cookiePreferences, setCookiePreferences] = useState({
    analytics: false,
    marketing: false,
    functional: false
  });
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  useEffect(() => {
    // If forceShow is true, always show the banner regardless of localStorage
    if (forceShow) {
      setShowBanner(true);
      return;
    }
    
    const savedConsent = localStorage.getItem('drinfo-cookie-consent')
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent)
        setConsent(parsed)
        
        // Set initial preferences based on saved consent
        setCookiePreferences({
          analytics: parsed.analytics || false,
          marketing: parsed.marketing || false,
          functional: parsed.functional || false
        })
        
        setShowBanner(false) // Don't show banner if already consented
      } catch (error) {
        console.error('Error parsing cookie consent:', error)
        // If there's an error parsing, show the banner
        setShowBanner(true)
      }
    } else {
      // No consent found, show the banner
      setShowBanner(true)
    }
  }, [forceShow])

  useEffect(() => {
    if (showBanner) {
      // Small delay for smooth animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

  const handleConsent = (type: 'necessary' | 'all') => {
    const consent: CookieConsent = {
      necessary: true,
      analytics: type === 'all',
      marketing: type === 'all',
      functional: type === 'all',
      consentedAt: new Date().toISOString(),
      consentType: type === 'necessary' ? 'necessary' : 'all'
    }
    
    localStorage.setItem('drinfo-cookie-consent', JSON.stringify(consent))
    setConsent(consent)
    
    // Call the callback to update Firebase
    if (onConsentUpdate) {
      onConsentUpdate(consent)
    }
    
    setShowBanner(false)
  }

  const handleManagePreferences = () => {
    const consent: CookieConsent = {
      ...cookiePreferences,
      necessary: true, // Always true
      consentedAt: new Date().toISOString(),
      consentType: 'custom'
    }
    
    localStorage.setItem('drinfo-cookie-consent', JSON.stringify(consent))
    setConsent(consent)
    
    // Call the callback to update Firebase
    if (onConsentUpdate) {
      onConsentUpdate(consent)
    }
    
    setShowBanner(false)
  }

  const toggleCookie = (type: 'analytics' | 'marketing' | 'functional') => {
    setCookiePreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (!showBanner) {
    return null;
  }

  if (showManagePreferences) {
    return (
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
        <div className="absolute bottom-4 right-4 w-[calc(100vw-2rem)] sm:w-96 md:w-[450px]">
          <Card className={`shadow-xl border-0 bg-[#214498] transform transition-all duration-300 ease-out ${
            isVisible 
              ? 'translate-y-0 opacity-100 scale-100' 
              : 'translate-y-4 opacity-0 scale-95'
          }`} style={{ borderRadius: '10px' }}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <svg 
                      className="w-4 h-4 text-[#214498]" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1 font-['DM_Sans']">
                    Cookie Preferences
                  </h3>
                  <p className="text-xs text-blue-100 font-['DM_Sans']">
                    Manage your cookie preferences below
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Necessary Cookies - Locked */}
                <div className="bg-blue-600/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#214498]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white font-['DM_Sans']">Necessary</h4>
                        <p className="text-xs text-blue-100 font-['DM_Sans']">Authentication & security</p>
                      </div>
                    </div>
                    <div className="relative w-12 h-6 rounded-full bg-[#214498]">
                      <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#214498]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-blue-600/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#214498]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white font-['DM_Sans']">Analytics</h4>
                        <p className="text-xs text-blue-100 font-['DM_Sans']">Website performance & usage</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCookie('analytics')}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out ${
                        cookiePreferences.analytics ? 'bg-[#214498]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ease-in-out flex items-center justify-center ${
                        cookiePreferences.analytics ? 'left-6' : 'left-0.5'
                      }`}>
                        {cookiePreferences.analytics ? (
                          <svg className="w-3 h-3 text-[#214498]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-blue-600/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#214498]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white font-['DM_Sans']">Marketing</h4>
                        <p className="text-xs text-blue-100 font-['DM_Sans']">Personalized ads & content</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCookie('marketing')}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out ${
                        cookiePreferences.marketing ? 'bg-[#214498]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ease-in-out flex items-center justify-center ${
                        cookiePreferences.marketing ? 'left-6' : 'left-0.5'
                      }`}>
                        {cookiePreferences.marketing ? (
                          <svg className="w-3 h-3 text-[#214498]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="bg-blue-600/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#214498]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white font-['DM_Sans']">Functional</h4>
                        <p className="text-xs text-blue-100 font-['DM_Sans']">User preferences & customization</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCookie('functional')}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out ${
                        cookiePreferences.functional ? 'bg-[#214498]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ease-in-out flex items-center justify-center ${
                        cookiePreferences.functional ? 'left-6' : 'left-0.5'
                      }`}>
                        {cookiePreferences.functional ? (
                          <svg className="w-3 h-3 text-[#214498]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <div className="flex space-x-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManagePreferences(false)}
                  className="flex-1 text-xs h-9 border-white text-white hover:bg-white hover:text-[#214498] font-['DM_Sans'] font-medium"
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleManagePreferences}
                  className="flex-1 text-xs h-9 bg-white text-[#214498] hover:bg-gray-100 transition-colors font-['DM_Sans'] font-medium"
                >
                  Save Preferences
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
      <div className="absolute bottom-4 right-4 w-[calc(100vw-2rem)] sm:w-96 md:w-[450px]">
        <Card className={`shadow-xl border-0 bg-[#214498] transform transition-all duration-300 ease-out ${
          isVisible 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-4 opacity-0 scale-95'
        }`} style={{ borderRadius: '10px' }}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg 
                    className="w-4 h-4 text-[#214498]" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-2 font-['DM_Sans']">
                  Cookie Consent
                </h3>
                <p className="text-xs text-blue-100 leading-relaxed font-['DM_Sans'] mb-2">
                  We use cookies to analyze website usage to improve your experience. You can manage your cookie preferences below.
                </p>
                <p className="text-xs text-blue-100 font-['DM_Sans']">
                  Read our{' '}
                  <a 
                    href="https://drinfo.ai/privacy-policy/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-white transition-colors"
                  >
                    privacy policy
                  </a>
                  {' '}and{' '}
                  <a 
                    href="https://drinfo.ai/cookie-policy/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-white transition-colors"
                  >
                    cookie policy
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <div className="flex space-x-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onMouseEnter={() => setHoveredButton('necessary')}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => handleConsent('necessary')}
                className="flex-1 text-xs h-9 border-white text-white hover:bg-white hover:text-[#214498] font-['DM_Sans'] font-medium"
              >
                Necessary Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onMouseEnter={() => setHoveredButton('manage')}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => setShowManagePreferences(true)}
                className="flex-1 text-xs h-9 border-white text-white hover:bg-white hover:text-[#214498] font-['DM_Sans'] font-medium"
              >
                Manage Preferences
              </Button>
              <Button
                size="sm"
                onMouseEnter={() => setHoveredButton('accept')}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => handleConsent('all')}
                className={`flex-1 text-xs h-9 font-['DM_Sans'] font-medium transition-all duration-200 ${
                  hoveredButton && hoveredButton !== 'accept'
                    ? 'border border-white text-white bg-transparent hover:bg-white hover:text-[#214498]'
                    : 'bg-white text-[#214498] hover:bg-gray-100'
                }`}
              >
                Accept All
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
