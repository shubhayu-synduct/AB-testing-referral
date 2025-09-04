import ReactMarkdown from 'react-markdown';
import React, { useEffect, useState, useRef } from 'react';
import remarkGfm from "remark-gfm";
import rehypeRaw from 'rehype-raw';

// Add type declaration for window.handleCitationClick
declare global {
  interface Window {
    handleCitationClick?: (citation: string, index?: number) => void;
    messageDataStore?: Map<string, { sources: Record<string, string>, page_references: Record<string, Array<{ start_word: string; end_word: string }>> }>;
  }
}

interface GuidelineMarkdownProps {
  content: string | null;
  sources: Record<string, string> | null;
  pageReferences?: Record<string, Array<{start_word: string, end_word: string}>> | null;
  onCitationClick?: (citation: string, index?: number, messageData?: { sources: Record<string, string>, page_references: Record<string, Array<{ start_word: string; end_word: string }>> }) => void;
  messageData?: { sources: Record<string, string>, page_references: Record<string, Array<{ start_word: string; end_word: string }>> };
  messageId?: string;
}

export const GuidelineMarkdown = ({ 
  content, 
  sources, 
  pageReferences,
  onCitationClick,
  messageData,
  messageId
}: GuidelineMarkdownProps) => {
  const [processedContent, setProcessedContent] = useState<string>('');
  const citationCountsRef = useRef<Record<string, number>>({});
  
  // Initialize global message data store
  useEffect(() => {
    if (!window.messageDataStore) {
      window.messageDataStore = new Map();
    }
    if (messageId && messageData) {
      window.messageDataStore.set(messageId, messageData);
    }
  }, [messageId, messageData]);
  
  // Process entire markdown content at once
  const processMarkdownWithCitations = (text: string, currentSources: Record<string, string> | null) => {
    // Reset citation counts for the entire document
    citationCountsRef.current = {};
    
    const result = text.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, nums, offset) => {
      const numbers = nums.split(',').map((n: string) => n.trim());
      return numbers.map((num: string) => {
        if (!currentSources || !currentSources[num]) return num;
        
        // Get current count for this citation in the entire document
        const currentCount = citationCountsRef.current[num] || 0;
        citationCountsRef.current[num] = currentCount + 1;
        
        // Index is the current count (zero-based index)
        const index = currentCount;
        
        // Create unique identifier based on position and citation number
        const uniqueId = `${num}_${offset}_${index}`;
        
        return `<span 
          class="reference-number"
          data-ref-number="${num}"
          data-occurrence-index="${index}"
          data-unique-id="${uniqueId}"
          data-message-id="${messageId || ''}"
          role="button"
          tabindex="0"
        >${num}</span>`;
      }).join(' ');
    });
    
    return result;
  };

  useEffect(() => {
    // Process the entire markdown content when it changes
    if (content) {
      const processed = processMarkdownWithCitations(content, sources);
      setProcessedContent(processed);
    }
  }, [content, sources]);

  useEffect(() => {
    // Set up event delegation for citation clicks
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('reference-number')) {
        const refNumber = target.getAttribute('data-ref-number');
        const occurrenceIndex = target.getAttribute('data-occurrence-index');
        const clickedMessageId = target.getAttribute('data-message-id');
        
        if (refNumber) {
          const index = occurrenceIndex ? parseInt(occurrenceIndex, 10) : undefined;
          // Get the correct messageData from the global store
          const correctMessageData = clickedMessageId && window.messageDataStore 
            ? window.messageDataStore.get(clickedMessageId) 
            : messageData;
          console.log('Citation clicked:', { refNumber, index, clickedMessageId, correctMessageData });
          onCitationClick?.(refNumber, index, correctMessageData);
        }
      }
    };

    // Add event listener to the document
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [onCitationClick, messageData]);

  if (!content) return null;

  return (
    <div id="markdown-content" className="guideline-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          table: ({ children }) => (
            <table className="w-full border-collapse border border-gray-300">{children}</table>
          ),
          thead: ({ children }) => <thead className="bg-gray-200">{children}</thead>,
          tbody: ({ children }) => <tbody className="bg-white">{children}</tbody>,
          tr: ({ children }) => <tr className="border border-gray-300">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 border border-gray-300 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-2 border border-gray-300">{children}</td>,
          h1: ({ children }) => <h1 className="heading-1">{children}</h1>,
          h2: ({ children }) => <h2 className="heading-2">{children}</h2>,
          h3: ({ children }) => <h3 className="heading-3">{children}</h3>,
          h4: ({ children }) => <h4 className="heading-4">{children}</h4>,
          h5: ({ children }) => <h5 className="heading-5">{children}</h5>,
          h6: ({ children }) => <h6 className="heading-6">{children}</h6>,
          p: ({ children }) => <p className="markdown-paragraph">{children}</p>,
          li: ({ children }) => <li className="mb-2">{children}</li>,
          strong: ({ children }) => <strong>{children}</strong>,
          ul: ({ children }) => <ul className="ml-4 pl-2 list-disc space-y-2 mb-4">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 pl-2 list-decimal space-y-2 mb-4">{children}</ol>,
          a: ({ node, ...props }) => <a {...props} onClick={(e) => e.preventDefault()} className="guideline-title-link" />,
        }}
      >
        {processedContent}
      </ReactMarkdown>

      <style jsx global>{`
        .reference-number {
          text-decoration: none;
          color: #223258;
          background: #E0E9FF;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.6rem;
          font-family: 'DM Sans', sans-serif;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          padding: 0;
          margin: 0 2px;
          gap: 2px;
          vertical-align: super;
          position: relative;
          top: -2px;
        }
        
        .reference-number:hover {
          text-decoration: underline;
          color: #1c7ed6;
        }
        
        /* Heading styles */
        .heading-1, .heading-2, .heading-3, .heading-4, .heading-5, .heading-6 {
          font-size: 1rem; /* 16px */
          font-weight: 600; /* Semi-bold */
          font-family: 'DM Sans', sans-serif;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #214498;
        }
        
        /* Make sure paragraph and inline elements display properly */
        .markdown-paragraph {
          display: block;
          margin-bottom: 1rem;
          font-size: 1rem; /* 16px */
          font-family: 'DM Sans', sans-serif;
          font-weight: 400; /* Regular */
        }
        
        #markdown-content p {
          display: inline !important;
          margin: 0;
          font-size: 1rem; /* 16px */
          font-family: 'DM Sans', sans-serif;
          font-weight: 400; /* Regular */
        }
        
        /* Ensure headings in markdown render properly */
        #markdown-content h1, 
        #markdown-content h2, 
        #markdown-content h3, 
        #markdown-content h4, 
        #markdown-content h5, 
        #markdown-content h6 {
          display: block;
          margin-top: 0;
          margin-bottom: 0;
          font-weight: 600; /* Semi-bold */
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem; /* 16px */
          color: #214498;
        }
        
        /* Fix list items to display properly with inline citations */
        #markdown-content ul,
        #markdown-content ol {
          display: block;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          padding-left: 1.5em;
          font-size: 1rem; /* 16px */
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
        }
        
        #markdown-content li {
          display: list-item;
          margin-bottom: 0.5em;
          font-size: 1rem; /* 16px */
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
        }
        
        #markdown-content li strong {
          font-size: 1rem; /* 16px */
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
        }
        
        #markdown-content li p {
          display: inline !important;
        }
        
        #markdown-content br {
          display: block;
          content: "";
          margin-top: 0.5em;
        }

        /* Set bullet color for markdown lists */
        #markdown-content ul > li::marker,
        #markdown-content ol > li::marker {
          color: #214498;
        }

        .guideline-title-link {
          color: #273561;
          cursor: pointer;
          transition: color 0.2s;
        }

        .guideline-title-link:hover {
          color: #3771FE !important;
        }

        /* Override prose font weight for normal text */
        .prose p, .prose span, .prose li, .prose div {
          font-weight: 400 !important;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          font-weight: 700 !important;
        }

        /* HTML table styling to match markdown tables */
        #markdown-content table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #d1d5db;
          margin: 1rem 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem;
        }

        #markdown-content table thead {
          background-color: #f3f4f6;
        }

        #markdown-content table tbody {
          background-color: white;
        }

        #markdown-content table tr {
          border: 1px solid #d1d5db;
        }

        #markdown-content table th {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          text-align: left;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem;
        }

        #markdown-content table td {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem;
        }

        /* Styling for markdown formatting within HTML tables */
        #markdown-content table strong {
          font-weight: 700;
          color: #1e293b;
        }

        #markdown-content table em {
          font-style: italic;
          color: #475569;
        }

        #markdown-content table strong em {
          font-weight: 700;
          font-style: italic;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
}; 