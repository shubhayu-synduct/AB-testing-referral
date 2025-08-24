"use client"

import { logger } from './logger';

// API base URL for Drug Summary service
// const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000';
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'https://synduct-drug-ai-summary.drinfo.ai';
const DRUG_SUMMARY_API_URL = `${AI_API_URL}/api/drug-summary`;

export interface Citation {
  title: string;
  url: string;
  year?: string | number;
  authors?: string[];
  source_type?: string;
  journal?: string;
  doi?: string;
  drug_citation_type?: string;
}

export interface DrugSummaryData {
  short_summary?: string;
  processed_content?: string;
  citations?: Record<string, Citation>;
  session_id?: string;
}

export interface StreamingResponse {
  status: string;
  session_id?: string;
  message?: string;
  data?: string | DrugSummaryData;
}

interface DrugSummaryOptions {
  sessionId?: string;
  userId?: string;
  stream?: boolean;
}

/**
 * Fetches drug information from the local drug summary API with streaming support
 */
export async function fetchDrugSummary(
  query: string,
  onChunk: (chunk: string) => void,
  onStatus: (status: string, message?: string) => void,
  onComplete: (data: DrugSummaryData) => void,
  options?: DrugSummaryOptions
): Promise<void> {
  try {
    logger.info(`[DrugSummary] Starting request for query: ${query}`);
    onStatus('connecting', 'Connecting to drug summary service...');

    const requestBody = {
      query: query.trim(),
      session_id: options?.sessionId,
      stream: true
    };

    logger.debug('[DrugSummary] Request body:', requestBody);

    const response = await fetch(DRUG_SUMMARY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    onStatus('streaming', 'Receiving drug information...');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse: DrugSummaryData = {};
    let accumulatedContent = '';
    let hasCalledComplete = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          logger.info('[DrugSummary] Stream completed');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6); // Remove 'data: ' prefix
          if (!payload.trim()) continue;

          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(payload) as StreamingResponse;
            logger.debug('[DrugSummary] Parsed SSE JSON:', parsed.status);

            if (parsed.status === 'processing' || parsed.status === 'summarizing') {
              onStatus(parsed.status, parsed.message);
            } else if (parsed.status === 'chunk' && typeof parsed.data === 'string') {
              accumulatedContent += parsed.data;
              onChunk(parsed.data);
            } else if (parsed.status === 'complete' && parsed.data && typeof parsed.data === 'object') {
              const completeData = parsed.data as DrugSummaryData;
              // Ensure session id is captured from header if not present in payload
              completeData.session_id = completeData.session_id || response.headers.get('X-Session-ID') || options?.sessionId;
              if (!hasCalledComplete) {
                hasCalledComplete = true;
                onComplete(completeData);
              }
            } else if (parsed.data && typeof parsed.data === 'object' && (parsed.data as DrugSummaryData).citations) {
              // Surface citations early when available
              const citationData = parsed.data as DrugSummaryData;
              citationData.session_id = citationData.session_id || response.headers.get('X-Session-ID') || options?.sessionId;
              if (!hasCalledComplete) {
                hasCalledComplete = true;
                onComplete(citationData);
              }
            } else if (typeof parsed.data === 'string') {
              // Fallback if backend sends string data without explicit status=chunk
              accumulatedContent += parsed.data;
              onChunk(parsed.data);
            } else {
              // Unhandled statuses can be logged
              logger.debug('[DrugSummary] Unhandled status payload:', parsed.status);
            }
          } catch {
            // Not JSON: treat as raw text content
            accumulatedContent += payload;
            onChunk(payload);
            logger.debug(`[DrugSummary] Raw chunk received: ${payload.length} chars`);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        if (buffer.startsWith('data: ')) {
          const content = buffer.slice(6);
          if (content.trim()) {
            try {
              const parsed = JSON.parse(content) as StreamingResponse;
              if (parsed.status === 'complete' && parsed.data && typeof parsed.data === 'object') {
                const completeData = parsed.data as DrugSummaryData;
                completeData.session_id = completeData.session_id || response.headers.get('X-Session-ID') || options?.sessionId;
                if (!hasCalledComplete) {
                  hasCalledComplete = true;
                  onComplete(completeData);
                }
              } else if (parsed.status === 'chunk' && typeof parsed.data === 'string') {
                accumulatedContent += parsed.data;
                onChunk(parsed.data);
              } else if (typeof parsed.data === 'string') {
                accumulatedContent += parsed.data;
                onChunk(parsed.data);
              }
            } catch {
              accumulatedContent += content;
              onChunk(content);
            }
          }
        }
      }

      // If no structured complete payload was received, fallback to accumulated content
      if (!hasCalledComplete) {
        fullResponse = {
          processed_content: accumulatedContent,
          session_id: response.headers.get('X-Session-ID') || options?.sessionId,
          citations: fullResponse.citations || {}
        };
        onStatus('completed', 'Drug information received successfully');
        onComplete(fullResponse);
      } else {
        onStatus('completed', 'Drug information received successfully');
      }
      
      logger.info('[DrugSummary] Request completed successfully');
      
    } catch (streamError) {
      logger.error('[DrugSummary] Stream processing error:', streamError);
      throw streamError;
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    logger.error('[DrugSummary] Error in fetchDrugSummary:', error);
    onStatus('error', `Failed to fetch drug information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Send a follow-up question about the drug
 */
export async function sendDrugFollowUpQuestion(
  question: string,
  sessionId: string,
  onChunk: (chunk: string) => void,
  onStatus: (status: string, message?: string) => void,
  onComplete: (data: DrugSummaryData) => void
): Promise<void> {
  logger.info(`[DrugSummary] Sending follow-up question: ${question}`);
  
  await fetchDrugSummary(
    question,
    onChunk,
    onStatus,
    onComplete,
    { sessionId, stream: true }
  );
}