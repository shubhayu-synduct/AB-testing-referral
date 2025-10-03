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

export async function GET() {
  try {
    // Get all users with email automation status
    const activeUsersSnapshot = await db.collection("users")
      .where("emailAutomationStatus", "==", "active")
      .get();

    const users = activeUsersSnapshot.docs.map(doc => {
      const user = doc.data();
      return {
        userId: doc.id,
        email: user.email,
        emailDay: user.emailDay,
        emailAutomationStatus: user.emailAutomationStatus,
        totalEmailsSent: user.totalEmailsSent,
        lastEmailSent: user.lastEmailSent,
        nextEmailDay: (user.emailDay || 0) + 1,
        shouldReceiveEmail: (() => {
          const nextEmailDay = (user.emailDay || 0) + 1;
          return nextEmailDay >= 1 && nextEmailDay <= 7;
        })()
      };
    });

    // Group by emailDay
    const emailDayGroups = users.reduce((acc, user) => {
      const day = user.emailDay || 0;
      if (!acc[day]) acc[day] = [];
      acc[day].push(user.email);
      return acc;
    }, {} as Record<number, string[]>);

    // Count users who should receive emails
    const usersShouldReceiveEmail = users.filter(u => u.shouldReceiveEmail).length;

    return Response.json({
      totalActiveUsers: users.length,
      usersShouldReceiveEmail,
      emailDayDistribution: emailDayGroups,
      sampleUsers: users.slice(0, 5), // First 5 users as sample
      summary: {
        usersAtDay0: emailDayGroups[0]?.length || 0,
        usersAtDay1: emailDayGroups[1]?.length || 0,
        usersAtDay2: emailDayGroups[2]?.length || 0,
        usersAtDay3: emailDayGroups[3]?.length || 0,
        usersAtDay4: emailDayGroups[4]?.length || 0,
        usersAtDay5: emailDayGroups[5]?.length || 0,
        usersAtDay6: emailDayGroups[6]?.length || 0,
        usersAtDay7: emailDayGroups[7]?.length || 0,
      }
    });

  } catch (error) {
    return Response.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      details: error 
    }, { status: 500 });
  }
}
