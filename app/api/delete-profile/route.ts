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
    
    // Step 3: Find and delete ALL Firebase Auth users with the same email
    let deletedAuthUserCount = 0;
    try {
      const authUsers = await authAdmin.getUsers([{ email: userEmail }]);
      if (authUsers.users.length > 0) {
        const uidsToDelete = authUsers.users.map(userRecord => userRecord.uid);
        logger.info(`Found ${authUsers.users.length} Firebase Auth user(s) with email ${userEmail}, deleting all...`);
        
        // Delete all Firebase Auth users with the same email
        await authAdmin.deleteUsers(uidsToDelete);
        deletedAuthUserCount = uidsToDelete.length;
        
        logger.info(`Successfully deleted ${deletedAuthUserCount} Firebase Auth user(s) with email ${userEmail}`);
        logger.info(`Deleted Firebase Auth UIDs: ${uidsToDelete.join(', ')}`);
      } else {
        logger.warn(`No Firebase Auth users found with email ${userEmail}`);
      }
    } catch (authError: any) {
      logger.error('Could not delete Firebase Auth users:', authError);
      // Continue even if auth deletion fails
    }

    // Check if any users were found and deleted
    if (deletedUserCount === 0 && deletedAuthUserCount === 0) {
      logger.warn(`No users found with email ${userEmail} to delete`);
      return NextResponse.json({
        success: false,
        message: "No users found with this email address",
        email: userEmail,
        deletedUserCount: 0,
        deletedAuthUserCount: 0,
        totalAccountsDeleted: 0
      }, { status: 404 });
    }

    logger.info(`Profile deletion completed for ${userEmail}. Deleted ${deletedUserCount} user documents and ${deletedAuthUserCount} Firebase Auth users.`);

    return NextResponse.json({
      success: true,
      message: "Profile and all related data deleted successfully",
      email: userEmail,
      deletedUserCount: deletedUserCount,
      deletedAuthUserCount: deletedAuthUserCount,
      totalAccountsDeleted: deletedUserCount + deletedAuthUserCount
    });

  } catch (error: any) {
    logger.error("Error deleting profile:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error occurred during profile deletion" 
    }, { status: 500 });
  }
}
