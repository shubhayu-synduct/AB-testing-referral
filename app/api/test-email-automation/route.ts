import admin from "firebase-admin";
import { Resend } from "resend";
import { 
  day2Template, 
  day3Template, 
  day4Template, 
  day5Template, 
  day6Template, 
  day7Template 
} from "../send-emails/templates";

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

const emailTemplates = {
  2: day2Template,
  3: day3Template,
  4: day4Template,
  5: day5Template,
  6: day6Template,
  7: day7Template,
};

export async function POST(request: Request) {
  const { testMode, userEmail, forceEmailDay } = await request.json();
  
  const startTime = Date.now();
  let emailsSent = 0;
  let errors: any[] = [];
  let skippedUsers = 0;
  let debugLog: string[] = [];

  try {
    debugLog.push(`[${new Date().toISOString()}] Starting email automation test`);
    debugLog.push(`Environment: ${process.env.NODE_ENV}`);
    debugLog.push(`Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
    debugLog.push(`Resend configured: ${!!process.env.RESEND_API_KEY}`);

    // Get all active users
    const snapshot = await db.collection("users")
      .where("emailAutomationStatus", "==", "active")
      .get();

    debugLog.push(`Found ${snapshot.docs.length} active users`);

    for (const doc of snapshot.docs) {
      const user = doc.data();
      debugLog.push(`\n--- Processing user: ${user.email} ---`);

      try {
        // Handle signupDate safely
        let signupDate: Date;
        if (user.emailAutomationSignupDate) {
          if (user.emailAutomationSignupDate.toDate) {
            signupDate = user.emailAutomationSignupDate.toDate();
          } else if (user.emailAutomationSignupDate instanceof Date) {
            signupDate = user.emailAutomationSignupDate;
          } else {
            signupDate = new Date(user.emailAutomationSignupDate);
          }
        } else {
          signupDate = new Date();
          debugLog.push(`⚠️ Missing emailAutomationSignupDate for user ${user.email}, using current date as fallback`);
        }

        // Calculate days since signup
        const daysSinceSignup = Math.floor(
          (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        debugLog.push(`Signup date: ${signupDate.toISOString()}`);
        debugLog.push(`Days since signup: ${daysSinceSignup}`);
        debugLog.push(`Current emailDay: ${user.emailDay || 0}`);

        // Check if within 7 days and needs a new email (starting from Day 2)
        const nextEmailDay = forceEmailDay || (user.emailDay || 0) + 1;
        debugLog.push(`Next email day: ${nextEmailDay}`);

        if (
          nextEmailDay >= 2 &&
          nextEmailDay <= 7
        ) {
          const template = emailTemplates[nextEmailDay as keyof typeof emailTemplates];

          if (!template) {
            debugLog.push(`❌ No template found for day ${nextEmailDay}`);
            continue;
          }

          debugLog.push(`✅ Template found for day ${nextEmailDay}`);

          // Get user's name with fallback
          const userName = user.displayName || user.firstName || user.name || 'Healthcare Professional';
          debugLog.push(`User name: ${userName}`);

          // Prepare email data
          const emailData = {
            from: "DR. INFO <noreply@drinfo.ai>",
            to: user.email,
            subject: template.subject,
            html: template.html
              .replace(/\{\{name\}\}/g, userName)
              .replace('{{unsubscribe_url}}', `https://app.drinfo.ai/unsubscribe?email=${encodeURIComponent(user.email)}`)
          };

          debugLog.push(`Prepared email data for ${user.email}`);

          if (testMode) {
            debugLog.push(`🧪 TEST MODE: Would send Day ${nextEmailDay} email to ${user.email}`);
            debugLog.push(`Subject: ${emailData.subject}`);
            
            // Simulate successful send in test mode
            emailsSent++;
            debugLog.push(`✅ TEST: Email sent successfully`);
          } else {
            // Actually send email
            try {
              const emailResponse = await resend.emails.send(emailData);
              debugLog.push(`📧 Email sent via Resend: ${JSON.stringify(emailResponse)}`);
              
              if (emailResponse) {
                // Update user's emailDay and stats
                await db.collection("users").doc(doc.id).update({
                  emailDay: nextEmailDay,
                  lastEmailSent: admin.firestore.Timestamp.fromDate(new Date()),
                  totalEmailsSent: (user.totalEmailsSent || 0) + 1,
                  emailAutomationStatus: nextEmailDay === 7 ? 'completed' : 'active',
                  updatedAt: admin.firestore.Timestamp.fromDate(new Date())
                });

                debugLog.push(`✅ Updated user ${user.email} to emailDay ${nextEmailDay}`);
                emailsSent++;
              } else {
                debugLog.push(`❌ Failed to send email to ${user.email}`);
                errors.push({ 
                  email: user.email, 
                  error: "No response from Resend",
                  day: nextEmailDay 
                });
              }
            } catch (emailError) {
              debugLog.push(`❌ Error sending email to ${user.email}: ${emailError}`);
              errors.push({ 
                email: user.email, 
                error: emailError instanceof Error ? emailError.message : "Unknown error",
                day: nextEmailDay 
              });
            }
          }
        } else if (user.emailDay >= 7) {
          debugLog.push(`✅ User ${user.email} has completed email sequence (day ${user.emailDay})`);
          skippedUsers++;
        } else {
          debugLog.push(`⚠️ User ${user.email} not ready for email (nextEmailDay: ${nextEmailDay})`);
          skippedUsers++;
        }
      } catch (error) {
        debugLog.push(`❌ Error processing user ${user.email}: ${error}`);
        errors.push({ 
          email: user.email, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const processingTime = Date.now() - startTime;
    debugLog.push(`\n--- Summary ---`);
    debugLog.push(`Emails sent: ${emailsSent}`);
    debugLog.push(`Errors: ${errors.length}`);
    debugLog.push(`Skipped: ${skippedUsers}`);
    debugLog.push(`Processing time: ${processingTime}ms`);

    return Response.json({ 
      message: "Email automation test completed", 
      emailsSent, 
      errors: errors.length > 0 ? errors : undefined,
      skippedUsers,
      processingTime,
      debugLog: debugLog.join('\n'),
      testMode: !!testMode
    });
  } catch (error) {
    debugLog.push(`❌ Email automation test error: ${error}`);
    return Response.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      debugLog: debugLog.join('\n')
    }, { status: 500 });
  }
}