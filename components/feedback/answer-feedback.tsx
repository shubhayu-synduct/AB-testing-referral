"use client"

import { useState, useRef, useEffect } from 'react'
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import { getFirebaseFirestore } from '@/lib/firebase'
import { doc, setDoc, addDoc, collection, getDoc, getDocs, query as firestoreQuery, orderBy, serverTimestamp } from 'firebase/firestore'
import { MovingBorder } from "@/components/ui/moving-border";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';
import { track } from '@/lib/analytics';
import { convert } from 'html-to-text';

interface Citation {
  title: string;
  url?: string;
  authors?: string[];
  year?: string | number;
  journal?: string;
  doi?: string;
  source_type?: string;
  drug_citation_type?: string;
}

interface AnswerFeedbackProps {
  conversationId: string;
  threadId: string;
  answerText?: string;
  citations?: Record<string, Citation>;
  onReload?: () => void;
  isReloading?: boolean;
  messageId?: string;
  user?: any; // Add user prop for sharing functionality
}

const FEEDBACK_OPTIONS_HELPFUL = [
  'Relevant', 'Accurate', 'High-grade evidence', 'Comprehensive', 'Sufficient detail', 'Concise', 'Patient-tailored', 'Recent Information', 'Well-referenced', 'Highly Satisfied', 'Moderately Satisified'
];

const FEEDBACK_OPTIONS_NOT_HELPFUL = [
  'Incorrect', 'Low-grade evidence', 'Missing information', 'Too long', 'Generic', 'Outdated', 'Poorly referenced', 'Patient safety concern', 'Dissatisfied', 'Too short'
];

export default function AnswerFeedback({ 
  conversationId, 
  threadId, 
  answerText = '',
  citations = {},
  onReload,
  isReloading,
  messageId,
  user
}: AnswerFeedbackProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [contextOfUse, setContextOfUse] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showForm, setShowForm] = useState<null | 'helpful' | 'not_helpful'>(null);
  const [thankYou, setThankYou] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState<{
    helpful?: boolean;
    not_helpful?: boolean;
  }>({});
  const feedbackFormRef = useRef<HTMLDivElement>(null);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  // Add useEffect for auto-scrolling
  useEffect(() => {
    if (showForm && feedbackFormRef.current) {
      feedbackFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showForm]);

  const toggleFeedback = (option: string) => {
    setSelectedFeedback(prev =>
      prev.includes(option) ? prev.filter(r => r !== option) : [...prev, option]
    );
  };

  const toggleContext = (option: string) => {
    setContextOfUse(prev =>
      prev.includes(option) ? prev.filter(r => r !== option) : [...prev, option]
    );
  };

  const handleFeedbackClick = (type: 'helpful' | 'not_helpful') => {
    // Track like/dislike click
    if (type === 'helpful') {
      track.drinfoSummaryLikedAnswer('drinfo-summary');
    } else {
      track.drinfoSummaryDislikedAnswer('drinfo-summary');
    }
    
    // If clicking the same type that's already open, close it
    if (showForm === type) {
      setShowForm(null);
      setSelectedFeedback([]);
      setFeedbackText('');
      setThankYou(false);
      // Scroll back to the button container
      setTimeout(() => {
        if (buttonContainerRef.current) {
          buttonContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      // If clicking a different type, switch to it
      setShowForm(type);
      setSelectedFeedback([]);
      setFeedbackText('');
      setThankYou(false);
    }
  };

  const handleCancel = () => {
    setShowForm(null);
    setSelectedFeedback([]);
    setFeedbackText('');
  };

  const saveFeedback = async () => {
    setIsSubmitting(true);
    try {
      const feedbackType = showForm === 'helpful' ? 'helpful' : 'not_helpful';
      const feedbackData = {
        options: selectedFeedback,
        text_comment: feedbackText,
        timestamp: new Date().toISOString()
      };

      logger.debug('Attempting to save feedback to Firebase:', {
        conversationId,
        threadId,
        feedbackType,
        feedbackData
      });

      if (!threadId) {
        throw new Error('Thread ID not available yet');
      }

      const db = getFirebaseFirestore();
      const feedbackRef = doc(db, 
        'conversations', 
        conversationId, 
        'threads', 
        threadId, 
        'feedback', 
        feedbackType
      );

      await setDoc(feedbackRef, feedbackData);
      logger.debug('Feedback saved successfully to Firebase');

      // Track feedback submitted
      track.drinfoSummaryFeedbackSubmitted(feedbackType === 'helpful' ? 'positive' : 'negative', 'drinfo-summary');

      setThankYou(true);
      setShowForm(null);
      setSelectedFeedback([]);
      setContextOfUse([]);
      setFeedbackText('');
      // Mark the current feedback type as submitted
      setSubmittedFeedback(prev => ({
        ...prev,
        [feedbackType]: true
      }));
    } catch (error) {
      logger.error('Error saving feedback to Firebase:', error);
      setValidationMessage('Failed to save feedback. Please try again.');
      setTimeout(() => {
        setValidationMessage('');
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to format citations for copy
  const formatCitationsForCopy = (citations: Record<string, Citation>): string => {
    // Filter out implicit drug citations (same logic as ReferenceGrid)
    const filteredCitations = Object.entries(citations).filter(([key, citation]) => {
      if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
        return false;
      }
      return true;
    });

    if (filteredCitations.length === 0) {
      return '';
    }

    let citationsText = 'The Citations\n';
    
    filteredCitations.forEach(([key, citation], index) => {
      const citationNumber = index + 1;
      
      // Source type
      let sourceType = 'Journals';
      if (citation.source_type === 'guidelines_database') {
        sourceType = 'Guidelines';
      } else if (citation.source_type === 'drug_database') {
        sourceType = 'Drugs';
      }
      
      // Authors
      let authorsText = '';
      if (citation.authors) {
        authorsText = Array.isArray(citation.authors) 
          ? citation.authors.join(', ')
          : citation.authors;
      }
      
      // Journal and year
      let journalText = '';
      if (citation.journal) {
        const showYear = citation.source_type !== 'drug_database' && citation.year;
        journalText = showYear ? `${citation.journal} (${citation.year})` : citation.journal;
      }
      
      // DOI
      let doiText = '';
      if (citation.doi) {
        doiText = `DOI: ${citation.doi}`;
      }
      
      // Build citation entry
      citationsText += `${citationNumber}. `;
      
      // Add title
      if (citation.title) {
        citationsText += citation.title;
      }
      
      // Add authors
      if (authorsText) {
        citationsText += `\n   ${authorsText}`;
      }
      
      // Add journal and year
      if (journalText) {
        citationsText += `\n   ${journalText}`;
      }
      
      // Add DOI
      if (doiText) {
        citationsText += `\n   ${doiText}`;
      }
      
      // Add source type
      citationsText += `\n   [${sourceType}]`;
      
      // Add URL if available
      if (citation.url && citation.url !== '#') {
        citationsText += `\n   ${citation.url}`;
      }
      
      // Add spacing between citations
      if (index < filteredCitations.length - 1) {
        citationsText += '\n\n';
      }
    });
    
    return citationsText;
  };

  const handleCopyText = async () => {
    if (!answerText || !messageId) return;
    
    setIsCopying(true);
    
    try {
      // Extract HTML directly from the rendered DOM element
      const answerElement = document.getElementById(`answer-content-${messageId}`);
      
      let extractedText = '';
      
      if (answerElement) {
        // Clone to avoid modifying original
        const cloned = answerElement.cloneNode(true) as HTMLElement;
        const htmlContent = cloned.innerHTML;
        
        // Convert HTML to formatted text using html-to-text (formatters API not available in v9)
        try {
          extractedText = convert(htmlContent, {
            wordwrap: false,
            preserveNewlines: true,
            selectors: [
            {
              selector: 'h1, h2, h3, h4, h5, h6',
              options: {
                uppercase: false,
                trailingLineBreaks: 2,
                leadingLineBreaks: 2
              }
            },
            {
              selector: 'ul, ol',
              options: {
                itemPrefix: '',
                leadingLineBreaks: 1,
                trailingLineBreaks: 1
              }
            },
            {
              selector: 'li',
              options: {
                itemPrefix: '• ',
                leadingLineBreaks: 1,
                trailingLineBreaks: 1
              }
            },
            {
              selector: 'p',
              options: {
                leadingLineBreaks: 1,
                trailingLineBreaks: 1
              }
            }
          ]
          });
          
          // Clean up excessive line breaks
          extractedText = extractedText.replace(/\n{3,}/g, '\n\n');
        } catch (convertError) {
          logger.error('Error converting HTML to text:', convertError);
          extractedText = answerText || '';
        }
      } else {
        // Fallback: use original markdown approach if DOM element not found
        logger.warn('Answer content DOM element not found, using fallback');
        extractedText = answerText;
      }
      
      // Legacy function (kept as fallback but simplified)
      const convertMarkdownToCleanText = (markdown: string): string => {
        if (!markdown) return '';
        let cleanText = markdown;
        
        // Convert citation markers like [1], [2], [1,2,3] to superscript numbers
        cleanText = cleanText.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, group) => {
          const numbers = group.split(/\s*,\s*/).map((n: string) => n.trim());
          // Convert numbers to superscript: 1->¹, 2->², 3->³, etc.
          const superscriptMap: { [key: string]: string } = {
            '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
            '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
          };
          return numbers.map(num => 
            num.split('').map(digit => superscriptMap[digit] || digit).join('')
          ).join('');
        });
        
        // Convert bold text (**text** or __text__) - preserve the emphasis with formatting
        cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '$1');
        cleanText = cleanText.replace(/__(.*?)__/g, '$1');
        
        // Convert italic text (*text* or _text_)
        cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
        cleanText = cleanText.replace(/_(.*?)_/g, '$1');
        
        // Process content with heading tracking and proper indentation
        const lines = cleanText.split('\n');
        const processedLines: string[] = [];
        let currentHeadingLevel = -1; // Track if we're inside a heading section (-1 = no heading)
        let currentListIndentation = ''; // Track current list item indentation for continuation lines
        let previousWasListItem = false; // Track if previous processed line was a list item
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          // Check for headings
          const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            const headingLevel = headingMatch[1].length; // Number of # symbols
            const headingText = headingMatch[2];
            currentHeadingLevel = headingLevel;
            currentListIndentation = '';
            previousWasListItem = false;
            processedLines.push(`\n${headingText}\n`);
            continue;
          }
          
          // Check for bullet points: * - or +
          const bulletMatch = line.match(/^(\s*)([\*\-\+])\s+(.+)$/);
          if (bulletMatch) {
            const leadingSpaces = bulletMatch[1];
            const content = bulletMatch[3];
            // Calculate list hierarchy level: every 2 spaces = 1 level, minimum 0
            const listLevel = Math.floor(leadingSpaces.length / 2);
            
            // When under a heading, first-level items (listLevel 0 or 1) should get 1 tab total
            // Nested items (listLevel > 1) should get 1 tab for heading + (listLevel - 1) tabs for nesting
            let tabs = '';
            if (currentHeadingLevel >= 0) {
              // Under heading: first level gets 1 tab, nested gets additional tabs
              if (listLevel <= 1) {
                tabs = '\t'; // Just 1 tab for first-level items under heading
              } else {
                tabs = '\t' + '\t'.repeat(listLevel - 1); // 1 heading tab + (listLevel - 1) nesting tabs
              }
            } else {
              // No heading: use list level directly
              tabs = '\t'.repeat(listLevel);
            }
            
            currentListIndentation = tabs;
            previousWasListItem = true;
            processedLines.push(`${tabs}• ${content}`);
            continue;
          }
          
          // Check for numbered lists: 1. 2. 3. etc.
          const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
          if (numberedMatch) {
            const leadingSpaces = numberedMatch[1];
            const number = numberedMatch[2];
            const content = numberedMatch[3];
            // Calculate list hierarchy level: every 2 spaces = 1 level
            const listLevel = Math.floor(leadingSpaces.length / 2);
            
            // When under a heading, first-level items (listLevel 0 or 1) should get 1 tab total
            // Nested items (listLevel > 1) should get 1 tab for heading + (listLevel - 1) tabs for nesting
            let tabs = '';
            if (currentHeadingLevel >= 0) {
              // Under heading: first level gets 1 tab, nested gets additional tabs
              if (listLevel <= 1) {
                tabs = '\t'; // Just 1 tab for first-level items under heading
              } else {
                tabs = '\t' + '\t'.repeat(listLevel - 1); // 1 heading tab + (listLevel - 1) nesting tabs
              }
            } else {
              // No heading: use list level directly
              tabs = '\t'.repeat(listLevel);
            }
            
            currentListIndentation = tabs;
            previousWasListItem = true;
            processedLines.push(`${tabs}${number}. ${content}`);
            continue;
          }
          
          // Check for empty lines
          if (trimmedLine.length === 0) {
            if (processedLines.length > 0 && processedLines[processedLines.length - 1].trim() !== '') {
              processedLines.push('');
            }
            // Don't reset previousWasListItem on empty lines - they might be paragraph breaks
            continue;
          }
          
          // Handle continuation lines and regular text
          let processedLine = trimmedLine.replace(/[ ]{2,}/g, ' '); // Clean up multiple spaces
          
          // Primary check: If we have list context (previous was list item), treat as continuation
          const shouldIndentAsContinuation = previousWasListItem && currentListIndentation;
          
          if (shouldIndentAsContinuation && trimmedLine.length > 0) {
            // This is a continuation line of a list item - use the same indentation level
            // Align with the content of the list item (list indentation + tab for bullet/number space)
            processedLine = currentListIndentation + '\t' + processedLine;
            // CRITICAL: Keep previousWasListItem true so ALL subsequent continuation lines also get indented
            // This ensures multi-line wrapped text maintains proper indentation
            previousWasListItem = true; // Maintain continuation chain
            // Also keep currentListIndentation for nested continuations
          } else if (currentHeadingLevel >= 0 && !previousWasListItem && trimmedLine.length > 0) {
            // Regular text line after a heading (not in a list), indent it
            processedLine = '\t' + processedLine;
            previousWasListItem = false;
            currentListIndentation = '';
          } else if (trimmedLine.length > 0) {
            // Check if this is a clear new section (would break continuation)
            const previousLine = processedLines.length > 0 ? processedLines[processedLines.length - 1] : '';
            const looksLikeNewSection = /^[A-Z][^a-z]*:/.test(trimmedLine) && previousLine.trim() === '';
            
            if (looksLikeNewSection) {
              // Clear break - reset context
              previousWasListItem = false;
              currentListIndentation = '';
            } else if (previousWasListItem && currentListIndentation) {
              // Still in continuation context (e.g., after empty line) - apply indentation
              processedLine = currentListIndentation + '\t' + processedLine;
              previousWasListItem = true; // Keep chain alive
            } else {
              // Not a continuation - reset context
              previousWasListItem = false;
              currentListIndentation = '';
            }
          }
          
          processedLines.push(processedLine);
        }
        
        cleanText = processedLines.join('\n');
        
        // Clean up excessive line breaks but preserve paragraph separation
        cleanText = cleanText.replace(/\n{4,}/g, '\n\n\n'); // Limit to max 3 line breaks
        cleanText = cleanText.replace(/\n\s*\n\s*\n\s*\n/g, '\n\n\n'); // Clean up spacing
        
        // Clean up multiple spaces but preserve tabs (don't replace tabs)
        cleanText = cleanText.replace(/[ ]{2,}/g, ' '); // Only reduce multiple spaces to single space, preserve tabs
        
        // Trim the entire text but preserve internal structure
        return cleanText.trim();
      };
      
      // Use extracted text from DOM, or fallback to markdown conversion
      const cleanText = extractedText || convertMarkdownToCleanText(answerText);
      
      // Add citations if available
      let answerWithCitations = cleanText;
      if (citations && Object.keys(citations).length > 0) {
        const citationsList = formatCitationsForCopy(citations);
        answerWithCitations = cleanText + '\n\n' + citationsList;
      }
      
      // Generate public link if user is available
      let publicLink = '';
      if (user && conversationId) {
        try {
          const db = getFirebaseFirestore();
          const userId = user.uid || user.id;

          // Get the current chat session data
          const sessionDocRef = doc(db, "conversations", conversationId);
          const sessionDoc = await getDoc(sessionDocRef);
          
          if (sessionDoc.exists()) {
            const sessionData = sessionDoc.data();
            
            // Get all threads for this session
            const threadsRef = collection(db, "conversations", conversationId, "threads");
            const threadsQueryRef = firestoreQuery(threadsRef, orderBy("user_message.timestamp"));
            const threadsSnapshot = await getDocs(threadsQueryRef);
            
            const threads: any[] = [];
            threadsSnapshot.forEach((threadDoc) => {
              const threadData = threadDoc.data();
              // Clean the data to remove any undefined or null values
              const cleanThread = {
                user_message: {
                  content: threadData.user_message?.content || '',
                  timestamp: threadData.user_message?.timestamp || Date.now()
                },
                bot_response: {
                  content: threadData.bot_response?.content || '',
                  citations: threadData.bot_response?.citations || {},
                  search_data: threadData.bot_response?.search_data || {},
                  svg_content: threadData.bot_response?.svg_content || []
                },
                context: {
                  parent_thread_id: threadData.context?.parent_thread_id || null
                }
              };
              threads.push(cleanThread);
            });

            // Create public chat document
            const publicChatData = {
              original_session_id: conversationId,
              user_id: userId,
              user_email: user.email || '',
              title: sessionData.title || 'Shared Chat',
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
              threads: threads,
              is_public: true
            };

            const publicChatRef = await addDoc(collection(db, "public_chats"), publicChatData);
            
            // Generate shareable link
            publicLink = `${window.location.origin}/dashboard/public/${publicChatRef.id}`;
            
            logger.debug('Public link generated for copy:', publicChatRef.id);
          }
        } catch (error) {
          logger.error('Error generating public link for copy:', error);
          // Continue without the link if there's an error
        }
      }
      
      // Format the final text with link and answer
      let finalText = '';
      if (publicLink) {
        finalText = `Link to the answer in DR. INFO: ${publicLink}\n\n${answerWithCitations}`;
      } else {
        finalText = answerWithCitations;
      }
      
      await navigator.clipboard.writeText(finalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy:', error);
    } finally {
      setIsCopying(false);
    }
  };

  // Helper for feedback button style
  const feedbackBtnStyle = (option: string) => {
    if (selectedFeedback.includes(option)) {
      return 'border-[#3771FE] text-[#3771FE] bg-white';
    }
    return 'border-[#C8C8C8] text-[#223258] bg-white';
  };

  // Helper for top row button style
  const topBtnStyle = (type: 'helpful' | 'not_helpful') => {
    if (showForm === type) {
      return 'border-[#3771FE] text-[#3771FE] bg-white';
    }
    if (submittedFeedback[type === 'helpful' ? 'helpful' : 'not_helpful']) {
      return 'border-[#C8C8C8] text-[#C8C8C8] bg-gray-50 cursor-not-allowed';
    }
    return 'border-[#C8C8C8] text-[#223258] bg-white';
  };

  const hasValidText = (text: string) => {
    const words = text.trim().split(/\s+/);
    return words.some(word => word.length >= 4);
  };

  const canSubmit = () => {
    return selectedFeedback.length > 0 || hasValidText(feedbackText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) {
      setValidationMessage('Please select at least one option or provide feedback with at least one word (4+ characters)');
      // Clear message after 2 seconds
      setTimeout(() => {
        setValidationMessage('');
      }, 2000);
      return;
    }
    setValidationMessage('');
    saveFeedback();
  };

  return (
    <div className="mt-4 max-w-[684px] drinfo-feedback-step">
      {/* Top row: Helpful, Not helpful, Copy */}
      <div ref={buttonContainerRef} className="flex flex-row items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="relative h-8 sm:h-10 w-24 sm:w-32 overflow-hidden bg-transparent p-[1px] rounded-lg">
          <div className="absolute inset-0">
            <MovingBorder duration={3000} rx="8px" ry="8px" delay={0}>
              <div className="h-8 w-20 bg-[radial-gradient(#3771FE_40%,transparent_60%)] opacity-[0.8]" />
            </MovingBorder>
          </div>
          <button
            onClick={() => handleFeedbackClick('helpful')}
            className={cn(
              "relative flex h-full w-full items-center justify-center border rounded-lg transition-all",
              topBtnStyle('helpful')
            )}
            aria-label="Helpful"
            title={submittedFeedback.helpful ? "You've already submitted helpful feedback" : "This answer was helpful"}
            disabled={submittedFeedback.helpful}
          >
            <ThumbsUp className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span className="text-xs sm:text-sm">Useful...</span>
          </button>
        </div>

        <div className="relative h-8 sm:h-10 w-24 sm:w-32 overflow-hidden bg-transparent p-[1px] rounded-lg">
          <div className="absolute inset-0">
            <MovingBorder duration={3000} rx="8px" ry="8px" delay={1500}>
              <div className="h-8 w-20 bg-[radial-gradient(#3771FE_40%,transparent_60%)] opacity-[0.8]" />
            </MovingBorder>
          </div>
          <button
            onClick={() => handleFeedbackClick('not_helpful')}
            className={cn(
              "relative flex h-full w-full items-center justify-center border rounded-lg transition-all",
              topBtnStyle('not_helpful')
            )}
            aria-label="Not helpful"
            title={submittedFeedback.not_helpful ? "You've already submitted not helpful feedback" : "This answer wasn't helpful"}
            disabled={submittedFeedback.not_helpful}
          >
            <ThumbsDown className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span className="text-xs sm:text-sm">Not Useful...</span>
          </button>
        </div>

        <button
          onClick={handleCopyText}
          disabled={isCopying}
          className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border transition-all flex items-center gap-1 sm:gap-2 ${copied ? 'text-[#3771FE] border-[#3771FE]' : 'text-[#223258] border-[#223258]'} bg-white disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Copy text"
          title="Copy answer text"
        >
          {isCopying ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-[#223258]"></div>
              <span className="text-xs sm:text-sm">Copying...</span>
            </>
          ) : copied ? (
            <>
              <Check size={14} className="text-[#3771FE] sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} className="text-[#223258] sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Copy</span>
            </>
          )}
        </button>

        {/* Reload Button */}
        {onReload && (
          <button
            onClick={() => {
              track.drinfoSummaryClickedRetry('drinfo-summary');
              onReload();
            }}
            disabled={isReloading}
            className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#223258] text-[#223258] bg-white transition-all flex items-center gap-1 sm:gap-2 hover:border-[#3771FE] hover:text-[#3771FE] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Retry answer"
            title="Retry this answer"
          >
            {isReloading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-[#3771FE]"></div>
                <span className="text-xs sm:text-sm">Retrying...</span>
              </>
            ) : (
              <>
                <RotateCcw size={14} className="text-[#223258] sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">Retry</span>
              </>
            )}
          </button>
        )}
      </div>
      {/* Feedback form appears only after clicking Helpful/Not helpful */}
      {showForm && !thankYou && (
        <div ref={feedbackFormRef} className="border border-[#C8C8C8] rounded-lg p-3 sm:p-6 bg-white">
          <form onSubmit={handleSubmit}>
            <div className="mb-3 sm:mb-4">
              <div className="font-semibold mb-2 text-sm sm:text-base" style={{ color: '#62739B' }}>Why was this answer {showForm === 'helpful' ? 'useful' : 'not useful'}?</div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                {(showForm === 'helpful' ? FEEDBACK_OPTIONS_HELPFUL : FEEDBACK_OPTIONS_NOT_HELPFUL).map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`px-2 sm:px-3 py-1 rounded-lg border text-xs sm:text-sm transition-colors duration-100 ${feedbackBtnStyle(option)}`}
                    onClick={() => toggleFeedback(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2 mt-2 text-sm sm:text-base"
                style={{ 
                  backgroundColor: 'rgba(238,243,255,0.5)',
                  color: '#62739B'
                }}
                rows={3}
                placeholder="Tell us more about your experience"
                value={feedbackText}
                onChange={e => {
                  setFeedbackText(e.target.value);
                  setValidationMessage('');
                }}
              ></textarea>
              <style jsx>{`
                textarea::placeholder {
                  color: #8997BA;
                }
              `}</style>
              <div className="text-center mb-3 sm:mb-4 text-xs sm:text-sm" style={{ color: '#8997BA' }}>
                Your feedback can helps us improve our answers
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg border border-[#C8C8C8] text-[#223258] bg-white text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm"
                style={{
                  backgroundColor: '#C6D7FF',
                  color: '#214498',
                  border: '1px solid rgba(55, 113, 254, 0.5)'
                }}
                disabled={isSubmitting}
              >
                Submit
              </button>
            </div>
            {validationMessage && (
              <div className="text-center text-red-500 text-xs sm:text-sm mt-2">
                {validationMessage}
              </div>
            )}
          </form>
        </div>
      )}
      {/* Thank you message after submit */}
      {thankYou && (
        <div className="mt-3 sm:mt-4 font-semibold text-sm sm:text-base" style={{ color: '#8997BA' }}>Thank you for your feedback!</div>
      )}
    </div>
  );
}