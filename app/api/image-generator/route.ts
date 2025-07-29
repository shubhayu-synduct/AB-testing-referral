import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Abstract text is required and must be a string' },
        { status: 400 }
      )
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Generate visual abstract SVG content
    const visualAbstractSvg = `
      <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#214498;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3771FE;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f1f5f9;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="800" height="600" fill="url(#bgGradient)"/>
        
        <!-- Header -->
        <rect x="0" y="0" width="800" height="80" fill="url(#headerGradient)"/>
        <text x="400" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">
          VISUAL ABSTRACT
        </text>
        
        <!-- Main content area -->
        <rect x="40" y="100" width="720" height="480" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1"/>
        
        <!-- Abstract text -->
        <text x="60" y="130" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#214498">
          ABSTRACT
        </text>
        <text x="60" y="150" font-family="Arial, sans-serif" font-size="12" fill="#374151" style="white-space: pre-wrap;">
          ${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}
        </text>
        
        <!-- Key findings section -->
        <rect x="60" y="220" width="320" height="120" rx="4" fill="#f0f9ff" stroke="#0ea5e9" stroke-width="1"/>
        <text x="70" y="240" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0c4a6e">
          KEY FINDINGS
        </text>
        <text x="70" y="260" font-family="Arial, sans-serif" font-size="11" fill="#0c4a6e">
          • Research highlights and outcomes
        </text>
        <text x="70" y="275" font-family="Arial, sans-serif" font-size="11" fill="#0c4a6e">
          • Statistical significance
        </text>
        <text x="70" y="290" font-family="Arial, sans-serif" font-size="11" fill="#0c4a6e">
          • Clinical implications
        </text>
        <text x="70" y="305" font-family="Arial, sans-serif" font-size="11" fill="#0c4a6e">
          • Future research directions
        </text>
        
        <!-- Methods section -->
        <rect x="420" y="220" width="320" height="120" rx="4" fill="#fef3c7" stroke="#f59e0b" stroke-width="1"/>
        <text x="430" y="240" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#92400e">
          METHODOLOGY
        </text>
        <text x="430" y="260" font-family="Arial, sans-serif" font-size="11" fill="#92400e">
          • Study design and population
        </text>
        <text x="430" y="275" font-family="Arial, sans-serif" font-size="11" fill="#92400e">
          • Data collection methods
        </text>
        <text x="430" y="290" font-family="Arial, sans-serif" font-size="11" fill="#92400e">
          • Statistical analysis
        </text>
        <text x="430" y="305" font-family="Arial, sans-serif" font-size="11" fill="#92400e">
          • Quality assessment
        </text>
        
        <!-- Results visualization area -->
        <rect x="60" y="360" width="680" height="200" rx="4" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
        <text x="70" y="385" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#374151">
          RESULTS & VISUALIZATION
        </text>
        
        <!-- Sample chart/graph placeholder -->
        <rect x="80" y="400" width="120" height="80" rx="4" fill="#3771FE" opacity="0.8"/>
        <text x="140" y="445" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="white">Chart 1</text>
        
        <rect x="220" y="400" width="120" height="80" rx="4" fill="#9BB8FF" opacity="0.8"/>
        <text x="280" y="445" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="white">Chart 2</text>
        
        <rect x="360" y="400" width="120" height="80" rx="4" fill="#214498" opacity="0.8"/>
        <text x="420" y="445" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="white">Chart 3</text>
        
        <rect x="500" y="400" width="120" height="80" rx="4" fill="#64748b" opacity="0.8"/>
        <text x="560" y="445" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="white">Chart 4</text>
        
        <!-- Footer -->
        <rect x="0" y="580" width="800" height="20" fill="#1e293b"/>
        <text x="400" y="595" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="white">
          Generated Visual Abstract - Professional Research Presentation
        </text>
      </svg>
    `

    return NextResponse.json({
      success: true,
      svg_content: visualAbstractSvg,
      prompt: prompt,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in visual abstract generation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 