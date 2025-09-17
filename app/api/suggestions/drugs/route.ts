import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

// Server-side only API key (no NEXT_PUBLIC_ prefix)
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('NEXT_PUBLIC_GEMINI_API_KEY is not configured');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('GEMINI')));
}

let ai: GoogleGenAI | null = null;
try {
  ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
} catch (initError) {
  console.error('Failed to initialize GoogleGenAI:', initError);
}

export async function POST(request: NextRequest) {
  try {
    if (!ai) {
      return NextResponse.json(
        { error: 'Gemini API is not configured' },
        { status: 500 }
      );
    }

    const { query, previousQueries = [] } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate query length
    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Query too long' },
        { status: 400 }
      );
    }

    const prompt = `You are a drug name autocomplete system for pharmaceutical search. Given the partial query: "${query}", suggest 3 complete drug names or drug-related terms that start with or contain this text.

Previous queries to avoid duplicating: ${previousQueries.join(', ')}

Focus specifically on:
- Generic drug names (INN - International Nonproprietary Names)
- Brand/trade names of medications
- Drug classes and categories (e.g., "ACE inhibitors", "beta blockers")
- Pharmaceutical formulations (e.g., "extended release", "immediate release")
- Drug combinations (e.g., "amlodipine/valsartan")
- Complete the partial input naturally for drug searches

Prioritize:
1. Exact drug name matches first
2. Common medications that healthcare professionals frequently search
3. Both generic and brand names when relevant
4. Drug classes if the query suggests category search

Examples:
- "para" → ["paracetamol", "paroxetine", "paracetamol/codeine"]
- "metf" → ["metformin", "metformin XR", "metformin/sitagliptin"]
- "beta" → ["beta blockers", "betamethasone", "betaxolol"]

IMPORTANT: Return ONLY a valid JSON array of exactly 3 strings. No markdown formatting, no code blocks, no additional text, no explanations. Just the raw JSON array.

Example format: ["paracetamol", "paroxetine", "paracetamol/codeine"]

Each suggestion should be a complete drug name, brand name, or drug-related term.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates in response');
    }
    
    const text = response.candidates[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Clean the response text by removing markdown code blocks and extra formatting
    let cleanText = text.trim();
    
    // Remove markdown code blocks if present
    cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    cleanText = cleanText.replace(/```\s*/, '').replace(/```\s*$/, '');
    
    // Remove any leading/trailing whitespace
    cleanText = cleanText.trim();
    
    try {
      const suggestions = JSON.parse(cleanText);
      
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }
      
      // Ensure we have exactly 3 suggestions and they are strings
      const validSuggestions = suggestions
        .filter(s => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 3);
      
      if (validSuggestions.length === 0) {
        throw new Error('No valid suggestions found');
      }
      
      // Pad with drug-specific suggestions if needed
      while (validSuggestions.length < 3) {
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('para')) {
          validSuggestions.push('paracetamol');
        } else if (lowerQuery.includes('met')) {
          validSuggestions.push('metformin');
        } else if (lowerQuery.includes('asp')) {
          validSuggestions.push('aspirin');
        } else {
          validSuggestions.push(`${query} tablets`);
        }
      }

      return NextResponse.json({ suggestions: validSuggestions });
    } catch (parseError) {
      logger.error('Failed to parse AI response:', { text: cleanText, error: parseError });
      
      // Return drug-specific fallback suggestions
      const lowerQuery = query.toLowerCase();
      let fallbackSuggestions;
      
      if (lowerQuery.includes('para')) {
        fallbackSuggestions = ['paracetamol', 'paroxetine', 'paracetamol/codeine'];
      } else if (lowerQuery.includes('met')) {
        fallbackSuggestions = ['metformin', 'metoprolol', 'metronidazole'];
      } else if (lowerQuery.includes('asp')) {
        fallbackSuggestions = ['aspirin', 'aspartame', 'aspirin/clopidogrel'];
      } else if (lowerQuery.includes('beta')) {
        fallbackSuggestions = ['beta blockers', 'betamethasone', 'betaxolol'];
      } else if (lowerQuery.includes('ace')) {
        fallbackSuggestions = ['ACE inhibitors', 'acetaminophen', 'acebutolol'];
      } else {
        fallbackSuggestions = [
          `${query} tablets`,
          `${query} injection`,
          `${query} capsules`
        ];
      }
      
      return NextResponse.json({ suggestions: fallbackSuggestions });
    }
  } catch (error) {
    console.error('Error generating drug suggestions:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      apiKeyExists: !!GEMINI_API_KEY,
      aiInitialized: !!ai
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate drug suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}