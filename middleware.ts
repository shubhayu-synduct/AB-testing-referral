import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Blocked countries list - Cuba, Iran, North Korea, Syria, Sudan, Belarus, Russia,
const BLOCKED_COUNTRIES = ['CU', 'IR', 'KP', 'SY', 'SD', 'BY', 'RU']

// Check if geo-fencing is enabled (can be disabled via environment variable)
const GEO_FENCING_ENABLED = process.env.NEXT_PUBLIC_GEO_FENCING_ENABLED !== 'false'

// Function to check if country is blocked
function isCountryBlocked(country: string | undefined): boolean {
  if (!country) return false
  return BLOCKED_COUNTRIES.includes(country.toUpperCase())
}

// Function to check if path should be whitelisted (allowed even for blocked countries)
function isPathWhitelisted(path: string): boolean {
  const whitelistedPaths = [
    // Static files
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    // Images and assets
    '.svg',
    '.ico',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.css',
    '.js',
    // API routes (optional - you may want to block these too)
    '/api',
  ]
  
  return whitelistedPaths.some(whitelist => 
    path.startsWith(whitelist) || path.endsWith(whitelist)
  )
}

// Function to generate blocked country page
function generateBlockedPage(country: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Restricted</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: #3771FE;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333;
            }
            .container {
                background: white;
                padding: 3rem 2rem;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(55, 113, 254, 0.2);
                text-align: center;
                max-width: 400px;
                margin: 2rem;
                border: 1px solid rgba(55, 113, 254, 0.1);
            }
            .icon {
                font-size: 4rem;
                margin-bottom: 1.5rem;
                color: #3771FE;
            }
            h1 {
                font-size: 1.75rem;
                margin-bottom: 1.5rem;
                color: #3771FE;
                font-weight: 600;
                font-family: 'DM Sans', sans-serif;
            }
            p {
                color: #6b7280;
                line-height: 1.6;
                font-size: 1rem;
                font-family: 'DM Sans', sans-serif;
                font-weight: 400;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🌍</div>
            <h1>Not Available</h1>
            <p>We are sorry, we are not available in your region at this time.</p>
        </div>
    </body>
    </html>
  `
}

export async function middleware(request: NextRequest) {
  // Get the path of the request
  const path = request.nextUrl.pathname

  // Step 1: Geo-detection - Try multiple methods to get country
  let country: string | undefined

  // Method 1: Vercel's edge runtime geo detection
  country = (request as any).geo?.country

  // Method 2: Cloudflare headers (fallback)
  if (!country) {
    country = request.headers.get('cf-ipcountry') || undefined
  }

  // Method 3: Vercel country headers (fallback)
  if (!country) {
    country = request.headers.get('x-vercel-ip-country') || undefined
  }

  // Method 4: Default fallback
  if (!country) {
    country = 'US'
  }

  // Step 2: Check if geo-fencing is enabled
  if (!GEO_FENCING_ENABLED) {
    // Geo-fencing is disabled, skip to auth logic
    // Log for monitoring
    console.log('ℹ️ Geo-fencing disabled, allowing all countries:', { country, path })
  } else {
    // Step 3: Check if country is blocked and path is not whitelisted
    const countryBlocked = isCountryBlocked(country)
    const pathWhitelisted = isPathWhitelisted(path)

    // Log geo-detection for monitoring (only in production)
    if (process.env.NODE_ENV === 'production') {
      console.log('🌍 Geo-detection:', { country, path, blocked: countryBlocked, whitelisted: pathWhitelisted })
    }

    // Step 4: Block if country is blocked AND path is not whitelisted
    if (countryBlocked && !pathWhitelisted) {
      // Log the blocked attempt
      console.log('🚫 Geo-fence block:', {
        country,
        path,
        userAgent: request.headers.get('user-agent') || 'Unknown',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown',
        timestamp: new Date().toISOString()
      })

      // Return blocked page with proper headers
      return new NextResponse(generateBlockedPage(country), {
        status: 403,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Robots-Tag': 'noindex, nofollow',
          'X-Blocked-Country': country,
          'X-Blocked-Reason': 'geo-restriction'
        }
      })
    }
  }

  // Step 5: If not blocked or path is whitelisted, continue with existing auth logic

  // Define public paths that don't require authentication
  const isPublicPath = path === "/" || 
    path === "/login" || 
    path === "/signup" || 
    path === "/forgot-password" || 
    path.startsWith("/reset-password") ||
    path.startsWith("/dashboard/public/") || // Allow access to public shared chats
    path.startsWith("/not-signed-in") || // Allow access to not-signed-in route
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.endsWith(".svg") ||
    path.endsWith(".ico") ||
    path.endsWith(".png")

  // Special case for verify-email: always allow access regardless of auth state
  if (path === "/verify-email") {
    return NextResponse.next()
  }

  // Check for the drinfo-session cookie which indicates authentication
  const authCookie = request.cookies.get('drinfo-session')
  let hasValidAuthCookie = false
  
  if (authCookie) {
    // Try to validate the cookie content
    try {
      const sessionData = JSON.parse(authCookie.value || '{}')
      // Check if the session has required fields and isn't too old
      if (sessionData.uid && sessionData.email && sessionData.timestamp) {
        const age = Date.now() - sessionData.timestamp
        const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        
        if (age < maxAge) {
          hasValidAuthCookie = true
        }
      }
    } catch (error) {
      // Invalid cookie, treat as unauthenticated
    }
  }

  // Only redirect to login for truly protected routes
  // Let client-side auth handle most auth logic to prevent race conditions
  if (!hasValidAuthCookie && !isPublicPath ) {
    // Remove onboarding from critical paths - let AuthProvider handle it
    const criticalProtectedPaths: string[] = [] // Remove '/onboarding' from here
    const isCriticalPath = criticalProtectedPaths.some(criticalPath => path.startsWith(criticalPath))
    
    if (isCriticalPath) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    
    // For all other protected paths including onboarding, let client-side handle it
    return NextResponse.next()
  }

  // For all other cases, proceed with the request
  return NextResponse.next()
}

// Configure the middleware to run on all paths for geo-fencing
export const config = {
  matcher: [
    /*
     * Match all request paths - geo-fencing needs to check every request
     * The middleware will handle whitelisting internally
     */
    '/((?!_next/static|_next/image).*)',
  ],
}
