import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView, trackEvent, trackEngagement } from '@/lib/gtag'

// Custom hook for Google Analytics tracking
export const useGA = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track page views on route changes
  useEffect(() => {
    if (pathname) {
      const url = `${pathname}${searchParams ? `?${searchParams.toString()}` : ''}`
      trackPageView(url)
    }
  }, [pathname, searchParams])

  // Helper functions for tracking events
  const trackCustomEvent = (
    eventName: string,
    parameters?: Record<string, any>
  ) => {
    trackEngagement(eventName, parameters)
  }

  const trackUserAction = (
    action: string,
    category: string,
    label?: string,
    value?: number,
    customParameters?: Record<string, any>
  ) => {
    trackEvent(action, category, label, value, customParameters)
  }

  const trackSearchQuery = (query: string, resultsCount?: number) => {
    trackEngagement('search', {
      search_term: query,
      results_count: resultsCount,
    })
  }

  const trackAuthEvent = (eventType: 'login' | 'signup', method: string) => {
    trackEngagement(eventType, { method })
  }

  const trackPageInteraction = (interaction: string, page: string, details?: Record<string, any>) => {
    trackEngagement('page_interaction', {
      interaction_type: interaction,
      page: page,
      ...details,
    })
  }

  return {
    trackCustomEvent,
    trackUserAction,
    trackSearchQuery,
    trackAuthEvent,
    trackPageInteraction,
  }
}
