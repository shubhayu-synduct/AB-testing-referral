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

    logger.info(`Fetching user data for email: ${email}`);

    // Step 1: Find user documents in Firestore
    const userRef = db.collection('users').where('email', '==', email.toLowerCase().trim());
    const snapshot = await userRef.get();
    
    let firestoreUsers = [];
    if (!snapshot.empty) {
      snapshot.docs.forEach(doc => {
        firestoreUsers.push({
          uid: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to ISO strings for JSON serialization
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
          emailAutomationSignupDate: doc.data().emailAutomationSignupDate?.toDate?.()?.toISOString() || doc.data().emailAutomationSignupDate,
          lastEmailSent: doc.data().lastEmailSent?.toDate?.()?.toISOString() || doc.data().lastEmailSent,
          unsubscribedAt: doc.data().unsubscribedAt?.toDate?.()?.toISOString() || doc.data().unsubscribedAt,
        });
      });
    }

    // Step 2: Find Firebase Auth users
    let authUsers = [];
    try {
      const authUsersResult = await authAdmin.getUsers([{ email: email }]);
      authUsers = authUsersResult.users.map(userRecord => ({
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
    } catch (authError: any) {
      logger.error('Could not fetch Firebase Auth users:', authError);
    }

    const totalFound = firestoreUsers.length + authUsers.length;

    if (totalFound === 0) {
      return NextResponse.json({
        success: false,
        message: "No users found with this email address",
        email: email,
        firestoreUsers: [],
        authUsers: [],
        totalFound: 0
      }, { status: 404 });
    }

    logger.info(`Found ${firestoreUsers.length} Firestore users and ${authUsers.length} Auth users for email: ${email}`);

    return NextResponse.json({
      success: true,
      message: "User data retrieved successfully",
      email: email,
      firestoreUsers: firestoreUsers,
      authUsers: authUsers,
      totalFound: totalFound
    });

  } catch (error: any) {
    logger.error("Error fetching user data:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error occurred while fetching user data" 
    }, { status: 500 });
  }
}
