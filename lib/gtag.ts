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
