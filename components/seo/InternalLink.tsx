import Link from 'next/link'
import { ReactNode } from 'react'

interface InternalLinkProps {
  href: string
  children: ReactNode
  className?: string
  title?: string
  'aria-label'?: string
  prefetch?: boolean
}

export default function InternalLink({
  href,
  children,
  className = '',
  title,
  'aria-label': ariaLabel,
  prefetch = true
}: InternalLinkProps) {
  return (
    <Link
      href={href}
      className={`text-blue-600 hover:text-blue-800 hover:underline transition-colors ${className}`}
      title={title}
      aria-label={ariaLabel}
      prefetch={prefetch}
    >
      {children}
    </Link>
  )
}

// SEO-optimized internal links for medical content
export const MedicalInternalLinks = {
  // Main navigation links
  Dashboard: () => <InternalLink href="/dashboard" title="Access your medical AI dashboard">Dashboard</InternalLink>,
  DrugInfo: () => <InternalLink href="/drug-information" title="Drug safety and interaction database">Drug Information</InternalLink>,
  Guidelines: () => <InternalLink href="/guidelines" title="Clinical guidelines and protocols">Clinical Guidelines</InternalLink>,
  AIResults: () => <InternalLink href="/ai-results" title="AI-powered medical analysis results">AI Results</InternalLink>,
  
  // Feature-specific links
  DrugInteractions: () => <InternalLink href="/drug-information" title="Check drug interactions with AI">Drug Interaction Checker</InternalLink>,
  ClinicalDecision: () => <InternalLink href="/dashboard" title="AI clinical decision support">Clinical Decision Support</InternalLink>,
  EvidenceBased: () => <InternalLink href="/guidelines" title="Evidence-based medical guidelines">Evidence-Based Medicine</InternalLink>,
  MedicalAI: () => <InternalLink href="/dashboard" title="AI assistant for medical professionals">Medical AI Assistant</InternalLink>,
  
  // Comparison links
  UpToDateAlternative: () => <InternalLink href="/dashboard" title="Dr.Info vs UpToDate comparison">UpToDate Alternative</InternalLink>,
  PubMedAlternative: () => <InternalLink href="/dashboard" title="Faster alternative to PubMed">PubMed Alternative</InternalLink>,
  ChatGPTForDoctors: () => <InternalLink href="/dashboard" title="AI assistant specifically for doctors">ChatGPT for Doctors</InternalLink>,
}
