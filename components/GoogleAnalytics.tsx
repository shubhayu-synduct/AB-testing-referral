'use client'

import Script from 'next/script'
import { GA_TRACKING_ID } from '@/lib/gtag'

export default function GoogleAnalytics() {
  // Don't render GA script if tracking ID is not provided
  if (!GA_TRACKING_ID || GA_TRACKING_ID === 'G-XXXXXXXXXX') {
    return null
  }

  const isDebugMode = process.env.NEXT_PUBLIC_GA_DEBUG === 'true'

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_title: document.title,
              page_location: window.location.href,
              ${isDebugMode ? 'debug_mode: true,' : ''}
              ${isDebugMode ? 'send_page_view: true,' : ''}
            });
            ${isDebugMode ? 'console.log("Google Analytics Debug Mode Enabled");' : ''}
          `,
        }}
      />
    </>
  )
}
