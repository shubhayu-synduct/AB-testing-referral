import { NextRequest } from "next/server";
import { addUserToEmailAutomation, getUserEmailStatus, updateUserEmailDay } from "@/lib/email-automation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, name, emailDay, userId } = body;

    switch (action) {
      case "add-user":
        if (!email) {
          return Response.json({ error: "Email is required" }, { status: 400 });
        }
        const result = await addUserToEmailAutomation({
          email,
          name,
          userId: userId || "",
          signupDate: new Date(),
        });
        return Response.json(result);

      case "get-status":
        if (!email) {
          return Response.json({ error: "Email is required" }, { status: 400 });
        }
        const status = await getUserEmailStatus(email);
        return Response.json({ status });

      case "update-email-day":
        if (!email || emailDay === undefined) {
          return Response.json({ error: "Email and emailDay are required" }, { status: 400 });
        }
        const updateResult = await updateUserEmailDay(email, emailDay);
        return Response.json(updateResult);

      case "debug-user":
        if (!email) {
          return Response.json({ error: "Email is required" }, { status: 400 });
        }
        // Import Firebase Admin SDK for direct document access
        const admin = require("firebase-admin");
        const db = admin.firestore();
        
        const userRef = db.collection("users").where("email", "==", email.toLowerCase().trim());
        const snapshot = await userRef.get();
        
        if (snapshot.empty) {
          return Response.json({ error: "User not found" }, { status: 404 });
        }
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        
        return Response.json({
          userId: userDoc.id,
          rawDocument: userData,
          emailAutomationFields: {
            emailDay: userData.emailDay,
            emailAutomationStatus: userData.emailAutomationStatus,
            emailAutomationSignupDate: userData.emailAutomationSignupDate,
            lastEmailSent: userData.lastEmailSent,
            totalEmailsSent: userData.totalEmailsSent,
            emailPreferences: userData.emailPreferences
          }
        });

      case "count-users":
        // Import Firebase Admin SDK for direct document access
        const admin2 = require("firebase-admin");
        const db2 = admin2.firestore();
        
        const allUsersSnapshot = await db2.collection("users").get();
        const allUsers = allUsersSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          email: doc.data().email,
          emailDay: doc.data().emailDay,
          emailAutomationStatus: doc.data().emailAutomationStatus,
          hasEmailDay: doc.data().emailDay !== undefined
        }));
        
        const usersWithEmailDay = allUsers.filter((user: any) => user.hasEmailDay);
        const usersWithoutEmailDay = allUsers.filter((user: any) => !user.hasEmailDay);
        
        return Response.json({
          totalUsers: allUsers.length,
          usersWithEmailDay: usersWithEmailDay.length,
          usersWithoutEmailDay: usersWithoutEmailDay.length,
          usersWithEmailDayDetails: usersWithEmailDay,
          usersWithoutEmailDayDetails: usersWithoutEmailDay
        });

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    // console.error("Error in test email automation:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    message: "Email automation test endpoint",
    actions: ["add-user", "get-status", "update-email-day", "debug-user"],
    example: {
      action: "add-user",
      email: "user@example.com",
      name: "User Name",
      userId: "user-id"
    }
  });
} 