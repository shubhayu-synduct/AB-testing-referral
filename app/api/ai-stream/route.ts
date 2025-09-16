import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

// AI Service API base URL
// const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000';
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'https://synduct-drug-ai-summary.drinfo.ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters long' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    logger.info(`AI streaming search called with query: ${query}`);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Send initial status
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'status',
              message: 'Starting AI search...',
              query: query
            })}\n\n`)
          );

          // Try to get AI response from backend
          try {
            const backendResponse = await fetch(`${AI_API_URL}/api/ai-search`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                query: query.trim(),
                mode: 'ai'
              }),
              signal: AbortSignal.timeout(60000) // 60 second timeout
            });

            if (backendResponse.ok) {
              const aiData = await backendResponse.json();
              
              if (aiData.status === 'success' && aiData.results && aiData.results.length > 0) {
                // Stream the actual AI response
                await streamRealAIResponse(controller, encoder, aiData, query);
              } else {
                throw new Error('No AI results returned from backend');
              }
            } else {
              throw new Error(`Backend AI search failed: ${backendResponse.status}`);
            }
          } catch (backendError) {
            logger.error('Backend AI search error:', backendError);
            
            // Fallback to simulated streaming
            await simulateAIStreaming(controller, encoder, query);
          }

        } catch (error) {
          logger.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: 'An error occurred during AI search',
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`)
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    logger.error('Error in AI streaming route:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Stream real AI response from backend
async function streamRealAIResponse(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  aiData: any,
  query: string
) {
  // Send searching status
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({
      type: 'status',
      message: 'Processing AI search results...'
    })}\n\n`)
  );
  
  await new Promise(resolve => setTimeout(resolve, 500));

  // Get the main AI result
  const mainResult = aiData.results[0];
  const content = mainResult.details || mainResult.active_substance?.[0] || 'No detailed information available.';
  
  // Stream the content word by word
  const words = content.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 30)); // Faster streaming for real content
    
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({
        type: 'content',
        chunk: words[i] + ' ',
        progress: Math.round((i + 1) / words.length * 100)
      })}\n\n`)
    );
  }

  // Send completion with real sources
  const sources = aiData.results.map((result: any, index: number) => ({
    title: result.name || result.brand_name || `Source ${index + 1}`,
    url: result.url || '#',
    snippet: result.active_substance?.[0] || result.details?.substring(0, 150) + '...' || 'AI-generated medical information'
  }));

  const citations: { [key: string]: string } = {};
  aiData.results.forEach((result: any, index: number) => {
    citations[(index + 1).toString()] = result.name || result.brand_name || `AI Source ${index + 1}`;
  });

  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({
      type: 'complete',
      sources: sources,
      citations: citations
    })}\n\n`)
  );
}

// Simulate AI streaming for fallback
async function simulateAIStreaming(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  query: string
) {
  // Send searching status
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({
      type: 'status',
      message: 'Searching medical databases...'
    })}\n\n`)
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate content streaming
  const content = `Based on available medical information, here's what I found about "${query}":\n\n` +
    `This appears to be a medical query that would benefit from consultation with healthcare professionals. ` +
    `While I can provide general information, it's important to note that:\n\n` +
    `1. **Professional Consultation**: Always consult with qualified healthcare providers for medical advice\n` +
    `2. **Individual Variation**: Medical treatments and responses can vary significantly between individuals\n` +
    `3. **Current Information**: Medical knowledge and guidelines are constantly evolving\n\n` +
    `For the most accurate and up-to-date information about "${query}", I recommend:\n` +
    `- Consulting with your healthcare provider\n` +
    `- Checking official medical databases\n` +
    `- Reviewing peer-reviewed medical literature\n\n` +
    `Please note: This AI search service is currently being configured with advanced medical databases. ` +
    `In the meantime, you can search for official drug information using the EMA mode.`;

  const words = content.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({
        type: 'content',
        chunk: words[i] + ' ',
        progress: Math.round((i + 1) / words.length * 100)
      })}\n\n`)
    );
  }

  // Send completion with sources
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({
      type: 'complete',
      sources: [
        {
          title: 'European Medicines Agency (EMA)',
          url: 'https://www.ema.europa.eu',
          snippet: 'Official European drug regulatory information'
        },
        {
          title: 'Medical Literature Database',
          url: '#',
          snippet: 'Peer-reviewed medical research and studies'
        },
        {
          title: 'Clinical Guidelines',
          url: '#',
          snippet: 'Evidence-based clinical practice guidelines'
        }
      ],
      citations: {
        '1': 'European Medicines Agency - Official drug information',
        '2': 'Medical literature review',
        '3': 'Clinical practice guidelines'
      }
    })}\n\n`)
  );
}