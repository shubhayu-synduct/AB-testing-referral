import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// EMA Service API base URL (port 8002)
// const EMA_API_URL = process.env.NEXT_PUBLIC_EMA_API_URL || 'http://localhost:8002';
const EMA_API_URL = process.env.NEXT_PUBLIC_EMA_API_URL || 'https://synduct-drugsummary.drinfo.ai';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '10';
    const database = searchParams.get('database');

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    logger.info(`EMA search API route called with query: ${query}`);

    // Get authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Build the backend URL with query parameters
    const backendParams = new URLSearchParams({
      q: query.trim(),
      limit: limit
    });
    
    if (database) {
      backendParams.set('database', database);
    }

    try {
      // Forward the request to the EMA service search endpoint
      const backendResponse = await fetch(`${EMA_API_URL}/api/search?${backendParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        logger.error(`Backend EMA search failed: ${backendResponse.status} ${errorText}`);
        
        return NextResponse.json(
          { error: `EMA search failed: ${backendResponse.status}` },
          { status: backendResponse.status }
        );
      }

      const data = await backendResponse.json();
      logger.info(`EMA search completed successfully for query: ${query}`);
      
      return NextResponse.json(data);
      
    } catch (backendError: any) {
      logger.error('Backend EMA search error:', backendError);
      
      return NextResponse.json(
        { 
          error: 'EMA search service temporarily unavailable',
          message: 'EMA search temporarily unavailable. Please try again later.'
        },
        { status: 503 }
      );
    }
    
  } catch (error) {
    logger.error('Error in EMA search API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}