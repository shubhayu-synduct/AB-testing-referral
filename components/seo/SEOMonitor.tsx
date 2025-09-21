'use client'

import { useEffect } from 'react'

export default function SEOMonitor() {
  useEffect(() => {
    // Monitor SEO metrics
    const monitorSEO = () => {
      // Check for missing alt tags
      const images = document.querySelectorAll('img')
      const imagesWithoutAlt = Array.from(images).filter(img => !img.alt)
      if (imagesWithoutAlt.length > 0) {
        console.warn(`Found ${imagesWithoutAlt.length} images without alt text`)
      }

      // Check for missing heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const h1Count = document.querySelectorAll('h1').length
      if (h1Count === 0) {
        console.warn('No H1 tag found on page')
      } else if (h1Count > 1) {
        console.warn(`Found ${h1Count} H1 tags, should only have one`)
      }

      // Check for internal links
      const internalLinks = document.querySelectorAll('a[href^="/"], a[href^="https://app.drinfo.ai"]')
      console.log(`Found ${internalLinks.length} internal links`)

      // Check for external links
      const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="app.drinfo.ai"])')
      externalLinks.forEach(link => {
        if (!link.hasAttribute('rel')) {
          link.setAttribute('rel', 'noopener noreferrer')
        }
      })

      // Monitor page load performance
      if ('performance' in window) {
        window.addEventListener('load', () => {
          const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (perfData) {
            console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart)
            console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart)
            console.log('First Paint:', performance.getEntriesByName('first-paint')[0]?.startTime)
            console.log('First Contentful Paint:', performance.getEntriesByName('first-contentful-paint')[0]?.startTime)
          }
        })
      }
    }

    // Monitor Core Web Vitals
    const monitorCoreWebVitals = () => {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log('LCP:', lastEntry.startTime)
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay (FID)
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming
          console.log('FID:', fidEntry.processingStart - fidEntry.startTime)
        }
      }).observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
            console.log('CLS:', clsValue)
          }
        }
      }).observe({ entryTypes: ['layout-shift'] })
    }

    // Initialize monitoring
    monitorSEO()
    monitorCoreWebVitals()

    // Monitor scroll depth for engagement
    let maxScrollDepth = 0
    const trackScrollDepth = () => {
      const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth
        console.log('Max Scroll Depth:', maxScrollDepth + '%')
      }
    }

    window.addEventListener('scroll', trackScrollDepth)

    // Cleanup
    return () => {
      window.removeEventListener('scroll', trackScrollDepth)
    }
  }, [])

  return null
}
