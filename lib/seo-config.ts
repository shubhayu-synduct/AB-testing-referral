// SEO Configuration for Dr.Info
export const seoConfig = {
  // Site Information
  siteName: 'Dr.Info',
  siteUrl: 'https://app.drinfo.ai',
  siteDescription: 'Fastest AI Assistant for Medical Decision Support with verified references and evidence-based medical information',
  
  // Default Meta Tags
  defaultTitle: 'DR.INFO - AI Assistant for Doctors | Medical AI Clinical Decision Support',
  defaultDescription: 'Dr.Info.ai - Fastest AI Assistant for Medical Decision Support. AI-powered clinical assistant for doctors with verified references.',
  
  // Social Media
  social: {
    twitter: '@drinfo_ai',
    facebook: 'https://facebook.com/drinfo.ai',
    linkedin: 'https://linkedin.com/company/drinfo',
    instagram: 'https://instagram.com/drinfo.ai',
  },
  
  // Images
  images: {
    defaultOgImage: '/og-image.png',
    defaultTwitterImage: '/twitter-image.png',
    favicon: '/favicon.png',
    appleTouchIcon: '/apple-touch-icon.png',
  },
  
  // Keywords by Category
  keywords: {
    primary: [
      'AI assistant for doctors',
      'medical AI',
      'clinical decision support',
      'drug interactions',
      'medical guidelines',
      'evidence-based medicine',
      'healthcare AI',
      'medical AI tools',
      'clinical AI assistant',
      'medical research AI'
    ],
    secondary: [
      'UpToDate alternative',
      'PubMed alternative',
      'ChatGPT for doctors',
      'medical AI platform',
      'clinical guidelines AI',
      'drug safety AI',
      'medical literature search',
      'clinical protocols AI',
      'medical AI software',
      'healthcare technology'
    ],
    longTail: [
      'AI assistant for drug safety',
      'AI for clinical practice',
      'medical AI for hospitals',
      'AI powered clinical support',
      'evidence-based AI assistant',
      'medical AI decision support',
      'clinical AI recommendations',
      'medical AI analysis',
      'healthcare AI platform',
      'medical AI research tools'
    ]
  },
  
  // Page-Specific SEO
  pages: {
    dashboard: {
      title: 'Dashboard - Medical AI Assistant',
      description: 'Access your Dr.Info AI medical assistant dashboard for instant clinical decision support and evidence-based medical information.',
      keywords: ['medical AI dashboard', 'clinical decision support dashboard', 'doctor AI assistant']
    },
    drugInfo: {
      title: 'Drug Information - AI Drug Safety Assistant',
      description: 'Comprehensive drug information database with AI-powered drug safety checks, interactions, and clinical guidelines.',
      keywords: ['drug information AI', 'drug safety AI', 'drug interaction checker', 'medication safety AI']
    },
    guidelines: {
      title: 'Clinical Guidelines - AI Guidelines Assistant',
      description: 'Access comprehensive clinical guidelines with AI-powered search and analysis for evidence-based treatment protocols.',
      keywords: ['clinical guidelines AI', 'medical guidelines AI', 'treatment guidelines AI', 'clinical protocols AI']
    },
    aiResults: {
      title: 'AI Medical Results - Clinical AI Analysis',
      description: 'Get instant AI-powered medical analysis and clinical decision support with evidence-based insights.',
      keywords: ['AI medical results', 'clinical AI analysis', 'medical AI insights', 'AI medical diagnosis support']
    }
  },
  
  // Technical SEO
  technical: {
    robots: {
      index: true,
      follow: true,
      maxImagePreview: 'large',
      maxSnippet: -1,
      maxVideoPreview: -1
    },
    canonical: true,
    hreflang: false,
    sitemap: true,
    structuredData: true
  },
  
  // Performance
  performance: {
    preloadCriticalResources: true,
    optimizeImages: true,
    lazyLoadImages: true,
    minifyCSS: true,
    minifyJS: true,
    enableGzip: true
  },
  
  // Analytics
  analytics: {
    googleAnalytics: true,
    googleSearchConsole: true,
    bingWebmaster: true,
    yandexWebmaster: true
  }
}

// Helper functions for SEO
export const generatePageTitle = (pageTitle?: string): string => {
  return pageTitle 
    ? `${pageTitle} | ${seoConfig.siteName} - Medical AI Assistant`
    : seoConfig.defaultTitle
}

export const generatePageDescription = (pageDescription?: string): string => {
  return pageDescription || seoConfig.defaultDescription
}

export const generateKeywords = (pageKeywords: string[] = []): string[] => {
  return [...seoConfig.keywords.primary, ...pageKeywords]
}

export const generateStructuredData = (type: 'WebSite' | 'SoftwareApplication' | 'Organization', data: any) => {
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
    description: seoConfig.siteDescription,
    ...data
  }
  
  return baseStructuredData
}
