"use client"

import { getFirebaseAuth } from './firebase';
import { logger } from './logger';

// Backend API base URLs for dual routing
// const EMA_API_URL = process.env.NEXT_PUBLIC_EMA_API_URL || 'http://localhost:8002'; // EMA drug database
// const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000'; // AI drug summary
// Legacy fallback
// const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8002';
const EMA_API_URL = process.env.NEXT_PUBLIC_EMA_API_URL || 'https://synduct-drugsummary.drinfo.ai';
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'https://synduct-drug-ai-summary.drinfo.ai';
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://synduct-drug-ai-summary.drinfo.ai';

export interface ApiOptions {
  requireAuth?: boolean;
  database?: 'english' | 'portuguese';
  serviceType?: 'ema' | 'ai'; // Route to EMA (port 8002) or AI (port 8000) service
}

/**
 * Make an authenticated API request to the backend
 * @param endpoint - API endpoint (e.g., '/api/search')
 * @param options - Request options
 * @param apiOptions - Additional API configuration
 */
export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {},
  apiOptions: ApiOptions = {}
): Promise<Response> {
  // Determine which service to use based on serviceType
  const baseUrl = apiOptions.serviceType === 'ai' ? AI_API_URL : 
                  apiOptions.serviceType === 'ema' ? EMA_API_URL : 
                  BACKEND_API_URL; // fallback to legacy
  const url = `${baseUrl}${endpoint}`;
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  // Get authentication - REQUIRED for medical application
  try {
    const auth = await getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Authentication required. Please sign in to access drug information.');
    }
    
    const idToken = await user.getIdToken();
    headers['Authorization'] = `Bearer ${idToken}`;
    logger.apiLog(`Making authenticated request to ${endpoint} for user: ${user.email}`);
  } catch (error) {
    logger.error('Authentication error:', error);
    throw new Error('Authentication required. Please sign in to access drug information.');
  }

  // Add database parameter if specified
  if (apiOptions.database) {
    const urlObj = new URL(url);
    urlObj.searchParams.set('database', apiOptions.database);
    return fetch(urlObj.toString(), {
      ...options,
      headers
    });
  }

  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Search for drugs using the authenticated backend API
 * REQUIRES AUTHENTICATION
 */
export async function searchDrugs(
  query: string, 
  limit: number = 10,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/search?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database, serviceType: 'ema' }
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ===== EMA SERVICE FUNCTIONS (Port 8002) =====

/**
 * Search for drugs using EMA database service (port 8002)
 * REQUIRES AUTHENTICATION
 */
export async function searchDrugsEMA(
  query: string,
  limit: number = 10,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/search?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database, serviceType: 'ema' }
  );

  if (!response.ok) {
    throw new Error(`EMA search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get drug info from EMA database service (port 8002)
 * REQUIRES AUTHENTICATION
 */
export async function getDrugInfoEMA(
  drugName: string,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    name: drugName
  });
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/drug-info?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database, serviceType: 'ema' }
  );

  if (!response.ok) {
    throw new Error(`Failed to get EMA drug info: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ===== AI SERVICE FUNCTIONS (Port 8000) =====

/**
 * Enhanced search for drugs using AI service (port 8000)
 * REQUIRES AUTHENTICATION
 */
export async function enhancedSearchDrugsAI(
  query: string,
  limit: number = 10,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/enhanced-search?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database, serviceType: 'ai' }
  );

  if (!response.ok) {
    throw new Error(`AI enhanced search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get drug info from AI service (port 8000)
 * REQUIRES AUTHENTICATION
 */
export async function getDrugInfoAI(
  drugName: string,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    name: drugName
  });
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/drug-info?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database, serviceType: 'ai' }
  );

  if (!response.ok) {
    throw new Error(`Failed to get AI drug info: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Enhanced search for drugs using the authenticated backend API
 * REQUIRES AUTHENTICATION
 */
export async function enhancedSearchDrugs(
  query: string,
  limit: number = 10,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/enhanced-search?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database, serviceType: 'ema' }
  );

  if (!response.ok) {
    throw new Error(`Enhanced search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get drug information using the authenticated backend API
 * REQUIRES AUTHENTICATION
 */
export async function getDrugInfo(
  drugName: string,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams();
  
  if (database) {
    params.set('database', database);
  }

  const queryString = params.toString();
  const endpoint = `/api/drugs/${encodeURIComponent(drugName)}${queryString ? `?${queryString}` : ''}`;

  const response = await makeAuthenticatedRequest(
    endpoint,
    { method: 'GET' },
    { requireAuth: true, database, serviceType: 'ema' }
  );

  if (!response.ok) {
    throw new Error(`Failed to get drug info: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get drug library using the authenticated backend API
 * REQUIRES AUTHENTICATION
 */
export async function getDrugLibrary(
  letter?: string,
  limit?: number,
  offset: number = 0,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    offset: offset.toString()
  });
  
  if (letter) {
    params.set('letter', letter);
  }
  
  if (limit) {
    params.set('limit', limit.toString());
  }
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/library/drugs?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database, serviceType: 'ema' }
  );

  if (!response.ok) {
    throw new Error(`Failed to get drug library: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user status and database preference
 * REQUIRES AUTHENTICATION
 */
export async function getUserStatus(): Promise<any> {
  const response = await makeAuthenticatedRequest(
    '/api/user-status',
    { method: 'GET' },
    { requireAuth: true, serviceType: 'ema' }
  );

  if (!response.ok) {
    throw new Error(`Failed to get user status: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get geo-location information
 * This endpoint can work without authentication for fallback purposes
 */
export async function getGeoLocation(): Promise<any> {
  const response = await fetch(`${EMA_API_URL}/api/geo-location`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get geo-location: ${response.status} ${response.statusText}`);
  }

  return response.json();
}