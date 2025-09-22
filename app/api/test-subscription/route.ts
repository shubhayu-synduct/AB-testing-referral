import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'UID parameter required' }, { status: 400 });
    }

    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    
    return NextResponse.json({
      uid,
      subscriptionTier: userData?.subscriptionTier || 'free',
      subscription: userData?.subscription || null,
      email: userData?.email,
      createdAt: userData?.createdAt,
      updatedAt: userData?.updatedAt,
      fullUserData: userData
    });
  } catch (error: any) {
    console.error('Test subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // SECURITY FIX: Disabled direct subscription tier updates
  // Subscription tiers should ONLY be updated by Stripe webhooks after successful payment
  return NextResponse.json(
    { 
      error: 'Direct subscription updates are disabled for security. Only Stripe webhooks can update subscription tiers after successful payment.' 
    },
    { status: 403 }
  );
} 