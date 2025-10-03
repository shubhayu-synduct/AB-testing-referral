import admin from "firebase-admin";
import { Resend } from "resend";

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
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    firebaseProject: process.env.FIREBASE_PROJECT_ID,
    resendConfigured: !!process.env.RESEND_API_KEY,
    issues: [] as string[],
    users: [] as any[],
    recommendations: [] as string[]
  };

  try {
    // Check Firebase connection
    try {
      await db.collection("users").limit(1).get();
      debugInfo.recommendations.push("✅ Firebase connection successful");
    } catch (error) {
      debugInfo.issues.push(`❌ Firebase connection failed: ${error}`);
    }

    // Check Resend API
    try {
      if (process.env.RESEND_API_KEY) {
        // Test Resend API with a simple call
        debugInfo.recommendations.push("✅ Resend API key configured");
      } else {
        debugInfo.issues.push("❌ RESEND_API_KEY not configured");
      }
    } catch (error) {
      debugInfo.issues.push(`❌ Resend API error: ${error}`);
    }

    // Get all users with email automation status
    const allUsersSnapshot = await db.collection("users").get();
    debugInfo.recommendations.push(`📊 Total users in database: ${allUsersSnapshot.docs.length}`);

    // Get active email automation users
    const activeUsersSnapshot = await db.collection("users")
      .where("emailAutomationStatus", "==", "active")
      .get();

    debugInfo.recommendations.push(`📧 Users with active email automation: ${activeUsersSnapshot.docs.length}`);

    // Analyze each active user
    for (const doc of activeUsersSnapshot.docs) {
      const user = doc.data();
      
      const userDebug = {
        userId: doc.id,
        email: user.email,
        emailDay: user.emailDay,
        emailAutomationStatus: user.emailAutomationStatus,
        emailAutomationSignupDate: user.emailAutomationSignupDate,
        lastEmailSent: user.lastEmailSent,
        totalEmailsSent: user.totalEmailsSent,
        issues: [] as string[],
        nextEmailDay: (user.emailDay || 0) + 1,
        shouldReceiveEmail: false
      };

      // Check if user has required fields
      if (!user.email) {
        userDebug.issues.push("❌ No email address");
      }

      if (user.emailDay === undefined) {
        userDebug.issues.push("❌ emailDay is undefined");
      }

      if (!user.emailAutomationSignupDate) {
        userDebug.issues.push("❌ No emailAutomationSignupDate");
      }

      // Calculate if user should receive email
      if (userDebug.nextEmailDay >= 2 && userDebug.nextEmailDay <= 7) {
        userDebug.shouldReceiveEmail = true;
      } else if (userDebug.nextEmailDay < 2) {
        userDebug.issues.push(`⚠️ Next email day is ${userDebug.nextEmailDay}, but cron only sends Day 2-7`);
      } else if (userDebug.nextEmailDay > 7) {
        userDebug.issues.push(`✅ User completed email sequence (day ${user.emailDay})`);
      }

      // Check signup date
      if (user.emailAutomationSignupDate) {
        let signupDate: Date;
        if (user.emailAutomationSignupDate.toDate) {
          signupDate = user.emailAutomationSignupDate.toDate();
        } else if (user.emailAutomationSignupDate instanceof Date) {
          signupDate = user.emailAutomationSignupDate;
        } else {
          signupDate = new Date(user.emailAutomationSignupDate);
        }

        const daysSinceSignup = Math.floor(
          (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        userDebug.daysSinceSignup = daysSinceSignup;
        userDebug.signupDate = signupDate.toISOString();

        if (daysSinceSignup < userDebug.nextEmailDay) {
          userDebug.issues.push(`⚠️ Only ${daysSinceSignup} days since signup, but trying to send day ${userDebug.nextEmailDay} email`);
        }
      }

      debugInfo.users.push(userDebug);
    }

    // Check for common issues
    const usersWithIssues = debugInfo.users.filter(u => u.issues.length > 0);
    if (usersWithIssues.length > 0) {
      debugInfo.issues.push(`❌ ${usersWithIssues.length} users have issues`);
    }

    const usersShouldReceiveEmail = debugInfo.users.filter(u => u.shouldReceiveEmail);
    if (usersShouldReceiveEmail.length === 0) {
      debugInfo.issues.push("❌ No users should receive emails based on current logic");
    }

    // Check if Day 1 email is being sent outside automation
    const usersAtDay0 = debugInfo.users.filter(u => u.emailDay === 0);
    if (usersAtDay0.length > 0) {
      debugInfo.issues.push(`⚠️ ${usersAtDay0.length} users are at emailDay 0 - they should have received Day 1 email after onboarding`);
    }

    // Recommendations
    if (debugInfo.users.length === 0) {
      debugInfo.recommendations.push("🔍 No users found with emailAutomationStatus: 'active'");
      debugInfo.recommendations.push("💡 Check if users are being added to email automation during signup");
    }

    if (usersAtDay0.length > 0) {
      debugInfo.recommendations.push("💡 Users at emailDay 0 should have received Day 1 email after onboarding completion");
      debugInfo.recommendations.push("💡 Check if Day 1 email is being sent in onboarding process");
    }

    if (usersShouldReceiveEmail.length > 0) {
      debugInfo.recommendations.push(`💡 ${usersShouldReceiveEmail.length} users should receive emails today`);
    }

    return Response.json(debugInfo);

  } catch (error) {
    debugInfo.issues.push(`❌ Debug function error: ${error}`);
    return Response.json(debugInfo, { status: 500 });
  }
}
