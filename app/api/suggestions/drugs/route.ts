import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

// Server-side only API key (no NEXT_PUBLIC_ prefix)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not configured on server-side');
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

    const prompt = `You are a pharmaceutical autocomplete system with extensive knowledge of drugs and active substances. Given the partial query: "${query}", suggest 3 REAL drug names or active substances that start with or contain this text.

Previous queries to avoid duplicating: ${previousQueries.join(', ')}

STRICT REQUIREMENTS:
- ONLY suggest actual pharmaceutical names, active substances, or established drug names
- NO generic formulations like "${query} tablets" or "${query} injection"
- Focus on real medications that healthcare professionals would recognize
- Include both generic (INN) and brand names when applicable
- Prioritize exact matches and common medications

Categories to consider:
- Active pharmaceutical ingredients (APIs)
- Generic drug names (INN - International Nonproprietary Names)
- Brand/trade names of medications
- Drug combinations with established names
- Well-known drug classes only if they are specific (e.g., "ACE inhibitors")

Examples of GOOD suggestions:
- "aspi" → ["aspirin", "aspartame", "asparagine"]
- "para" → ["paracetamol", "paroxetine", "paracetamol"]
- "metf" → ["metformin", "metformin XR", "metformin/sitagliptin"]
- "amlo" → ["amlodipine", "amlodipine/valsartan", "amlodipine besylate"]

Examples of BAD suggestions to AVOID:
- "aspi tablets", "aspi injection", "aspi capsules"
- "para medication", "para treatment"

IMPORTANT: Return ONLY a valid JSON array of exactly 3 strings. No markdown formatting, no code blocks, no additional text, no explanations. Just the raw JSON array.

Example format: ["aspirin", "aspartame", "asparagine"]

Each suggestion MUST be a real, specific pharmaceutical name or active substance.`;

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
      
      // Pad with real drug-specific suggestions if needed
      while (validSuggestions.length < 3) {
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('para')) {
          validSuggestions.push('paracetamol');
        } else if (lowerQuery.includes('met')) {
          validSuggestions.push('metformin');
        } else if (lowerQuery.includes('asp')) {
          validSuggestions.push('aspirin');
        } else if (lowerQuery.includes('amlo')) {
          validSuggestions.push('amlodipine');
        } else if (lowerQuery.includes('ibu')) {
          validSuggestions.push('ibuprofen');
        } else if (lowerQuery.includes('sim')) {
          validSuggestions.push('simvastatin');
        } else {
          // Use common drug prefixes as fallback
          validSuggestions.push('acetaminophen');
        }
      }

      return NextResponse.json({ suggestions: validSuggestions });
    } catch (parseError) {
      logger.error('Failed to parse AI response:', { text: cleanText, error: parseError });
      
      // Return real drug-specific fallback suggestions
      const lowerQuery = query.toLowerCase();
      let fallbackSuggestions;
      
      if (lowerQuery.includes('para')) {
        fallbackSuggestions = ['paracetamol', 'paroxetine', 'paracetamol/codeine'];
      } else if (lowerQuery.includes('met')) {
        fallbackSuggestions = ['metformin', 'metoprolol', 'metronidazole'];
      } else if (lowerQuery.includes('asp')) {
        fallbackSuggestions = ['aspirin', 'aspartame', 'asparagine'];
      } else if (lowerQuery.includes('amlo')) {
        fallbackSuggestions = ['amlodipine', 'amlodipine/valsartan', 'amlodipine besylate'];
      } else if (lowerQuery.includes('ibu')) {
        fallbackSuggestions = ['ibuprofen', 'ibuprofen/paracetamol', 'ibuprofen lysine'];
      } else if (lowerQuery.includes('sim')) {
        fallbackSuggestions = ['simvastatin', 'simvastatin/ezetimibe', 'simethicone'];
      } else if (lowerQuery.includes('beta')) {
        fallbackSuggestions = ['betamethasone', 'betaxolol', 'beta blockers'];
      } else if (lowerQuery.includes('ace')) {
        fallbackSuggestions = ['acetaminophen', 'acebutolol', 'ACE inhibitors'];
      } else if (lowerQuery.includes('ator')) {
        fallbackSuggestions = ['atorvastatin', 'atorvastatin calcium', 'atorvastatin/amlodipine'];
      } else if (lowerQuery.includes('omep')) {
        fallbackSuggestions = ['omeprazole', 'omeprazole/sodium bicarbonate', 'omeprazole magnesium'];
      } else {
        // Common drug fallbacks based on first letter
        const firstLetter = query.charAt(0).toLowerCase();
        if (firstLetter === 'a') {
          fallbackSuggestions = ['acetaminophen', 'aspirin', 'amlodipine'];
        } else if (firstLetter === 'm') {
          fallbackSuggestions = ['metformin', 'metoprolol', 'morphine'];
        } else if (firstLetter === 'l') {
          fallbackSuggestions = ['lisinopril', 'levothyroxine', 'losartan'];
        } else if (firstLetter === 's') {
          fallbackSuggestions = ['simvastatin', 'sertraline', 'sildenafil'];
        } else {
          fallbackSuggestions = ['acetaminophen', 'ibuprofen', 'aspirin'];
        }
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