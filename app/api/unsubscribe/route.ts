import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { logger } from '@/lib/logger';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  const serviceAccount: admin.ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      logger.error('Unsubscribe request missing email');
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.error('Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    logger.info('Processing unsubscribe request for:', email);

    // Find user by email
    const userRef = db.collection('users').where('email', '==', email.toLowerCase().trim());
    const snapshot = await userRef.get();

    if (snapshot.empty) {
      logger.warn('User not found for unsubscribe:', email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Check if user is already unsubscribed
    if (userData.emailAutomationStatus === 'unsubscribed') {
      logger.info('User already unsubscribed:', email);
      return NextResponse.json({
        success: true,
        message: 'You are already unsubscribed from our emails',
        alreadyUnsubscribed: true
      });
    }

    // Update user status to unsubscribed
    await userDoc.ref.update({
      emailAutomationStatus: 'unsubscribed',
      unsubscribedAt: admin.firestore.Timestamp.fromDate(new Date()),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date())
    });

    // Log analytics event
    try {
      await db.collection('analytics').add({
        event: 'user_unsubscribed',
        data: {
          email: email,
          userId: userDoc.id,
          previousStatus: userData.emailAutomationStatus,
          emailDay: userData.emailDay,
          totalEmailsSent: userData.totalEmailsSent,
          timestamp: new Date()
        },
        timestamp: admin.firestore.Timestamp.fromDate(new Date()),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (analyticsError) {
      // Don't fail the unsubscribe if analytics logging fails
      logger.error('Failed to log unsubscribe analytics:', analyticsError);
    }

    logger.info('User successfully unsubscribed:', email);

    return NextResponse.json({
      success: true,
      message: 'You have been successfully unsubscribed from our onboarding emails. You will no longer receive any emails from us.',
      email: email,
      unsubscribedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing unsubscribe request:', error);
    
    return NextResponse.json(
      { 
        error: 'An error occurred while processing your unsubscribe request. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for direct URL access)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  // Redirect to the unsubscribe page with the email parameter
  return NextResponse.redirect(`https://app.drinfo.ai/unsubscribe?email=${encodeURIComponent(email)}`);
}
