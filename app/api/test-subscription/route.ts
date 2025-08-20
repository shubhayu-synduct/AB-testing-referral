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
  try {
    const body = await req.json();
    const { uid, subscriptionTier, idToken } = body;

    if (!uid || !subscriptionTier || !idToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify Firebase ID token
    const decoded = await auth.verifyIdToken(idToken);
    if (decoded.uid !== uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user's subscription tier (for testing purposes)
    await db.collection('users').doc(uid).set(
      {
        subscriptionTier,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: `Updated user ${uid} to tier: ${subscriptionTier}`,
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Test subscription update error:', error);
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    );
  }
} 