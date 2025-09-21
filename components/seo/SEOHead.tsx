import Head from 'next/head'

interface SEOHeadProps {
  title?: string
  description?: string
  keywords?: string[]
  canonical?: string
  ogImage?: string
  noindex?: boolean
  structuredData?: object
}

export default function SEOHead({
  title,
  description,
  keywords = [],
  canonical,
  ogImage = '/og-image.png',
  noindex = false,
  structuredData
}: SEOHeadProps) {
  const baseUrl = 'https://app.drinfo.ai'
  const fullTitle = title ? `${title} | Dr.Info - Medical AI Assistant` : 'Dr.Info - AI Assistant for Doctors'
  const fullDescription = description || 'Fastest AI Assistant for Medical Decision Support with verified references and evidence-based medical information'
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : baseUrl

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={`${baseUrl}${ogImage}`} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Dr.Info" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={`${baseUrl}${ogImage}`} />
      
      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
      )}
    </Head>
  )
}
