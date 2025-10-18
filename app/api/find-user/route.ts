import admin from "firebase-admin";

// Init Firebase Admin SDK
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'shubhayubhowmick@gmail.com';

  try {
    // Search for user by email
    const snapshot = await db.collection("users")
      .where("email", "==", email.toLowerCase().trim())
      .get();

    if (snapshot.empty) {
      return Response.json({ 
        message: `No user found with email: ${email}`,
        found: false 
      });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Calculate days since signup if we have the date
    let daysSinceSignup = null;
    if (userData.emailAutomationSignupDate) {
      let signupDate: Date;
      if (userData.emailAutomationSignupDate.toDate) {
        signupDate = userData.emailAutomationSignupDate.toDate();
      } else if (userData.emailAutomationSignupDate instanceof Date) {
        signupDate = userData.emailAutomationSignupDate;
      } else {
        signupDate = new Date(userData.emailAutomationSignupDate);
      }
      daysSinceSignup = Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    const nextEmailDay = (userData.emailDay || 0) + 1;
    const shouldReceiveEmail = nextEmailDay >= 2 && nextEmailDay <= 7;

    return Response.json({
      message: `User found: ${email}`,
      found: true,
      user: {
        userId: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        emailDay: userData.emailDay,
        emailAutomationStatus: userData.emailAutomationStatus,
        emailAutomationSignupDate: userData.emailAutomationSignupDate,
        lastEmailSent: userData.lastEmailSent,
        totalEmailsSent: userData.totalEmailsSent,
        daysSinceSignup,
        nextEmailDay,
        shouldReceiveEmail,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }
    });

  } catch (error) {
    return Response.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      details: error 
    }, { status: 500 });
  }
}
