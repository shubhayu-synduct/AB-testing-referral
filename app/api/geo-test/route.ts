import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get geo information from various sources
  const geoInfo = {
    // Vercel's edge runtime geo detection
    vercelGeo: {
      country: (request as any).geo?.country,
      region: (request as any).geo?.region,
      city: (request as any).geo?.city,
      latitude: (request as any).geo?.latitude,
      longitude: (request as any).geo?.longitude,
    },
    // Headers from various CDNs
    headers: {
      cfCountry: request.headers.get('cf-ipcountry'),
      vercelCountry: request.headers.get('x-vercel-ip-country'),
      forwardedFor: request.headers.get('x-forwarded-for'),
      realIp: request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    },
    // Blocked countries for reference
    blockedCountries: ['CU', 'IR', 'KP', 'SY', 'SD', 'BY', 'RU'],
    // Environment info
    environment: {
      nodeEnv: process.env.NODE_ENV,
      geoFencingEnabled: process.env.NEXT_PUBLIC_GEO_FENCING_ENABLED !== 'false',
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(geoInfo, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Test-Endpoint': 'geo-test'
    }
  });
}
