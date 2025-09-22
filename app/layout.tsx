import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/providers/auth-provider"
import { Analytics } from "@vercel/analytics/next"
import { TourProvider, GuidelineTourProvider, DrugTourProvider, DrinfoSummaryTourProvider } from "@/components/TourContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import PerformanceOptimizer from "@/components/seo/PerformanceOptimizer";
import SEOMonitor from "@/components/seo/SEOMonitor";

const inter = Inter({ subsets: ["latin"] })
const poppins = Poppins({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-poppins'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://app.drinfo.ai'),
  title: {
    default: "DR. INFO - AI Assistant for Doctors",
    template: "%s | DR. INFO - Medical AI Assistant"
  },
  description: "Dr.Info.ai - Fastest AI Assistant for Medical Decision Support. AI-powered clinical assistant for doctors with verified references. Evidence-based medical AI tool for hospitals, clinical practice, and medical professionals. Alternative to UpToDate with real-time drug interactions and clinical guidelines.",
  abstract: "Dr.Info is the fastest AI assistant for medical decision support, providing evidence-based clinical guidance, drug interactions, and medical guidelines for healthcare professionals worldwide.",
  category: "Healthcare Technology",
  classification: "Medical AI Software",
  keywords: [
    "AI assistant for doctors",
    "AI assistant for drug safety",
    "AI assistant for hospital rounds",
    "AI clinical assistant reviews",
    "AI clinical decision support tool",
    "AI clinical knowledge retrieval",
    "AI drug to drug interaction",
    "AI for Doctor",
    "AI for Doctors",
    "AI for cardiovascular risk management",
    "AI for clinical practice",
    "AI for diabetes guideline lookup",
    "AI for endocrine practice",
    "AI for evidence-based medicine",
    "AI for general practitioners",
    "AI for guidelines",
    "AI for hospitals",
    "AI for internal medicine",
    "AI for medical professionals",
    "AI for medical research",
    "AI for physician",
    "AI for scientific paper interpretation",
    "AI for summarizing drug to drug interaction",
    "AI for summarizing treatment guidelines",
    "AI google scholar",
    "AI in clinical practice",
    "AI medical information assistant",
    "AI medical literature search",
    "AI platform for hospital systems",
    "AI powered clinical support platform",
    "AI powered literature review",
    "AI search engine for doctors",
    "AI summarizing guidelines",
    "AI summarizing treatment guidelines",
    "AI that answers clinical questions",
    "AI to analyze scientific papers",
    "AI to read clinical trials",
    "AI to summarize clinical studies",
    "AI tool during patient consultation",
    "AI tool for diabetes guideline lookup",
    "AI tool for treatment optimization",
    "AI tool for understanding medical research",
    "AI tools for physicians",
    "AI vs UpToDate",
    "AI with verified references",
    "AI-powered clinical recommendation engine",
    "AI-powered medical summary generator",
    "Best AI assistant for finding clinical guidelines",
    "Best medical AI for cardiology",
    "Can AI replace UpToDate for doctors?",
    "ChatGPT vs DR.Info for medical use",
    "Clinical Guidelines",
    "Clinical protocol assistant AI",
    "Clinical query AI engine",
    "Compare AI tools for doctors",
    "Compare anticoagulants with AI",
    "Compare Dr.Info vs UpToDate",
    "Download AI app for doctors",
    "Dr.Info assistant for doctors",
    "Dr.Info helps doctors find reliable clinical answers instantly with verified sources",
    "AI built for healthcare professionals",
    "Dr.Info saves doctors time",
    "Dr.Info vs UpToDate",
    "Dr.Info.ai",
    "Dr.Info.ai Fastest AI Assistant for Medical Decision Support",
    "Dr.Info.ai login",
    "Drug to drug interaction",
    "Evidence-based AI assistant",
    "Explore how Dr.Info.ai saves doctors time",
    "Faster alternative to PubMed",
    "How AI is changing evidence-based medicine forever",
    "How does medical AI work",
    "How to use AI in medical decision making",
    "Instant clinical AI Q&A",
    "Instant clinical Q&A",
    "Is ChatGPT safe for doctors?",
    "Is there a ChatGPT for doctors?",
    "Medical AI Search & AI Research engine",
    "Medical AI assistant",
    "Medical AI tools Europe 2025",
    "Medical AI tool for cardiology practice",
    "Medical AI tools Portugal",
    "Medical AI tools for clinical use",
    "Medical information assistant",
    "Medical student AI study tool",
    "Medical student clinical assistant",
    "Medical students and AI: Study faster, learn deeper",
    "Medscape vs AI assistant",
    "Ongoing result of Dr.Info in medical score vs competitor",
    "PubMed is too slow, faster AI tools",
    "Real-time clinical search engine",
    "Real-time drug interaction checker with AI",
    "Search ESC guidelines with AI",
    "See Dr.Info in action",
    "Smart AI medical summary generator",
    "Smart search for medical data",
    "Start using Dr.Info today",
    "Start using medical AI assistant",
    "Summarize clinical studies",
    "Summarizing drug to drug interaction",
    "Summarizing guidelines",
    "Summarizing treatment guidelines",
    "Top 5 use cases of AI in clinical practice",
    "Top-rated medical AI tools",
    "Trusted medical AI platform",
    "UpToDate alternatives for doctors",
    "Voice-based AI assistants for hospital workflow",
    "Voice-enabled AI for medical practice",
    "What doctors are using in 2025",
    "What is AI for doctors",
    "What is the fastest way to search medical evidence?",
    "What's the best AI tool for clinical practice?",
    "AI PubMed",
    "Clinical Guidelines",
    "Evidence-based medicine",
    "Medical AI platform",
    "Clinical decision support",
    "Medical literature search",
    "Drug interaction checker",
    "Clinical guidelines AI",
    "Medical research AI",
    "Healthcare AI tools"
  ],
  authors: [{ name: "Dr.Info Team" }],
  creator: "Dr.Info",
  publisher: "Dr.Info",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://app.drinfo.ai',
    title: 'DR. INFO - AI Assistant for Doctors',
    description: 'Dr.Info.ai - Fastest AI Assistant for Medical Decision Support. AI-powered clinical assistant for doctors with verified references and evidence-based medical information.',
    siteName: 'Dr.Info',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dr.Info - AI Assistant for Doctors',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DR.INFO - AI Assistant for Doctors',
    description: 'Fastest AI Assistant for Medical Decision Support with verified references',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://app.drinfo.ai',
    languages: {
      'en-US': 'https://app.drinfo.ai',
      'en-GB': 'https://app.drinfo.ai',
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  other: {
    'msapplication-TileColor': '#3771FE',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#3771FE',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Dr.Info',
    'application-name': 'Dr.Info',
    'msapplication-tooltip': 'Dr.Info - AI Assistant for Doctors',
    'msapplication-starturl': '/',
    'msapplication-navbutton-color': '#3771FE',
    'msapplication-TileImage': '/favicon.png',
    'format-detection': 'telephone=no',
    'mobile-web-app-capable': 'yes',
    'apple-touch-fullscreen': 'yes',
  },
  generator: 'v0.dev',
  icons: {
    icon: [
      {
        url: '/favicon.png',
        type: 'image/png',
      }
    ],
    apple: [
      {
        url: '/favicon.png',
        type: 'image/png',
      }
    ],
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        
        {/* Performance and SEO Meta Tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Dr.Info" />
        <meta name="application-name" content="Dr.Info" />
        <meta name="msapplication-TileColor" content="#3771FE" />
        <meta name="msapplication-TileImage" content="/favicon.png" />
        <meta name="theme-color" content="#3771FE" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="bingbot" content="index, follow" />
        <meta name="slurp" content="index, follow" />
        <meta name="duckduckbot" content="index, follow" />
        
        {/* Language and Geographic Meta Tags */}
        <meta name="language" content="English" />
        <meta name="geo.region" content="US" />
        <meta name="geo.placename" content="United States" />
        <meta name="geo.position" content="39.50;-98.35" />
        <meta name="ICBM" content="39.50, -98.35" />
        
        {/* Content Type and Character Set */}
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* Cache Control */}
        <meta httpEquiv="Cache-Control" content="public, max-age=31536000" />
        
        {/* Security Headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        
        {/* DNS Prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Dr.Info - AI Assistant for Doctors",
              "description": "Fastest AI Assistant for Medical Decision Support with verified references and evidence-based medical information",
              "url": "https://app.drinfo.ai",
              "applicationCategory": "HealthApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "Dr.Info Team"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Dr.Info"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150"
              },
              "keywords": "AI assistant for doctors, medical AI, clinical decision support, drug interactions, medical guidelines, evidence-based medicine",
              "audience": {
                "@type": "Audience",
                "audienceType": "Healthcare Professionals, Doctors, Medical Students, Clinicians"
              }
            })
          }}
        />
      </head>
      <body className={`${inter.className} ${poppins.variable} font-['DM_Sans']`}>
        <DrinfoSummaryTourProvider>
          <DrugTourProvider>
            <GuidelineTourProvider>
              <TourProvider>
                <AuthProvider>
                  <PerformanceOptimizer />
                  <SEOMonitor />
                  {children}
                </AuthProvider>
              </TourProvider>
            </GuidelineTourProvider>
          </DrugTourProvider>
        </DrinfoSummaryTourProvider>
        <Analytics />
      </body>
    </html>
  )
}
