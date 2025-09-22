'use client'

import { useEffect } from 'react'

export default function PerformanceOptimizer() {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload critical CSS
      const criticalCSS = document.createElement('link')
      criticalCSS.rel = 'preload'
      criticalCSS.href = '/styles/critical.css'
      criticalCSS.as = 'style'
      document.head.appendChild(criticalCSS)
      
      // Preload critical fonts
      const criticalFont = document.createElement('link')
      criticalFont.rel = 'preload'
      criticalFont.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
      criticalFont.as = 'style'
      document.head.appendChild(criticalFont)
    }

    // Optimize images
    const optimizeImages = () => {
      const images = document.querySelectorAll('img')
      images.forEach(img => {
        // Add loading="lazy" for images below the fold
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy')
        }
        
        // Add decoding="async" for better performance
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'async')
        }
      })
    }

    // Add performance monitoring
    const monitorPerformance = () => {
      if ('performance' in window) {
        // Monitor Core Web Vitals
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              console.log('LCP:', entry.startTime)
            }
            if (entry.entryType === 'first-input') {
              const fidEntry = entry as PerformanceEventTiming
              console.log('FID:', fidEntry.processingStart - fidEntry.startTime)
            }
            if (entry.entryType === 'layout-shift') {
              console.log('CLS:', entry.value)
            }
          }
        })
        
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
      }
    }

    // Initialize optimizations
    preloadCriticalResources()
    optimizeImages()
    monitorPerformance()

    // Cleanup
    return () => {
      // Cleanup if needed
    }
  }, [])

  return null
}

// SEO-friendly image component
export function SEOImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  ...props
}: {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
  [key: string]: any
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      {...props}
    />
  )
}
