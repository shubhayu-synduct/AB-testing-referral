import admin from "firebase-admin";
import { Resend } from "resend";
import { 
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

// Store email templates starting from Day 2 (Day 1 is sent right after authentication/onboarding)
const emailTemplates = {
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
    console.error(`Email send attempt ${retries + 1} failed:`, error);
    
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
    console.error("Error logging analytics event:", error);
    // Don't throw - analytics logging shouldn't break main functionality
  }
}

export async function GET() {
  const startTime = Date.now();
  let emailsSent = 0;
  let errors: any[] = [];
  let skippedUsers = 0;

  try {
    // Check rate limits
    if (!checkRateLimit()) {
      console.warn("Rate limit exceeded");
      return Response.json({ 
        error: "Rate limit exceeded",
        hourlyCount: emailCounts.hourly,
        dailyCount: emailCounts.daily
      }, { status: 429 });
    }

    // Get all active users
    const snapshot = await db.collection("users")
      .where("emailAutomationStatus", "==", "active")
      .get();

    console.log(`Processing ${snapshot.docs.length} active users`);

    for (const doc of snapshot.docs) {
      const user = doc.data();

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
          console.warn(`Missing emailAutomationSignupDate for user ${user.email}, using current date as fallback`);
        }

        // Calculate days since signup
        const daysSinceSignup = Math.floor(
          (Date.now() - signupDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;

        // Check if within 7 days and needs a new email (starting from Day 2)
        const nextEmailDay = (user.emailDay || 0) + 1;
        if (
          nextEmailDay >= 2 &&
          nextEmailDay <= 7
        ) {
          const template = emailTemplates[nextEmailDay as keyof typeof emailTemplates];

          if (!template) {
            console.warn(`No template found for day ${nextEmailDay}`);
            continue;
          }

          // Check rate limits again before sending
          if (!checkRateLimit()) {
            console.warn("Rate limit reached during processing");
            break;
          }

          // Get user's name with fallback
          const userName = user.displayName || user.firstName || user.name || 'Healthcare Professional';
          
          // Prepare email data with personalization and unsubscribe links
          const emailData = {
            from: "DR. INFO <noreply@drinfo.ai>",
            to: user.email,
            subject: template.subject,
            html: template.html
              .replace(/\{\{name\}\}/g, userName)
              .replace('{{unsubscribe_url}}', `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`)
          };

          // Send email with retry logic
          const emailSent = await sendEmailWithRetry(emailData);
          
          if (emailSent) {
            // Update user's emailDay and stats
            await db.collection("users").doc(doc.id).update({
              emailDay: nextEmailDay,
              lastEmailSent: admin.firestore.Timestamp.fromDate(new Date()),
              totalEmailsSent: (user.totalEmailsSent || 0) + 1,
              emailAutomationStatus: nextEmailDay === 7 ? 'completed' : 'active', // Mark as completed after day 7 (6 emails total)
              updatedAt: admin.firestore.Timestamp.fromDate(new Date())
            });

            console.log(`Sent Day ${nextEmailDay} email to ${user.email}`);
            emailsSent++;
            emailCounts.hourly++;
            emailCounts.daily++;

            // Log analytics
            await logAnalyticsEvent('email_sent', {
              email: user.email,
              userId: doc.id,
              emailDay: nextEmailDay,
              template: `day_${nextEmailDay}`
            });
          } else {
            errors.push({ 
              email: user.email, 
              error: "Failed to send email after retries",
              day: nextEmailDay 
            });
          }
        } else if (user.emailDay >= 7) {
          // User has completed the 6-day sequence (Day 2-7)
          skippedUsers++;
          console.log(`User ${user.email} has completed email sequence (day ${user.emailDay})`);
        } else {
          skippedUsers++;
        }
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errors.push({ 
          email: user.email, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const processingTime = Date.now() - startTime;

    // Log summary
    console.log(`Email automation completed: ${emailsSent} sent, ${errors.length} errors, ${skippedUsers} skipped, ${processingTime}ms`);

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
      }
    });
  } catch (error) {
    console.error("Email automation error:", error);
    
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