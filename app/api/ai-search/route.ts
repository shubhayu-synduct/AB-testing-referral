import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// AI Service API base URL
// const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000';
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'https://synduct-drug-ai-summary.drinfo.ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, mode } = body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    logger.info(`AI search API route called with query: ${query}`);

    try {
      // Forward the request to the AI service search endpoint
      const backendResponse = await fetch(`${AI_API_URL}/api/ai-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          mode: mode || 'ai'
        }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        logger.error(`Backend AI search failed: ${backendResponse.status} ${errorText}`);
        
        // Return fallback response instead of error
        return NextResponse.json({
          status: 'fallback',
          results: [{
            name: `Search results for "${query}"`,
            brand_name: query,
            active_substance: ['AI search service is currently being configured'],
            details: `We're working on setting up our AI search capabilities. In the meantime, please try searching for "${query}" in EMA mode for official drug information.`,
            url: '',
            source_type: 'fallback'
          }],
          query: query,
          mode: mode,
          total_results: 1,
          message: 'AI search service is being configured. Please use EMA mode for now.'
        });
      }

      const data = await backendResponse.json();
      logger.info(`AI search completed successfully for query: ${query}`);
      
      return NextResponse.json(data);

    } catch (fetchError) {
      logger.error('Backend connection error:', fetchError);
      
      // Return fallback response for connection issues
      return NextResponse.json({
        status: 'fallback',
        results: [{
          name: `Search results for "${query}"`,
          brand_name: query,
          active_substance: ['AI search service is temporarily unavailable'],
          details: `Our AI search service is temporarily unavailable. Please try searching for "${query}" in EMA mode for official European Medicines Agency drug information.`,
          url: '',
          source_type: 'fallback'
        }],
        query: query,
        mode: mode,
        total_results: 1,
        message: 'AI search temporarily unavailable. Please use EMA mode.'
      });
    }

  } catch (error) {
    logger.error('Error in AI search API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}