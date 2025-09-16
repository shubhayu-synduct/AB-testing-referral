'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, ExternalLink, Copy, CheckCircle, X, Check, ThumbsUp, ThumbsDown, Mail, Share2, RotateCcw, Download, ChevronDown, ChevronUp, User, Bot, Plus, Loader2, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-auth';
import { fetchDrugSummary, sendDrugFollowUpQuestion, DrugSummaryData } from '@/lib/drug-summary-service';
import AnswerFeedback from '@/components/feedback/answer-feedback';
import { ReferencesSidebar } from "@/components/references/ReferencesSidebar";
import { ReferenceGrid } from "@/components/references/ReferenceGrid";
import { DrugInformationModal } from "@/components/references/DrugInformationModal";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { cn } from "@/lib/utils";
import { MovingBorder } from "@/components/ui/moving-border";
import { firestoreDB as db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { marked } from 'marked';
import { formatWithCitations, formatWithDummyCitations } from '@/lib/formatWithCitations';

interface Citation {
  id: string;
  text: string;
  source: string;
  url?: string;
  title?: string;
  description?: string;
  type?: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  threadId?: string;
  citations?: Citation[];
  sources?: Citation[];
  isStreaming?: boolean;
  svgContent?: string;
  hasImages?: boolean;
  feedback?: {
    rating: 'positive' | 'negative';
    comment?: string;
  };
}

interface ShareData {
  sessionId: string;
  threadId: string;
  query: string;
  response: string;
  citations: Citation[];
  timestamp: Date;
}

interface ImageGenerationStatus {
  isGenerating: boolean;
  hasImages: boolean;
  imageCount: number;
}

interface AIResult {
  content: string;
  citations: { [key: string]: string };
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  status: 'streaming' | 'complete' | 'error';
}

function AIResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const query = searchParams.get('q') || '';
  const sessionId = searchParams.get('sessionId') || '';
  
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  
  // UI state
  const [followUpQuestion, setFollowUpQuestion] = useState('');

  const [loading, setLoading] = useState(false);
  const [showCitationsSidebar, setShowCitationsSidebar] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showFeedbackReminder, setShowFeedbackReminder] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  
  // Image generation state
  const [imageGenerationStatus, setImageGenerationStatus] = useState<ImageGenerationStatus>({
    isGenerating: false,
    hasImages: false,
    imageCount: 0
  });
  const [activeTab, setActiveTab] = useState<'summary' | 'images'>('summary');
  
  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const citationRefs = useRef<{ [key: string]: HTMLElement }>({});
  const drugNameRefs = useRef<{ [key: string]: HTMLElement }>({});
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Session and user data
  const [sessionData, setSessionData] = useState<any>(null);
  const [userCountry, setUserCountry] = useState<string>('US');

  // Load chat session on mount
  useEffect(() => {
    if (sessionId && user) {
      loadChatSession();
    } else if (query) {
      // Create new session for direct query
      const newSessionId = uuidv4();
      router.replace(`/ai-results?q=${encodeURIComponent(query)}&sessionId=${newSessionId}`);
    }
  }, [sessionId, user, query]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Add citation tooltip functionality
  useEffect(() => {
    const createCitationTooltip = (citationElement: HTMLElement) => {
      const number = citationElement.getAttribute('data-citation-number');
      const title = citationElement.getAttribute('data-citation-title');
      const authors = citationElement.getAttribute('data-citation-authors');
      const year = citationElement.getAttribute('data-citation-year');
      const source = citationElement.getAttribute('data-citation-source');
      const url = citationElement.getAttribute('data-citation-url');
      
      const tooltip = document.createElement('div');
      tooltip.className = 'citation-tooltip';
      
      const titleElement = url && url !== '#' 
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="citation-tooltip-title">${title}</a>`
        : `<div class="citation-tooltip-title">${title}</div>`;
      
      tooltip.innerHTML = `
        ${titleElement}
        ${authors ? `<div class="citation-tooltip-meta">${authors} ${year}</div>` : ''}
        <div class="citation-tooltip-source">Source: ${source}</div>
      `;
      
      citationElement.appendChild(tooltip);
      
      const updateTooltipPosition = (e: MouseEvent) => {
        const rect = citationElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 8;
        
        // Adjust if tooltip goes off screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
          left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
          top = rect.bottom + 8;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      };
      
      citationElement.addEventListener('mouseenter', updateTooltipPosition);
      citationElement.addEventListener('mousemove', updateTooltipPosition);
    };
    
    // Initialize tooltips for all citation references
    const citationElements = document.querySelectorAll('.citation-reference');
    citationElements.forEach((element) => {
      if (!element.querySelector('.citation-tooltip')) {
        createCitationTooltip(element as HTMLElement);
      }
    });
  }, [messages, streamedContent]);

  // Handle clicks outside citations sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCitationsSidebar && !target.closest('.citations-sidebar') && !target.closest('.citation-link')) {
        setShowCitationsSidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCitationsSidebar]);

  // Fetch user country
  useEffect(() => {
    const fetchUserCountry = async () => {
      try {
        const response = await fetch('/api/user-country');
        if (response.ok) {
          const data = await response.json();
          setUserCountry(data.country || 'US');
        }
      } catch (error) {
        console.error('Failed to fetch user country:', error);
      }
    };

    fetchUserCountry();
  }, []);

  // Auto-switch to images tab when images are available
  useEffect(() => {
    if (imageGenerationStatus.hasImages && imageGenerationStatus.imageCount > 0) {
      setActiveTab('images');
    }
  }, [imageGenerationStatus.hasImages, imageGenerationStatus.imageCount]);

  // Load chat session from Firebase
  const loadChatSession = async () => {
    if (!sessionId || !user) return;

    try {
      setIsLoading(true);
      const sessionRef = doc(db, 'chatSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        setSessionData(data);
        
        if (data.messages && Array.isArray(data.messages)) {
          const loadedMessages = data.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp?.toDate() || new Date()
          }));
          setMessages(loadedMessages);
        }
      } else if (query) {
        // Start new search if no session exists
        await handleSearch(query);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
      setError('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  };

  // Save chat session to Firebase
  const saveChatSession = async (updatedMessages: Message[]) => {
    if (!sessionId || !user) return;

    try {
      const sessionRef = doc(db, 'chatSessions', sessionId);
      const sessionData = {
        userId: user.uid,
        messages: updatedMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp
        })),
        lastUpdated: serverTimestamp(),
        query: query
      };

      await setDoc(sessionRef, sessionData, { merge: true });
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  };

  // Handle search
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const userMessage: Message = {
      id: uuidv4(),
      type: 'user',
      content: searchQuery,
      timestamp: new Date()
    };

    const assistantMessage: Message = {
      id: uuidv4(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    const newMessages = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);
    setIsStreaming(true);
    setStreamedContent('');
    setError(null);

    try {
      await handleSearchWithContent(searchQuery, assistantMessage.id, newMessages);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to get AI response. Please try again.');
      setIsStreaming(false);
    }
  };

  // Handle follow-up questions
  const handleFollowUpQuestion = async () => {
    if (!followUpQuestion.trim() || !currentThreadId) return;
    
    const question = followUpQuestion;
    setFollowUpQuestion('');
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    
    // Add assistant message placeholder
    const assistantMessage: Message = {
      id: uuidv4(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    
    const newMessages = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);
    setIsStreaming(true);
    setStreamedContent('');
    
    let accumulatedContent = '';
    
    try {
      await sendDrugFollowUpQuestion(
        question,
        currentThreadId,
        // onChunk callback
        (chunk: string) => {
          accumulatedContent += chunk;
          setStreamedContent(accumulatedContent);
        },
        // onStatus callback
        (status: string, message?: string) => {
          logger.info(`Follow-up question status: ${status} - ${message || ''}`);
        },
        // onComplete callback
        (data: DrugSummaryData) => {
          // Update the assistant message with final content and citations
          const updatedMessages = newMessages.map(msg => 
            msg.id === assistantMessage.id ? {
              ...msg,
              content: data.processed_content || accumulatedContent,
              citations: (data.citations as any) || {},
              sources: [],
              threadId: currentThreadId,
              isStreaming: false
            } : msg
          );
          
          setMessages(updatedMessages);
          setStreamedContent('');
          setIsStreaming(false);
          
          // Save to Firebase
          saveChatSession(updatedMessages).catch(error => {
            logger.error('Failed to save chat session:', error);
          });
        }
      );
    } catch (error: any) {
      logger.error('Follow-up question error:', error);
      
      // Update message with error
      const updatedMessages = newMessages.map(msg => 
        msg.id === assistantMessage.id ? {
          ...msg,
          content: 'Sorry, I encountered an error while processing your follow-up question. Please try again.',
          isStreaming: false
        } : msg
      );
      
      setMessages(updatedMessages);
      setError('Failed to process follow-up question. Please try again.');
      setIsStreaming(false);
    }
  };

  // Parse streamed content into structured format
  const parseContent = (content: string) => {
    const lines = content.split('\n');
    let mainSummary = '';
    let sections: { title: string; content: string }[] = [];
    let currentSection: { title: string; content: string } | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line is a section header (starts with ##)
      if (trimmedLine.startsWith('## ')) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: trimmedLine.substring(3).trim(),
          content: ''
        };
      } else if (currentSection) {
        // Add to current section
        currentSection.content += line + '\n';
      } else {
        // Add to main summary
        mainSummary += line + '\n';
      }
    }
    
    // Add final section if exists
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return {
      mainSummary: mainSummary.trim(),
      sections: sections.map(section => ({
        ...section,
        content: section.content.trim()
      }))
    };
  };



  // Handle showing all citations
  const handleShowAllCitations = (citations: Citation[]) => {
    setShowCitationsSidebar(true);
  };

  // Main search function with content streaming using drug summary service
  const handleSearchWithContent = async (searchQuery: string, messageId: string, currentMessages: Message[]) => {
    setIsStreaming(true);
    setStreamedContent('');
    setCurrentThreadId(null);
    
    let accumulatedContent = '';
    let sessionId: string | null = null;
    
    try {
      await fetchDrugSummary(
        searchQuery,
        // onChunk callback
        (chunk: string) => {
          accumulatedContent += chunk;
          setStreamedContent(accumulatedContent);
        },
        // onStatus callback
        (status: string, message?: string) => {
          logger.info(`Drug summary status: ${status} - ${message || ''}`);
        },
        // onComplete callback
        (data: DrugSummaryData) => {
          sessionId = data.session_id || null;
          setCurrentThreadId(sessionId);
          
          // Update the assistant message with final content and citations from backend
          const updatedMessages = currentMessages.map(msg => 
            msg.id === messageId ? {
              ...msg,
              content: data.processed_content || accumulatedContent,
              citations: (data.citations as any) || {},
              sources: [],
              threadId: sessionId,
              svgContent: '',
              hasImages: false,
              isStreaming: false
            } : msg
          );
          
          setMessages(updatedMessages);
          setStreamedContent('');
          setIsStreaming(false);
          
          // Save to Firebase
          saveChatSession(updatedMessages).catch(error => {
            logger.error('Failed to save chat session:', error);
          });
          
          // Show feedback reminder after a delay
          setTimeout(() => {
            setShowFeedbackReminder(true);
          }, 3000);
        },
        // options
        {
          sessionId: currentThreadId || undefined,
          userId: user?.uid
        }
      );
    } catch (error: any) {
      logger.error('Drug summary error:', error);
      
      // Update message with error
      const updatedMessages = currentMessages.map(msg => 
        msg.id === messageId ? {
          ...msg,
          content: 'Sorry, I encountered an error while processing your drug information request. Please try again.',
          isStreaming: false
        } : msg
      );
      
      setMessages(updatedMessages);
      setError('Failed to get drug information. Please try again.');
      setIsStreaming(false);
    }
  };

  // Handle feedback updates
  const handleFeedbackUpdate = async (messageId: string, feedback: { rating: 'positive' | 'negative'; comment?: string }) => {
    try {
      const updatedMessages = messages.map(msg => 
        msg.id === messageId ? { ...msg, feedback } : msg
      );
      
      setMessages(updatedMessages);
      await saveChatSession(updatedMessages);
      
      // Hide feedback reminder
      setShowFeedbackReminder(false);
      
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Failed to save feedback');
    }
  };

  // Get citation count helper
  const getCitationCount = (citations: Record<string, Citation>) => {
    return Object.entries(citations).filter(([key, citation]) => {
      if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
        return false;
      }
      return true;
    }).length;
  };

  // Handle sharing
  const handleShare = async () => {
    if (!sessionId || !user) return;
    
    setIsSharing(true);
    
    try {
      // Get the latest assistant message
      const latestAssistantMessage = messages.filter(msg => msg.type === 'assistant').pop();
      if (!latestAssistantMessage) {
        toast.error('No content to share');
        return;
      }

      // Fetch session data
      const sessionRef = doc(db, 'chatSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists()) {
        toast.error('Session not found');
        return;
      }

      const sessionData = sessionSnap.data();
      
      // Fetch thread data if available
      let threadData = null;
      if (latestAssistantMessage.threadId) {
        const threadRef = doc(db, 'threads', latestAssistantMessage.threadId);
        const threadSnap = await getDoc(threadRef);
        if (threadSnap.exists()) {
          threadData = threadSnap.data();
        }
      }

      // Create public chat document
      const publicChatRef = doc(collection(db, 'publicChats'));
      const shareData: ShareData = {
        sessionId: sessionId,
        threadId: latestAssistantMessage.threadId || '',
        query: query,
        response: latestAssistantMessage.content,
        citations: latestAssistantMessage.citations || [],
        timestamp: new Date()
      };

      await setDoc(publicChatRef, {
        ...shareData,
        createdAt: serverTimestamp(),
        userId: user.uid,
        isPublic: true
      });

      const publicUrl = `${window.location.origin}/dashboard/public/${publicChatRef.id}`;
      setShareLink(publicUrl);
      setShowSharePopup(true);
      
      toast.success('Share link created!');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setIsSharing(false);
    }
  };

  // Copy share link to clipboard
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  // Share on LinkedIn
  const shareOnLinkedIn = () => {
    const text = `Check out this AI medical summary: ${query}`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}&title=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Share on WhatsApp
  const shareOnWhatsApp = () => {
    const text = `Check out this AI medical summary: ${query} ${shareLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Share via email
  const shareViaEmail = () => {
    const subject = `AI Medical Summary: ${query}`;
    const body = `I thought you might find this AI medical summary interesting:\n\n${shareLink}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  };
  
  // Remove the in-answer References section while keeping citations and sidebar
  const stripReferencesSection = (markdown: string): string => {
    if (!markdown) return markdown;
    const lines = markdown.split('\n');
    const isReferencesHeading = (raw: string) => {
      const line = raw.trim();
      return /^(?:#{1,6}\s*)?(?:\d+\.\s*)?references\b.*$/i.test(line);
    };
    const isNextSectionHeading = (raw: string) => /^(?:#{1,6})\s+.+/.test(raw.trim());
    const isDisclaimerStart = (raw: string) => /this information is for healthcare professionals/i.test(raw);
  
    const refIndex = lines.findIndex(isReferencesHeading);
    if (refIndex === -1) return markdown;
  
    let endIndex = lines.length; // by default remove until EOF
    for (let i = refIndex + 1; i < lines.length; i++) {
      if (isNextSectionHeading(lines[i]) || isDisclaimerStart(lines[i])) {
        endIndex = i;
        break;
      }
    }
  
    const before = lines.slice(0, refIndex);
    const after = lines.slice(endIndex);
    const result = [...before, ...after].join('\n');
    return result;
  };
  
  // Use the same citation formatting as drinfo-summary
  const formatCitationsForAiResults = (content: string, citations: Record<string, any>) => {
    if (!citations || Object.keys(citations).length === 0) {
      return content;
    }
    
    // Replace citation markers with styled citation numbers (same as drinfo-summary)
    return content.replace(/\[(\d+)\]/g, (match, num) => {
      const citation = citations[num];
      if (!citation) return match;
      
      const authorText = citation.authors 
        ? (Array.isArray(citation.authors) 
            ? citation.authors.join(', ') 
            : citation.authors)
        : '';
      const yearText = citation.year ? `(${citation.year})` : '';
      const titleText = citation.title || '';
      let sourceType = 'Journals';
      if (citation.source_type === 'drug_database') {
        sourceType = 'Drugs';
      } else if (citation.source_type === 'guidelines_database') {
        sourceType = 'Guidelines';
      }
      const url = citation.url || '#';
      
      return `<span class="citation-reference" 
        data-citation-number="${num}"
        data-citation-title="${titleText}"
        data-citation-authors="${authorText}"
        data-citation-year="${yearText}"
        data-citation-source="${sourceType}"
        data-citation-source-type="${citation.source_type}"
        data-citation-url="${url}"
        data-citation-journal="${citation.journal || ''}"
        data-citation-doi="${citation.doi || ''}"
      ><sup class="citation-number" style="background:#E0E9FF;color:#1F2937;">${num}</sup></span>`;
    });
  };

  // Copy content to clipboard
  const copyToClipboard = async (text?: string) => {
    try {
      const contentToCopy = text || messages.filter(msg => msg.type === 'assistant').pop()?.content || '';
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Content copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy content');
    }
  };

  const handleNewSearch = () => {
    // Abort current stream if running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    router.push('/dashboard');
  };

  // Add citation styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .citation-reference {
        position: relative;
        display: inline-block;
        cursor: pointer;
      }
      
      .citation-reference-group {
        display: inline-flex;
        align-items: baseline;
      }
      
      .citation-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        background-color: #e0f2fe;
        color: #0284c7;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 0 4px;
        box-sizing: border-box;
      }
      
      .citation-tooltip {
        position: fixed;
        z-index: 9999;
        width: 350px;
        padding: 12px 16px;
        border-radius: 8px;
        background-color: white;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        color: #1e293b;
        font-size: 14px;
        line-height: 1.5;
        border: 1px solid #e2e8f0;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        pointer-events: none;
      }
      
      @media (hover: hover) {
        .citation-reference:hover .citation-tooltip {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .citation-reference:not(:hover) .citation-tooltip {
          transition-delay: 0.4s;
        }
      }
      
      @media (hover: none) {
        .citation-tooltip {
          display: none;
        }
      }
      
      .citation-tooltip-title {
        color: #0284c7;
        font-weight: 600;
        margin-bottom: 4px;
        text-decoration: none;
        display: block;
      }
      
      .citation-tooltip-title:hover {
        text-decoration: underline;
      }
      
      .citation-tooltip-meta {
        color: #64748b;
        font-size: 12px;
        margin-bottom: 8px;
      }
      
      .citation-tooltip-source {
        color: #64748b;
        font-size: 12px;
        font-weight: 500;
      }
      
      html {
        scroll-behavior: smooth;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <DashboardLayout>
      {user && (
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing || messages.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#C8C8C8] text-[#223258] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="/Share icon.svg" alt="Share" className="w-5 h-5" />
              <span>{isSharing ? 'Sharing...' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 py-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

        {/* Loading State */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your session...</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {messages.map((message, index) => (
              <div key={message.id} className="">
                {message.type === 'user' ? (
                  <div className="p-3 sm:p-4 border rounded-5px" style={{ borderColor: 'rgba(55, 113, 254, 0.5)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px sm:text-[18px]', color: '#223258', backgroundColor: '#E4ECFF' }}>
                    <p className="m-0">{message.content}</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex items-start gap-2 mb-3 sm:mb-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                          <img src="/answer-icon.svg" alt="Answer" className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {index === messages.length - 1 && isStreaming && !message.content ? (
                          <span className="shimmer-text italic text-sm sm:text-base">Generating response...</span>
                        ) : (
                          message.type === 'assistant' && message.content && (
                            <span className="font-semibold font-['DM_Sans'] mt-1 text-base text-blue-900">
                              Answer
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    {message.content && (
                      <div className="mb-4 sm:mb-6">
                        <div 
                          className="prose prose-slate prose-ul:text-black marker:text-black max-w-none text-base sm:text-base prose-h2:text-base prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                          dangerouslySetInnerHTML={{ __html: formatWithDummyCitations(marked.parse(stripReferencesSection(message.content), { async: false })) }}
                        />
                      </div>
                    )}
                    
                    {/* Citations Grid - Only show when not streaming */}
                     {!message.isStreaming && message.citations && Object.keys(message.citations).length > 0 && (
                        <div className="mb-6">
                          <ReferenceGrid 
                            citations={message.citations}
                            onShowAll={(citations) => {
                              setSelectedCitation(Object.values(citations)[0] || null);
                              setShowCitationsSidebar(true);
                            }}
                            getCitationCount={getCitationCount}
                          />
                        </div>
                      )}
                    
                    {/* Feedback Section - Only show when not streaming */}
                    {/* COMMENTED OUT: Useful/Not Useful and Copy buttons
                    {!message.isStreaming && (
                      <div className="mt-4">
                        <AnswerFeedback
                          messageId={message.id}
                          threadId={message.threadId}
                          initialFeedback={message.feedback}
                          onFeedbackUpdate={(feedback) => {
                            setMessages(prev => prev.map(msg => 
                              msg.id === message.id ? { ...msg, feedback } : msg
                            ));
                          }}
                        />
                      </div>
                    )}
                    */}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}



          {/* Streaming Content */}
          {isStreaming && streamedContent && messages.length > 0 && messages[messages.length - 1].type === 'assistant' && (
            <div className="mb-4">
              <div className="flex items-start gap-2 mb-3 sm:mb-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                    <img src="/answer-icon.svg" alt="Answer" className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold font-['DM_Sans'] mt-1 text-base text-blue-900">
                    Answer
                  </span>
                </div>
              </div>
              <div className="mb-4 sm:mb-6">
                <div 
                  className="prose prose-slate prose-ul:text-black marker:text-black max-w-none text-base sm:text-base prose-h2:text-base prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: formatWithDummyCitations(marked.parse(stripReferencesSection(streamedContent), { async: false })) }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          
          {/* Follow-up Question Section - Moved to bottom */}
          {/* COMMENTED OUT: Follow-up search bar
          {messages.length > 0 && !isStreaming && (
            <>
              <div style={{ marginBottom: '120px sm:140px' }} />
              <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4 z-10">
                <div className="max-w-4xl mx-auto px-2 sm:px-4">
                  <div className="relative w-full bg-white rounded border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-3 md:p-4">
                    <div className="relative">
                      <textarea
                        value={followUpQuestion}
                        onChange={(e) => {
                          setFollowUpQuestion(e.target.value);
                          // Auto-resize the textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Ask a follow-up question..."
                        className="w-full text-base md:text-[16px] text-[#223258] font-normal font-['DM_Sans'] outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto"
                        onKeyDown={(e) => e.key === 'Enter' && handleFollowUpQuestion()}
                        rows={1}
                        style={{ height: '24px' }}
                      />
                    </div>
                    <div className="flex justify-end items-center mt-2">
                       <button onClick={handleFollowUpQuestion} className="flex-shrink-0" disabled={isLoading}>
                         {isLoading ? (
                           <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                         ) : (
                           <img src="/search.svg" alt="Search" width={30} height={30} />
                         )}
                      </button>
                    </div>
                  </div>
                  <div className="w-full py-3 text-center text-[14px] text-gray-400">
                    <p>Generated by AI, apply professional/physicians' judgment. <a href="https://synduct.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" className="font-regular underline text-black hover:text-[#3771FE] transition-colors duration-200">Click here</a> for further information.</p>
                  </div>
                </div>
              </div>
          </>)}
          */}
          </div>
        </div>
      </div>
      )}

      {/* Citations Sidebar */}
      <ReferencesSidebar
        open={showCitationsSidebar}
        citations={messages.reduce((acc, msg) => {
          if (msg.citations && typeof msg.citations === 'object' && !Array.isArray(msg.citations)) {
            return { ...acc, ...msg.citations };
          }
          return acc;
        }, {} as Record<string, any>)}
        onClose={() => setShowCitationsSidebar(false)}
      />

      {/* Drug Information Modal */}
      <DrugInformationModal
        open={showDrugModal}
        citation={selectedCitation}
        onClose={() => {
          setShowDrugModal(false);
          setSelectedCitation(null);
        }}
      />

      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Share this conversation</h3>
              <button
                onClick={() => setShowSharePopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Share Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Share via
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={shareOnLinkedIn}
                    className="flex-1 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm"
                  >
                    LinkedIn
                  </button>
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={shareViaEmail}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Mail className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Reminder Modal - COMMENTED OUT */}
      {/* {showFeedbackReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <ThumbsUp className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                How was this response?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Your feedback helps us improve our AI responses.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFeedbackReminder(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowFeedbackReminder(false);
                    // Find the AnswerFeedback component for the latest message and trigger the feedback form
                    const latestMessage = messages.filter(msg => msg.type === 'assistant').pop();
                    if (latestMessage) {
                      // This would trigger the feedback form to open
                      document.querySelector(`[data-message-id="${latestMessage.id}"] .feedback-button`)?.click();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Give Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </DashboardLayout>
  );
}

export default function AIResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <AIResultsContent />
      </Suspense>
  );
}