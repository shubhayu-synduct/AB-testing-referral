'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, ExternalLink, Copy, CheckCircle, X, Check, ThumbsUp, ThumbsDown, Mail, Share2, RotateCcw, Download, ChevronDown, ChevronUp, User, Bot, Plus, Loader2, AlertCircle } from 'lucide-react';
import { SparkleIcon } from '@/components/ui/sparkle-icon';
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
import { getCachedAuthStatus } from '@/lib/background-auth';

interface Citation {
  id: string;
  text: string;
  source: string;
  url?: string;
  title: string;
  description?: string;
  type?: string;
  source_type?: string;
  drug_citation_type?: string;
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
  const [isSearching, setIsSearching] = useState(false);
  
  // UI state
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
  const hasProcessedInitialQuery = useRef<boolean>(false);
  
  // Session and user data
  const [sessionData, setSessionData] = useState<any>(null);
  const [userCountry, setUserCountry] = useState<string>('US');
  
  // Persistent session storage key
  const PERSISTENT_SESSION_KEY = 'drinfo_latest_ai_session';

  // Helper functions for localStorage persistence
  const saveSessionToStorage = (sessionId: string, query: string, messages: Message[]) => {
    try {
      const sessionData = {
        sessionId,
        query,
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
        })),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(PERSISTENT_SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      // console.error('Failed to save session to localStorage:', error);
    }
  };

  const getSessionFromStorage = () => {
    try {
      const stored = localStorage.getItem(PERSISTENT_SESSION_KEY);
      if (stored) {
        const sessionData = JSON.parse(stored);
        return {
          ...sessionData,
          messages: sessionData.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        };
      }
    } catch (error) {
      // console.error('Failed to load session from localStorage:', error);
    }
    return null;
  };

  const clearSessionFromStorage = () => {
    try {
      localStorage.removeItem(PERSISTENT_SESSION_KEY);
    } catch (error) {
      // console.error('Failed to clear session from localStorage:', error);
    }
  };

  // Load chat session on mount
  useEffect(() => {
    if (sessionId && user) {
      loadChatSession();
    } else if (query && !isSearching && !hasProcessedInitialQuery.current) {
      hasProcessedInitialQuery.current = true;
      
      // Check if we have a persistent session for this query
      const persistentSession = getSessionFromStorage();
      
      if (persistentSession && persistentSession.query === query && persistentSession.messages.length > 0) {
        // Use existing persistent session
        setMessages(persistentSession.messages);
        setIsLoading(false);
        // Update URL to include the persistent sessionId
        router.replace(`/ai-results?q=${encodeURIComponent(query)}&sessionId=${persistentSession.sessionId}`);
      } else {
        // Display the user's question immediately
        const userMessage: Message = {
          id: uuidv4(),
          type: 'user',
          content: query,
          timestamp: new Date()
        };
        
        // Clear previous messages and show the question immediately
        setMessages([userMessage]);
        setIsLoading(false);
        
        // Create new session for direct query
        const newSessionId = uuidv4();
        router.replace(`/ai-results?q=${encodeURIComponent(query)}&sessionId=${newSessionId}`);
      }
    }
  }, [sessionId, user, query, isSearching]);

  // Auto-scroll to bottom when new messages arrive - DISABLED
  // useEffect(() => {
  //   if (messagesEndRef.current) {
  //     messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  //   }
  // }, [messages]);

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
        <div class="citation-tooltip-source">${source}</div>
        ${titleElement}
        ${authors ? `<div class="citation-tooltip-meta">${authors} ${year}</div>` : ''}
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
  }, [messages, streamedContent, showCitationsSidebar, isStreaming]);

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
        // console.error('Failed to fetch user country:', error);
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
        // Display the user's question immediately before starting search
        const userMessage: Message = {
          id: uuidv4(),
          type: 'user',
          content: query,
          timestamp: new Date()
        };
        setMessages([userMessage]);
        setIsLoading(false);
        
        // Start new search if no session exists
        await handleSearch(query, true);
      }
    } catch (error) {
      // console.error('Error loading chat session:', error);
      setError('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  };

  // Save chat session to Firebase and localStorage
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
      
      // Also save to localStorage for persistence
      saveSessionToStorage(sessionId, query, updatedMessages);
    } catch (error) {
      // console.error('Error saving chat session:', error);
    }
  };

  // Handle search
  const handleSearch = async (searchQuery: string, clearPrevious: boolean = false) => {
    if (!searchQuery.trim() || isSearching) return;
    
    setIsSearching(true);
    
    const assistantMessage: Message = {
      id: uuidv4(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    // If clearPrevious is true, keep existing messages (user question already displayed), otherwise append assistant message
    const newMessages = clearPrevious ? [...messages, assistantMessage] : [...messages, assistantMessage];
    setMessages(newMessages);
    setIsStreaming(true);
    setStreamedContent('');
    setError(null);

    try {
      await handleSearchWithContent(searchQuery, assistantMessage.id, newMessages);
    } catch (error) {
      // console.error('Search failed:', error);
      setError('Failed to get AI response. Please try again.');
      setIsStreaming(false);
    } finally {
      setIsSearching(false);
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
    
    try {
      await sendDrugFollowUpQuestion(
        question,
        currentThreadId,
        // onChunk callback - not used for non-streaming
        () => {},
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
              content: data.processed_content || '',
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

  // Fetch unified suggestions (both EMA drugs and AI suggestions) for autocomplete
  const fetchAISuggestions = async (term: string) => {
    logger.debug('fetchAISuggestions called with:', term);
    if (term.trim() === '') {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }
    setShowRecommendations(true);
    
    try {
      // Fetch both EMA drugs and AI suggestions simultaneously
      const [emaResults, aiResults] = await Promise.allSettled([
        // EMA Drug Search (limited to 3 results) - Port 8002
        (async () => {
          const authStatus = await getCachedAuthStatus();
          const { enhancedSearchDrugs } = await import('@/lib/authenticated-api');
          const data = await enhancedSearchDrugs(term, 3, authStatus.database);
          
          let transformedData = [];
          
          // Handle direct brand match
          if (data.direct_match) {
            transformedData.push({
              brand_name: data.direct_match.name,
              active_substance: data.direct_match.active_substance,
              inn: [],
              search_type: 'direct_brand'
            });
          }
          
          // Handle brand options (limit to 2 to make room for AI suggestions)
          if (data.brand_options && data.brand_options.length > 0) {
            const brandOptions = data.brand_options.slice(0, 2).map((drug: any) => ({
              brand_name: drug.brand_name,
              active_substance: drug.active_substance || [],
              inn: drug.inn || [],
              search_type: drug.search_type || 'brand_option'
            }));
            transformedData = [...transformedData, ...brandOptions];
          }
          
          return transformedData.slice(0, 3); // Ensure max 3 EMA results
        })(),
        
        // Gemini Drug Suggestions (limited to 3 results)
        (async () => {
          try {
            const response = await fetch('/api/suggestions/drugs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: term }),
            });
            
            if (!response.ok) {
              throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            const suggestions = data.suggestions || [];
            
            return suggestions.slice(0, 3).map((suggestion: string) => ({
              brand_name: suggestion,
              active_substance: ['Drug Suggestion'],
              inn: [],
              search_type: 'ai_suggestion'
            }));
          } catch (error) {
            logger.error('Gemini drug suggestions failed:', error);
            // Fallback to real drug suggestions
            const lowerTerm = term.toLowerCase();
            let fallbackSuggestions;
            
            if (lowerTerm.includes('asp')) {
              fallbackSuggestions = ['aspirin', 'aspartame', 'asparagine'];
            } else if (lowerTerm.includes('para')) {
              fallbackSuggestions = ['paracetamol', 'paroxetine', 'paracetamol/codeine'];
            } else if (lowerTerm.includes('met')) {
              fallbackSuggestions = ['metformin', 'metoprolol', 'metronidazole'];
            } else {
              fallbackSuggestions = ['acetaminophen', 'ibuprofen', 'aspirin'];
            }
            
            return fallbackSuggestions.slice(0, 3).map(suggestion => ({
              brand_name: suggestion,
              active_substance: ['Drug Suggestion'],
              inn: [],
              search_type: 'ai_suggestion'
            }));
          }
        })()
      ]);
      
      // Combine results - mix EMA and AI suggestions
      let allRecommendations: any[] = [];
      
      // Add EMA results first
      if (emaResults.status === 'fulfilled' && emaResults.value.length > 0) {
        allRecommendations = [...allRecommendations, ...emaResults.value];
      }
      
      // Add AI results
      if (aiResults.status === 'fulfilled' && aiResults.value.length > 0) {
        allRecommendations = [...allRecommendations, ...aiResults.value];
      }
      
      // Limit total to 6 suggestions (3 EMA + 3 AI)
      setRecommendations(allRecommendations.slice(0, 6));
      
    } catch (error) {
      logger.error('Error fetching unified suggestions:', error);
      
      // Fallback: try EMA search with English database + AI fallback
      try {
        const { enhancedSearchDrugs } = await import('@/lib/authenticated-api');
        const data = await enhancedSearchDrugs(term, 3, 'english');
        
        let fallbackData = [];
        if (data.direct_match) {
          fallbackData.push({
            brand_name: data.direct_match.name,
            active_substance: data.direct_match.active_substance,
            inn: [],
            search_type: 'direct_brand'
          });
        }
        if (data.brand_options && data.brand_options.length > 0) {
          const brandOptions = data.brand_options.slice(0, 2).map((drug: any) => ({
            brand_name: drug.brand_name,
            active_substance: drug.active_substance || [],
            inn: drug.inn || [],
            search_type: drug.search_type || 'brand_option'
          }));
          fallbackData = [...fallbackData, ...brandOptions];
        }
        
        // Add AI fallback suggestions
        const aiFallback = [
          `${term}`,
          `${term} generic`,
          `${term} brand`
        ].slice(0, 3).map(suggestion => ({
          brand_name: suggestion,
          active_substance: ['AI Suggestion'],
          inn: [],
          search_type: 'ai_suggestion'
        }));
        
        setRecommendations([...fallbackData.slice(0, 3), ...aiFallback]);
      } catch (fallbackError) {
        logger.error('Unified suggestions fallback also failed:', fallbackError);
        // Final fallback - just AI suggestions
        const finalFallback = [
          `${term}`,
          `${term} generic`,
          `${term} brand`
        ].map(suggestion => ({
          brand_name: suggestion,
          active_substance: ['AI Suggestion'],
          inn: [],
          search_type: 'ai_suggestion'
        }));
        setRecommendations(finalFallback);
      }
    }
  };

  // Handle search from search bar
  const handleSearchBarSubmit = () => {
    if (!searchTerm.trim() || isSearching) return;
    
    const searchQuery = searchTerm.trim();
    
    setShowRecommendations(false);
    // Reset the processed flag for new search
    hasProcessedInitialQuery.current = false;
    
    // Clear persistent session for new search
    clearSessionFromStorage();
    
    // Clear the search bar immediately
    setSearchTerm('');
    
    // Navigate to new AI results with the search term
    const searchParams = new URLSearchParams();
    searchParams.set('q', searchQuery);
    
    // Don't preserve existing sessionId for new search - let it create a new one
    router.push(`/ai-results?${searchParams.toString()}`);
  };

  // Handle showing all citations
  const handleShowAllCitations = (citations: Citation[]) => {
    setShowCitationsSidebar(true);
  };

  // Main search function without streaming - display final answer directly
  const handleSearchWithContent = async (searchQuery: string, messageId: string, currentMessages: Message[]) => {
    setIsStreaming(true);
    setStreamedContent('');
    setCurrentThreadId(null);
    
    try {
      await fetchDrugSummary(
        searchQuery,
        // onChunk callback - not used for non-streaming
        () => {},
        // onStatus callback
        (status: string, message?: string) => {
          logger.info(`Drug summary status: ${status} - ${message || ''}`);
        },
        // onComplete callback
        (data: DrugSummaryData) => {
          const sessionId = data.session_id || null;
          setCurrentThreadId(sessionId);
          
          // Update the assistant message with final content and citations from backend
          const updatedMessages = currentMessages.map(msg => 
            msg.id === messageId ? {
              ...msg,
              content: data.processed_content || '',
              citations: (data.citations as any) || {},
              sources: [],
              threadId: sessionId,
              svgContent: '',
              hasImages: false,
              isStreaming: false
            } : msg
          );
          
          setMessages(updatedMessages as Message[]);
          setStreamedContent('');
          setIsStreaming(false);
          
          // Save to Firebase
          saveChatSession(updatedMessages as Message[]).catch(error => {
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
      // console.error('Error updating feedback:', error);
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

  // Fetch AI suggestions when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        fetchAISuggestions(searchTerm);
      } else {
        setRecommendations([]);
        setShowRecommendations(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle clicking outside the recommendations to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowRecommendations(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      // console.error('Error creating share link:', error);
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
      // console.error('Failed to copy link:', error);
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
      // console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy content');
    }
  };

  const handleNewSearch = () => {
    // Abort current stream if running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear persistent session for new search
    clearSessionFromStorage();
    
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
        color: #273561;            /* Dark blue title - same as ReferenceGrid */
        font-weight: 600;          /* Bold */
        margin-bottom: 4px;
        text-decoration: none;
        display: block;
      }
      
      .citation-tooltip-title:hover {
        text-decoration: underline; /* Underline on hover */
      }
      
      .citation-tooltip-meta {
        color: #8D8D8D;            /* Gray meta info - same as ReferenceGrid */
        font-size: 12px;
        margin-bottom: 8px;
      }
      
      .citation-tooltip-source {
        color: #8D8D8D;            /* Gray source info - same as ReferenceGrid */
        font-size: 12px;
        font-weight: 500;
      }
      
      html {
        scroll-behavior: smooth;
      }
      
      @keyframes border-flow {
        0%, 100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
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
        {/* Search Bar */}
        <div className="sticky top-0 z-30 md:z-50 bg-gray-50 py-3">
          <div className="max-w-4xl mx-auto px-2 sm:px-4">
            <div className="relative mb-0" ref={searchContainerRef}>
              {/* Unified search with gradient border */}
              <div className="absolute inset-0 w-full max-w-4xl mx-auto rounded-lg p-[2px] pointer-events-none">
                <div className="w-full h-full rounded-lg bg-gradient-to-r from-[#3771FE]/[0.4] via-[#2563eb]/[0.6] to-[#3771FE]/[0.4] animate-[border-flow_3s_ease-in-out_infinite] bg-[length:200%_100%]" />
              </div>
              <div className="flex items-center border-[2.7px] rounded-lg h-[52px] w-full max-w-4xl mx-auto pr-3 md:pr-4 bg-white transition-all duration-300 relative z-10 border-[#3771FE]/[0.27] shadow-[0_0_12px_rgba(55,113,254,0.2)]">
                <button 
                  onClick={() => router.push('/drug-information')}
                  className="pl-3 md:pl-4 flex items-center hover:opacity-70 transition-opacity"
                >
                  <ArrowLeft className="stroke-[2.5] w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors duration-300 text-[#01257C]" fill="none" />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search drugs..."
                  className="flex-1 py-2 md:py-3 px-2 md:px-3 outline-none text-[#223258] font-['DM_Sans'] font-[400] text-[14px] md:text-[16px] leading-[100%] tracking-[0%] placeholder-[#9599A8] placeholder:font-['DM_Sans'] placeholder:text-[14px] md:placeholder:text-[16px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (searchTerm.trim() !== '') {
                      setShowRecommendations(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim() !== '') {
                      setShowRecommendations(false);
                      handleSearchBarSubmit();
                    }
                  }}
                  onBlur={(e) => {
                    setTimeout(() => {
                      if (searchContainerRef.current && !searchContainerRef.current.contains(document.activeElement)) {
                        setShowRecommendations(false);
                      } else {
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }
                    }, 100);
                  }}
                />
                <button 
                  className="flex items-center justify-center border-none bg-transparent relative ml-2 md:ml-3 hover:opacity-80 transition-opacity text-[#6366f1] p-1"
                  onClick={handleSearchBarSubmit}
                  disabled={!searchTerm.trim() || isSearching}
                >
                  <svg 
                    width="28" 
                    height="28" 
                    viewBox="0 0 46 46" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-[28px] h-[28px] md:w-[32px] md:h-[32px]"
                  >
                    <rect width="46" height="46" rx="6.57143" fill="#3771FE"/>
                    <path d="M29.8594 16.5703L13.3594 33.0703" stroke="white" strokeWidth="2.25" strokeLinecap="round"/>
                    <path d="M20.4297 14.6406H31.6426V24.9263" stroke="white" strokeWidth="2.25" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Recommendations dropdown */}
              {showRecommendations && recommendations.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-w-4xl mx-auto">
                  {recommendations.map((drug, index) => (
                    <div 
                      key={index}
                      className={`block px-4 py-3 hover:bg-blue-50 text-[#223258] font-['DM_Sans'] font-[400] text-[16px] leading-[100%] tracking-[0%] border-b border-gray-100 last:border-b-0 relative cursor-pointer ${
                        drug.search_type === 'ai_suggestion' ? 'border-l-4 border-l-[#2196f3]' : drug.search_type === 'ai_search' ? 'border-l-4 border-l-[#ffa500]' : 'border-l-4 border-l-[#28a745]'
                      }`}
                      onClick={() => {
                        if (drug.search_type === 'ai_suggestion') {
                          // Navigate to AI results page for AI suggestions
                          const searchParams = new URLSearchParams();
                          searchParams.set('q', drug.brand_name);
                          router.push(`/ai-results?${searchParams.toString()}`);
                        } else {
                          // Navigate to drug information page for EMA drugs (direct_brand, brand_option)
                          router.push(`/drug-information/${encodeURIComponent(drug.brand_name)}`);
                        }
                        setShowRecommendations(false);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {drug.search_type === 'ai_suggestion' ? (
                            <>
                              <span className="font-semibold">{drug.brand_name}</span>
                            </>
                          ) : drug.search_type !== 'direct_brand' ? (
                            <>
                              <span className="font-semibold">{drug.active_substance?.join(', ') || drug.inn?.join(', ') || drug.brand_name}</span> <span className="text-gray-600">(<em>Brand Name:</em> <span className="font-semibold">{drug.brand_name}</span>)</span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">{drug.brand_name}</span> <span className="text-gray-600">(<em>active substances:</em> <span className="font-semibold">{drug.active_substance?.join(', ') || drug.inn?.join(', ') || 'N/A'}</span>)</span>
                            </>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[14px] font-['DM_Sans'] font-semibold uppercase ${
                          drug.search_type === 'ai_suggestion'
                            ? 'bg-[#e3f2fd] text-[#1565c0] border border-[#bbdefb]'
                            : drug.search_type === 'ai_search'
                            ? 'bg-[#fff3cd] text-[#856404] border border-[#ffeaa7]' 
                            : 'bg-[#d4edda] text-[#155724] border border-[#c3e6cb]'
                        }`}>
                          {drug.search_type === 'ai_suggestion' ? (
                            <div className="flex items-center">
                              <span className="mr-1">AI</span>
                              <SparkleIcon className="w-[14px] h-[14px]" fill="currentColor" />
                            </div>
                          ) : drug.search_type === 'ai_search' ? (
                            <div className="flex items-center">
                              <span className="mr-1">AI</span>
                              <SparkleIcon className="w-[14px] h-[14px]" fill="currentColor" />
                            </div>
                          ) : 'EMA'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto scroll-smooth" style={{ scrollPaddingTop: '120px' }}>
          <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 py-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {/* Scroll snap point to keep search bar visible */}
            <div className="scroll-mt-32" id="content-start"></div>
          
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
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {messages.map((message, index) => (
              <div key={message.id} className="">
                {message.type === 'user' ? (
                  <div className="p-3 sm:p-4 border rounded-5px mb-6" style={{ borderColor: 'rgba(55, 113, 254, 0.5)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px sm:text-[18px]', color: '#223258', backgroundColor: '#E4ECFF' }}>
                    <p className="m-0">{message.content}</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    {!isStreaming && (
                      <div className="flex items-start gap-2 mb-3 sm:mb-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                            <svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6">
                              <g clipPath="url(#clip0_2546_32659)">
                                <path d="M-10 44.1162H9.61914V47.9912H-14V17.5625H-10V44.1162ZM13.6191 40.2412V44.1162H9.61914V40.2412H13.6191ZM-2 36.3037H9.61914V40.2412H-6V17.5625H-2V36.3037ZM17.6191 40.2412H13.6191V36.3037H17.6191V40.2412ZM21.6191 36.3037H17.6191V32.4287H21.6191V36.3037ZM13.6191 32.4287V36.3037H9.61914V32.4287H13.6191ZM9.61914 32.4287H1.80859V17.5625H9.61914V32.4287ZM17.6191 32.4287H13.6191V13.6875H1.80859V9.8125H17.6191V32.4287ZM25.4277 32.4287H21.6191V5.875H1.80859V2H25.4277V32.4287ZM-6 17.5625H-10V13.6875H-6V17.5625ZM1.80859 17.5625H-2V13.6875H1.80859V17.5625ZM-2 13.6875H-6V9.8125H-2V13.6875ZM1.80859 9.8125H-2V5.875H1.80859V9.8125Z" fill="#3771FE"/>
                              </g>
                              <defs>
                                <clipPath id="clip0_2546_32659">
                                  <rect width="26" height="32" fill="white" transform="translate(2)"/>
                                </clipPath>
                              </defs>
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {message.type === 'assistant' && (
                            <span className="font-semibold font-['DM_Sans'] mt-1 text-base text-blue-900">
                              Answer
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {message.content &&  (
                      <div className="mb-4 sm:mb-6">
                        <div 
                          className="prose prose-slate prose-ul:text-black marker:text-black max-w-none text-base sm:text-base prose-h2:text-base prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                          dangerouslySetInnerHTML={{ __html: formatWithCitations(marked.parse(stripReferencesSection(message.content), { async: false }), message.citations || {}) }}
                        />
                      </div>
                    )}
                    
                    {/* Citations Grid - Only show when not streaming */}
                     {!message.isStreaming && message.citations && Object.keys(message.citations).length > 0 && (
                        <div className="mb-6">
                          <ReferenceGrid 
                            citations={message.citations as Record<string, any>}
                            onShowAll={(citations) => {
                              const citation = Object.values(citations)[0];
                              setSelectedCitation(citation ? {
                                id: citation.title || '',
                                text: citation.title || '',
                                source: citation.source_type || 'Unknown',
                                title: citation.title,
                                url: citation.url
                              } as Citation : null);
                              setShowCitationsSidebar(true);
                            }}
                            getCitationCount={(citations: Record<string, any>) => getCitationCount(citations)}
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



          {/* Loading indicator for streaming */}
          {isStreaming && (
            <div className="mb-4 mt-6">
              <div className="flex items-start gap-2 mb-3 sm:mb-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                    <svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6">
                      <g clipPath="url(#clip0_2546_32659)">
                        <path d="M-10 44.1162H9.61914V47.9912H-14V17.5625H-10V44.1162ZM13.6191 40.2412V44.1162H9.61914V40.2412H13.6191ZM-2 36.3037H9.61914V40.2412H-6V17.5625H-2V36.3037ZM17.6191 40.2412H13.6191V36.3037H17.6191V40.2412ZM21.6191 36.3037H17.6191V32.4287H21.6191V36.3037ZM13.6191 32.4287V36.3037H9.61914V32.4287H13.6191ZM9.61914 32.4287H1.80859V17.5625H9.61914V32.4287ZM17.6191 32.4287H13.6191V13.6875H1.80859V9.8125H17.6191V32.4287ZM25.4277 32.4287H21.6191V5.875H1.80859V2H25.4277V32.4287ZM-6 17.5625H-10V13.6875H-6V17.5625ZM1.80859 17.5625H-2V13.6875H1.80859V17.5625ZM-2 13.6875H-6V9.8125H-2V13.6875ZM1.80859 9.8125H-2V5.875H1.80859V9.8125Z" fill="#3771FE"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_2546_32659">
                          <rect width="26" height="32" fill="white" transform="translate(2)"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold font-['DM_Sans'] mt-1 text-base text-blue-900">
                    Answer
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-full" style={{ animationDelay: '0ms' }}></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" style={{ animationDelay: '150ms' }}></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-5/6" style={{ animationDelay: '300ms' }}></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-full" style={{ animationDelay: '450ms' }}></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-2/3" style={{ animationDelay: '600ms' }}></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-4/5" style={{ animationDelay: '750ms' }}></div>
              </div>
            </div>
          )}

          

          <div ref={messagesEndRef} />
          
          </div>
        </div>
      </div>
      )}

      {/* Citations Sidebar */}
      <ReferencesSidebar
        open={showCitationsSidebar}
        citations={messages.reduce((acc, msg) => {
          if (msg.citations && typeof msg.citations === 'object' && !Array.isArray(msg.citations)) {
            return { ...acc, ...(msg.citations as Record<string, any>) };
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
      
      {/* Disclaimer Footer - Only show after answer is complete and not streaming */}
      {messages.length > 0 && !isStreaming && messages.some(msg => msg.type === 'assistant' && msg.content && !msg.isStreaming) && (
        <div className="sticky bottom-0 bg-gray-50 pt-2 pb-0 z-10 mt-0">
          <div className="max-w-4xl mx-auto px-2 sm:px-4">
            <div className="w-full py-3 md:py-4 text-center text-xs text-gray-400 px-4">
              <p>DR. INFO is an informational and educational tool.</p>
              <p>Do not insert protected health information or personal data.</p>
              <Link href="https://synduct.com/terms-and-conditions/" className="text-black hover:text-[#3771FE] underline inline-block" target="_blank" rel="noopener noreferrer">
                Terms and Conditions
              </Link>
            </div>
          </div>
        </div>
      )}
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