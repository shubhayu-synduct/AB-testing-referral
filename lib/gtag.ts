// Google Analytics 4 utility functions
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX'

// Define the gtag function
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId?: string | Date,
      config?: Record<string, any>
    ) => void
    dataLayer: any[]
  }
}

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window === 'undefined') return

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || []
  
  // Define gtag function
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }

  // Initialize GA4
  window.gtag('js', new Date())
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
    debug_mode: process.env.NODE_ENV === 'development', // Enable debug mode in development
  })
}

// Track page views
export const trackPageView = (url: string, title?: string) => {
  if (typeof window === 'undefined') return

  window.gtag('config', GA_TRACKING_ID, {
    page_title: title || document.title,
    page_location: url,
  })
}

// Track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number,
  customParameters?: Record<string, any>
) => {
  if (typeof window === 'undefined') return

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...customParameters,
  })
}

// Track GA4 recommended events
export const trackGA4Event = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window === 'undefined') return

  window.gtag('event', eventName, {
    ...parameters,
  })
}

// Track e-commerce events
export const trackPurchase = (transactionId: string, value: number, currency: string = 'USD', items?: any[]) => {
  if (typeof window === 'undefined') return

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items,
  })
}

// Track user engagement events
export const trackEngagement = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window === 'undefined') return

  window.gtag('event', eventName, {
    ...parameters,
  })
}

// Track search events
export const trackSearch = (searchTerm: string, resultsCount?: number) => {
  if (typeof window === 'undefined') return

  window.gtag('event', 'search', {
    search_term: searchTerm,
    results_count: resultsCount,
  })
}

// Track login events
export const trackLogin = (method: string) => {
  if (typeof window === 'undefined') return

  window.gtag('event', 'login', {
    method: method,
  })
}

// Track signup events
export const trackSignUp = (method: string) => {
  if (typeof window === 'undefined') return

  window.gtag('event', 'sign_up', {
    method: method,
  })
}

// Track custom conversions
export const trackConversion = (conversionId: string, value?: number, currency?: string) => {
  if (typeof window === 'undefined') return

  window.gtag('event', 'conversion', {
    send_to: conversionId,
    value: value,
    currency: currency,
  })
}

// ===== USER-ID TRACKING =====
// Set User-ID for cross-session tracking (GDPR compliant - uses pseudonymous Firebase UID)
export const setUserId = (userId: string) => {
  if (typeof window === 'undefined') return

  // Set User-ID in GA4 configuration
  window.gtag('config', GA_TRACKING_ID, {
    user_id: userId,
  })

  // Also set as a custom parameter for additional flexibility
  window.gtag('set', 'user_properties', {
    user_id: userId,
  })

  console.log('[GA4] User-ID set:', userId)
}

// Clear User-ID on logout (privacy best practice)
export const clearUserId = () => {
  if (typeof window === 'undefined') return

  // Clear User-ID by setting it to undefined
  window.gtag('config', GA_TRACKING_ID, {
    user_id: undefined,
  })

  // Clear user properties
  window.gtag('set', 'user_properties', {
    user_id: undefined,
  })

  console.log('[GA4] User-ID cleared')
}

// Set custom user properties for segmentation
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window === 'undefined') return

  // Filter out null/undefined values
  const cleanedProperties = Object.entries(properties).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  // Set user properties in GA4
  window.gtag('set', 'user_properties', cleanedProperties)

  console.log('[GA4] User properties set:', cleanedProperties)
}

// Helper to set all user data at once (User-ID + Properties)
export const setUserData = (userId: string, properties?: Record<string, any>) => {
  if (typeof window === 'undefined') return

  // Set User-ID
  setUserId(userId)

  // Set additional properties if provided
  if (properties && Object.keys(properties).length > 0) {
    setUserProperties(properties)
  }
}

// Clear all user data (User-ID + Properties)
export const clearUserData = () => {
  if (typeof window === 'undefined') return

  clearUserId()

  // Clear all user properties by setting them to undefined
  window.gtag('set', 'user_properties', {
    is_medical_professional: undefined,
    specialty: undefined,
    subscription_status: undefined,
    subscription_tier: undefined,
    onboarding_completed: undefined,
    account_age_days: undefined,
    country: undefined,
  })

  console.log('[GA4] All user data cleared')
}
