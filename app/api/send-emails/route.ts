import admin from "firebase-admin";
import { Resend } from "resend";
import { 
  day1Template,
  day2Template, 
  day3Template, 
  day4Template, 
  day5Template, 
  day6Template, 
  day7Template 
} from "./templates";

// Init Resend with retry logic
const resend = new Resend(process.env.RESEND_API_KEY);

// Init Firebase Admin SDK
if (!admin.apps.length) {
  // Use the specified environment variables
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

// Rate limiting configuration
const RATE_LIMIT = {
  maxEmailsPerHour: 1000,
  maxEmailsPerDay: 10000,
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// Store email templates for all days (Day 1-7)
const emailTemplates = {
  1: day1Template,
  2: day2Template,
  3: day3Template,
  4: day4Template,
  5: day5Template,
  6: day6Template,
  7: day7Template,
};

// Rate limiting and monitoring
let emailCounts = {
  hourly: 0,
  daily: 0,
  lastReset: new Date()
};

// Reset counters
function resetCounters() {
  const now = new Date();
  const hoursSinceReset = (now.getTime() - emailCounts.lastReset.getTime()) / (1000 * 60 * 60);
  const daysSinceReset = hoursSinceReset / 24;

  if (hoursSinceReset >= 1) {
    emailCounts.hourly = 0;
    emailCounts.lastReset = now;
  }

  if (daysSinceReset >= 1) {
    emailCounts.daily = 0;
  }
}

// Check rate limits
function checkRateLimit(): boolean {
  resetCounters();
  return emailCounts.hourly < RATE_LIMIT.maxEmailsPerHour && 
         emailCounts.daily < RATE_LIMIT.maxEmailsPerDay;
}

// Send email with retry logic
async function sendEmailWithRetry(emailData: any, retries = 0): Promise<boolean> {
  try {
    await resend.emails.send(emailData);
    return true;
  } catch (error) {
    // console.error(`Email send attempt ${retries + 1} failed:`, error);
    
    if (retries < RATE_LIMIT.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay * (retries + 1)));
      return sendEmailWithRetry(emailData, retries + 1);
    }
    
    return false;
  }
}

/**
 * Log analytics event
 */
async function logAnalyticsEvent(eventName: string, data: any) {
  try {
    await db.collection("analytics").add({
      event: eventName,
      data: data,
      timestamp: admin.firestore.Timestamp.fromDate(new Date()),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    // console.error("Error logging analytics event:", error);
    // Don't throw - analytics logging shouldn't break main functionality
  }
}

export async function GET() {
  const startTime = Date.now();
  let emailsSent = 0;
  let errors: any[] = [];
  let skippedUsers = 0;
  let debugLog: string[] = [];

  try {
    debugLog.push(`[${new Date().toISOString()}] Starting email automation cron job`);
    debugLog.push(`Environment: ${process.env.NODE_ENV}`);
    debugLog.push(`Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
    debugLog.push(`Resend configured: ${!!process.env.RESEND_API_KEY}`);

    // Check rate limits
    if (!checkRateLimit()) {
      debugLog.push(`❌ Rate limit exceeded - hourly: ${emailCounts.hourly}, daily: ${emailCounts.daily}`);
      return Response.json({ 
        error: "Rate limit exceeded",
        hourlyCount: emailCounts.hourly,
        dailyCount: emailCounts.daily,
        debugLog: debugLog.join('\n')
      }, { status: 429 });
    }

    // Get all active users
    const snapshot = await db.collection("users")
      .where("emailAutomationStatus", "==", "active")
      .get();

    debugLog.push(`📊 Found ${snapshot.docs.length} active users`);

    for (const doc of snapshot.docs) {
      const user = doc.data();
      debugLog.push(`\n--- Processing user: ${user.email} ---`);

      try {
        // Handle signupDate safely - it might be a Firestore Timestamp, Date, or string
        let signupDate: Date;
        if (user.emailAutomationSignupDate) {
          if (user.emailAutomationSignupDate.toDate) {
            // Firestore Timestamp
            signupDate = user.emailAutomationSignupDate.toDate();
          } else if (user.emailAutomationSignupDate instanceof Date) {
            // Already a Date object
            signupDate = user.emailAutomationSignupDate;
          } else {
            // String or other format
            signupDate = new Date(user.emailAutomationSignupDate);
          }
        } else {
          // Fallback to current date if signupDate is missing
          signupDate = new Date();
          debugLog.push(`⚠️ Missing emailAutomationSignupDate for user ${user.email}, using current date as fallback`);
        }

        // Calculate days since signup
        const daysSinceSignup = Math.floor(
          (Date.now() - signupDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;

        debugLog.push(`Signup date: ${signupDate.toISOString()}`);
        debugLog.push(`Days since signup: ${daysSinceSignup}`);
        debugLog.push(`Current emailDay: ${user.emailDay || 0}`);

        // Handle users at emailDay 0 - increment to emailDay 1 first
        let currentEmailDay = user.emailDay || 0;
        if (currentEmailDay === 0) {
          debugLog.push(`🔄 User at emailDay 0 - incrementing to emailDay 1`);
          try {
            await db.collection("users").doc(doc.id).update({
              emailDay: 1,
              updatedAt: admin.firestore.Timestamp.fromDate(new Date())
            });
            currentEmailDay = 1;
            debugLog.push(`✅ Updated user to emailDay 1`);
          } catch (updateError) {
            debugLog.push(`❌ Failed to update user to emailDay 1: ${updateError}`);
            // Continue with current logic even if update fails
          }
        }

        // Check if user needs the next email in sequence
        const nextEmailToSend = currentEmailDay + 1; // emailDay 1 → send Day 2, emailDay 2 → send Day 3, etc.
        debugLog.push(`Current emailDay: ${currentEmailDay}, Next email to send: Day ${nextEmailToSend}`);

        if (
          currentEmailDay >= 1 &&
          currentEmailDay <= 6
        ) {
          const template = emailTemplates[nextEmailToSend as keyof typeof emailTemplates];

          if (!template) {
            debugLog.push(`❌ No template found for day ${nextEmailToSend}`);
            continue;
          }

          debugLog.push(`✅ Template found for day ${nextEmailToSend}`);

          // Check rate limits again before sending
          if (!checkRateLimit()) {
            debugLog.push(`❌ Rate limit reached during processing`);
            break;
          }

          // Get user's name with fallback
          const userName = user.displayName || user.firstName || user.name || 'Healthcare Professional';
          debugLog.push(`User name: ${userName}`);
          
          // Prepare email data with personalization and unsubscribe links
          const emailData = {
            from: "DR. INFO <noreply@drinfo.ai>",
            to: user.email,
            subject: template.subject,
            html: template.html
              .replace(/\{\{name\}\}/g, userName)
              .replace('{{unsubscribe_url}}', `https://app.drinfo.ai/unsubscribe?email=${encodeURIComponent(user.email)}`)
          };

          debugLog.push(`Prepared email data for ${user.email}`);

          // Send email with retry logic
          const emailSent = await sendEmailWithRetry(emailData);
          
          if (emailSent) {
            // Update user's emailDay and stats
            const newEmailDay = currentEmailDay + 1;
            const isCompleted = newEmailDay === 7; // Mark as completed when reaching emailDay 7
            
            await db.collection("users").doc(doc.id).update({
              emailDay: newEmailDay,
              lastEmailSent: admin.firestore.Timestamp.fromDate(new Date()),
              totalEmailsSent: (user.totalEmailsSent || 0) + 1,
              emailAutomationStatus: isCompleted ? 'completed' : 'active',
              updatedAt: admin.firestore.Timestamp.fromDate(new Date())
            });

            debugLog.push(`✅ Sent Day ${nextEmailToSend} email to ${user.email} and updated emailDay to ${newEmailDay}${isCompleted ? ' (COMPLETED)' : ''}`);
            emailsSent++;
            emailCounts.hourly++;
            emailCounts.daily++;

            // Log analytics
            await logAnalyticsEvent('email_sent', {
              email: user.email,
              userId: doc.id,
              emailDay: newEmailDay,
              template: `day_${nextEmailToSend}`
            });
          } else {
            debugLog.push(`❌ Failed to send email to ${user.email} after retries`);
            errors.push({ 
              email: user.email, 
              error: "Failed to send email after retries",
              day: nextEmailToSend 
            });
          }
        } else if (user.emailDay >= 7) {
          // User has completed the email sequence
          debugLog.push(`✅ User ${user.email} has completed email sequence (emailDay: ${user.emailDay})`);
          skippedUsers++;
        } else {
          debugLog.push(`⚠️ User ${user.email} not ready for email (currentEmailDay: ${currentEmailDay})`);
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

    // Log analytics for the run
    await logAnalyticsEvent('email_automation_run', {
      emailsSent,
      errors: errors.length,
      skippedUsers,
      processingTime,
      hourlyCount: emailCounts.hourly,
      dailyCount: emailCounts.daily
    });

    return Response.json({ 
      message: "Emails processed successfully.", 
      emailsSent, 
      errors: errors.length > 0 ? errors : undefined,
      skippedUsers,
      processingTime,
      rateLimit: {
        hourlyCount: emailCounts.hourly,
        dailyCount: emailCounts.daily
      },
      debugLog: debugLog.join('\n')
    });
  } catch (error) {
    // console.error("Email automation error:", error);
    
    // Log error
    await logAnalyticsEvent('email_automation_error', {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: Date.now() - startTime
    });
    
    return Response.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 