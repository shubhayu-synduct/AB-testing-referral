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
    const { userUid, userEmail } = await request.json();
    
    if (!userUid || !userEmail) {
      return NextResponse.json({ 
        error: "User UID and email are required" 
      }, { status: 400 });
    }

    logger.info(`Starting profile deletion for UID: ${userUid}, Email: ${userEmail}`);

    // Step 1: Find ALL users with the same email (handles duplicates)
    const userRef = db.collection('users').where('email', '==', userEmail.toLowerCase().trim());
    const snapshot = await userRef.get();
    
    let deletedUserCount = 0;
    if (!snapshot.empty) {
      logger.info(`Found ${snapshot.docs.length} user(s) with email ${userEmail}, deleting all...`);
      
      // Delete all user documents with the same email
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        logger.info(`Deleting user document: ${doc.id}`);
        batch.delete(doc.ref);
        deletedUserCount++;
      });
      await batch.commit();
      
      logger.info(`Successfully deleted ${deletedUserCount} user document(s) with email ${userEmail}`);
    } else {
      logger.warn(`No user documents found with email ${userEmail}`);
    }
    
    // Step 2: Delete any related analytics data for this email
    try {
      const analyticsRef = db.collection('analytics').where('data.email', '==', userEmail);
      const analyticsSnapshot = await analyticsRef.get();
      
      if (!analyticsSnapshot.empty) {
        logger.info(`Deleting ${analyticsSnapshot.docs.length} analytics records for email ${userEmail}`);
        const analyticsBatch = db.batch();
        analyticsSnapshot.docs.forEach(doc => {
          analyticsBatch.delete(doc.ref);
        });
        await analyticsBatch.commit();
        logger.info('Analytics records deleted successfully');
      }
    } catch (analyticsError) {
      logger.error('Could not delete analytics records:', analyticsError);
      // Don't fail the deletion if analytics deletion fails
    }
    
    // Step 3: Delete the user's authentication account
    try {
      await authAdmin.deleteUser(userUid);
      logger.info(`Successfully deleted Firebase Auth user: ${userUid}`);
    } catch (authError: any) {
      logger.error('Could not delete Firebase Auth user:', authError);
      // Continue even if auth deletion fails
    }

    logger.info(`Profile deletion completed for ${userEmail}. Deleted ${deletedUserCount} user documents.`);

    return NextResponse.json({
      success: true,
      message: "Profile and all related data deleted successfully",
      email: userEmail,
      deletedUserCount: deletedUserCount,
      deletedAuthUser: userUid
    });

  } catch (error: any) {
    logger.error("Error deleting profile:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error occurred during profile deletion" 
    }, { status: 500 });
  }
}
