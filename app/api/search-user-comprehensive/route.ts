import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { logger } from '@/lib/logger';

// Initialize Firebase Admin SDK (ensure it's initialized only once)
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const authAdmin = admin.auth();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        error: "Email is required" 
      }, { status: 400 });
    }

    logger.info(`Comprehensive search for user with email: ${email}`);

    const searchResults = {
      email: email,
      firestoreUsers: [],
      authUsers: [],
      analyticsRecords: [],
      conversations: [],
      totalFound: 0
    };

    // Step 1: Search in Firestore users collection
    try {
      const userRef = db.collection('users').where('email', '==', email.toLowerCase().trim());
      const snapshot = await userRef.get();
      
      if (!snapshot.empty) {
        snapshot.docs.forEach(doc => {
          searchResults.firestoreUsers.push({
            uid: doc.id,
            ...doc.data(),
            // Convert Firestore timestamps to ISO strings
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
            emailAutomationSignupDate: doc.data().emailAutomationSignupDate?.toDate?.()?.toISOString() || doc.data().emailAutomationSignupDate,
            lastEmailSent: doc.data().lastEmailSent?.toDate?.()?.toISOString() || doc.data().lastEmailSent,
            unsubscribedAt: doc.data().unsubscribedAt?.toDate?.()?.toISOString() || doc.data().unsubscribedAt,
          });
        });
      }
    } catch (error) {
      logger.error('Error searching Firestore users:', error);
    }

    // Step 2: Search Firebase Auth users
    try {
      const authUsersResult = await authAdmin.getUsers([{ email: email }]);
      searchResults.authUsers = authUsersResult.users.map(userRecord => ({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        providerData: userRecord.providerData.map(provider => ({
          providerId: provider.providerId,
          uid: provider.uid,
          email: provider.email,
          displayName: provider.displayName,
        })),
        createdAt: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        lastRefreshTime: userRecord.metadata.lastRefreshTime,
      }));
    } catch (error) {
      logger.error('Error searching Firebase Auth users:', error);
    }

    // Step 3: Search analytics collection
    try {
      const analyticsRef = db.collection('analytics').where('data.email', '==', email);
      const analyticsSnapshot = await analyticsRef.get();
      
      if (!analyticsSnapshot.empty) {
        analyticsSnapshot.docs.forEach(doc => {
          searchResults.analyticsRecords.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp,
          });
        });
      }
    } catch (error) {
      logger.error('Error searching analytics:', error);
    }

    // Step 4: Search conversations collection (if user has UID from Firestore)
    if (searchResults.firestoreUsers.length > 0) {
      try {
        const userId = searchResults.firestoreUsers[0].uid;
        const conversationsRef = db.collection('conversations').where('userId', '==', userId);
        const conversationsSnapshot = await conversationsRef.get();
        
        if (!conversationsSnapshot.empty) {
          conversationsSnapshot.docs.forEach(doc => {
            searchResults.conversations.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
              updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
            });
          });
        }
      } catch (error) {
        logger.error('Error searching conversations:', error);
      }
    }

    searchResults.totalFound = searchResults.firestoreUsers.length + 
                              searchResults.authUsers.length + 
                              searchResults.analyticsRecords.length + 
                              searchResults.conversations.length;

    if (searchResults.totalFound === 0) {
      return NextResponse.json({
        success: false,
        message: "No data found for this email address in any collection",
        ...searchResults
      }, { status: 404 });
    }

    logger.info(`Comprehensive search completed. Found ${searchResults.totalFound} total records for email: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Comprehensive search completed successfully",
      ...searchResults
    });

  } catch (error: any) {
    logger.error("Error in comprehensive search:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error occurred during comprehensive search" 
    }, { status: 500 });
  }
}
