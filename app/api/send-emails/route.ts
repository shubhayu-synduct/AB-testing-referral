import admin from "firebase-admin";
import { Resend } from "resend";

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

// Store all 7 email templates in an object
const emailTemplates = {
  1: {
    subject: "Welcome to Dr.Info – Fast, Evidence-Based Answers at Your Fingertips",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Dr.Info</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .unsubscribe { text-align: center; padding: 10px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to Dr.Info</h1>
          <p>Your AI-Powered Medical Assistant</p>
        </div>
        <div class="content">
          <h2>You've just joined a growing community of healthcare professionals who are getting faster, more accurate answers to their clinical questions.</h2>
          <p>Dr.Info combines the latest medical research with advanced AI to provide you with evidence-based answers in seconds, not hours.</p>
          <p><strong>What you can do right now:</strong></p>
          <ul>
            <li>Ask complex medical questions and get instant answers</li>
            <li>Access the latest clinical guidelines and research</li>
            <li>Generate detailed medical reports and summaries</li>
            <li>Get drug information and interaction alerts</li>
          </ul>
          <a href="https://drinfo.ai" class="button">Start Using Dr.Info Now</a>
          <p>We're excited to see how Dr.Info helps you provide better care to your patients.</p>
          <p>Best regards,<br>The Dr.Info Team</p>
        </div>
        <div class="footer">
          <p>© 2024 Dr.Info. All rights reserved.</p>
        </div>
        <div class="unsubscribe">
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
        </div>
      </body>
      </html>
    `,
  },
  2: {
    subject: "How to Ask Smarter Questions in Dr.Info",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Get More Precise Answers with Better Prompts</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .tip { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0; }
          .unsubscribe { text-align: center; padding: 10px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Get More Precise Answers with Better Prompts</h1>
        </div>
        <div class="content">
          <h2>The secret to getting the best out of Dr.Info? It starts with how you ask.</h2>
          <p>Just like in medicine, the quality of your question determines the quality of your answer. Here are some pro tips to get the most accurate responses:</p>
          
          <div class="tip">
            <h3>💡 Pro Tip: Be Specific</h3>
            <p><strong>Instead of:</strong> "What about diabetes?"<br>
            <strong>Try:</strong> "What are the latest treatment guidelines for type 2 diabetes in adults with cardiovascular disease?"</p>
          </div>
          
          <div class="tip">
            <h3>💡 Pro Tip: Include Context</h3>
            <p><strong>Instead of:</strong> "Side effects of metformin"<br>
            <strong>Try:</strong> "What are the common side effects of metformin in elderly patients with renal impairment?"</p>
          </div>
          
          <div class="tip">
            <h3>💡 Pro Tip: Ask for Evidence</h3>
            <p><strong>Instead of:</strong> "Is this treatment effective?"<br>
            <strong>Try:</strong> "What is the evidence base for using SGLT2 inhibitors in heart failure patients?"</p>
          </div>
          
          <a href="https://drinfo.ai" class="button">Try a Smarter Prompt Now</a>
          
          <p>Remember: The more specific and detailed your question, the more precise and actionable your answer will be.</p>
        </div>
        <div class="footer">
          <p>© 2024 Dr.Info. All rights reserved.</p>
        </div>
        <div class="unsubscribe">
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
        </div>
      </body>
      </html>
    `,
  },
  3: {
    subject: "NEW: Turn Complex Queries into Instant Visual Abstracts",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Medical Question. Now in One Powerful Image.</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .feature { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .unsubscribe { text-align: center; padding: 10px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Your Medical Question. Now in One Powerful Image.</h1>
        </div>
        <div class="content">
          <h2>Ever wished you could see the answer to a complex question?</h2>
          <p>We're excited to introduce <strong>Visual Abstracts</strong> - a revolutionary new feature that transforms your medical queries into clear, comprehensive visual summaries.</p>
          
          <div class="feature">
            <h3>🎯 What are Visual Abstracts?</h3>
            <p>Visual Abstracts are AI-generated diagrams that break down complex medical concepts into easy-to-understand visual representations. Perfect for:</p>
            <ul>
              <li>Understanding treatment pathways</li>
              <li>Visualizing drug mechanisms</li>
              <li>Explaining procedures to patients</li>
              <li>Creating educational materials</li>
            </ul>
          </div>
          
          <div class="feature">
            <h3>⚡ How it Works</h3>
            <p>Simply ask any medical question, and Dr.Info will generate both a detailed text response AND a visual abstract that captures the key points in an easy-to-scan format.</p>
          </div>
          
          <a href="https://drinfo.ai" class="button">Generate Your First Visual Abstract</a>
          
          <p><strong>Available now for all users!</strong> Try asking questions like:</p>
          <ul>
            <li>"Show me the mechanism of action of ACE inhibitors"</li>
            <li>"Create a visual of the treatment algorithm for hypertension"</li>
            <li>"Explain the pathophysiology of diabetes with a diagram"</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2024 Dr.Info. All rights reserved.</p>
        </div>
        <div class="unsubscribe">
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
        </div>
      </body>
      </html>
    `,
  },
  4: {
    subject: "Case Study: Dr.Info in Real Life",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dr.Info in Action</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .case-study { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .unsubscribe { text-align: center; padding: 10px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dr.Info in Action</h1>
        </div>
        <div class="content">
          <h2>See how Dr.Info helped in a real-life high-stakes case</h2>
          
          <div class="case-study">
            <h3>🏥 Real Case Study: Emergency Department</h3>
            <p><strong>Scenario:</strong> A 65-year-old patient presents with chest pain and multiple comorbidities including diabetes, hypertension, and chronic kidney disease.</p>
            
            <p><strong>The Challenge:</strong> The attending physician needed to quickly assess the patient's risk factors, determine appropriate diagnostic tests, and consider drug interactions with the patient's current medications.</p>
            
            <p><strong>How Dr.Info Helped:</strong></p>
            <ul>
              <li>Provided instant access to the latest chest pain evaluation guidelines</li>
              <li>Generated a comprehensive drug interaction report for the patient's medications</li>
              <li>Created a visual abstract showing the diagnostic algorithm</li>
              <li>Identified specific considerations for patients with CKD</li>
            </ul>
            
            <p><strong>Result:</strong> The physician was able to make an informed decision in minutes rather than hours, potentially saving the patient's life.</p>
          </div>
          
          <p>This is just one example of how Dr.Info is helping healthcare professionals make better decisions faster.</p>
          
          <a href="https://drinfo.ai" class="button">Read More Case Studies</a>
          
          <p><strong>Your turn:</strong> What challenging case could Dr.Info help you with today?</p>
        </div>
        <div class="footer">
          <p>© 2024 Dr.Info. All rights reserved.</p>
        </div>
        <div class="unsubscribe">
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
        </div>
      </body>
      </html>
    `,
  },
  5: {
    subject: "Where Does the Info Come From? See Every Source, Every Time",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Full Transparency</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .transparency { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
          .unsubscribe { text-align: center; padding: 10px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Full Transparency</h1>
        </div>
        <div class="content">
          <h2>Every answer is backed by real medical sources</h2>
          <p>In medicine, trust is everything. That's why Dr.Info provides complete transparency about where every piece of information comes from.</p>
          
          <div class="transparency">
            <h3>🔍 Our Sources Include:</h3>
            <ul>
              <li><strong>Peer-reviewed journals:</strong> PubMed, JAMA, NEJM, Lancet</li>
              <li><strong>Clinical guidelines:</strong> AHA, ACC, ADA, ACP</li>
              <li><strong>Drug databases:</strong> FDA, WHO, Micromedex</li>
              <li><strong>Medical textbooks:</strong> Harrison's, UpToDate, DynaMed</li>
              <li><strong>Clinical trials:</strong> ClinicalTrials.gov, Cochrane</li>
            </ul>
          </div>
          
          <h3>📚 How Source Transparency Works</h3>
          <p>Every time Dr.Info provides an answer, you'll see:</p>
          <ul>
            <li>Direct links to the original sources</li>
            <li>Publication dates and authors</li>
            <li>Study methodologies and limitations</li>
            <li>Confidence levels for each claim</li>
          </ul>
          
          <p>This means you can always verify the information and make informed decisions based on the latest evidence.</p>
          
          <a href="https://drinfo.ai" class="button">See the Sources</a>
          
          <p><strong>No black boxes.</strong> No hidden algorithms. Just transparent, evidence-based medicine.</p>
        </div>
        <div class="footer">
          <p>© 2024 Dr.Info. All rights reserved.</p>
        </div>
        <div class="unsubscribe">
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
        </div>
      </body>
      </html>
    `,
  },
  6: {
    subject: "All the Ways Dr.Info Works for You — At a Glance",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Clinical Assistant</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .feature { background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
          .unsubscribe { text-align: center; padding: 10px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Your Clinical Assistant</h1>
        </div>
        <div class="content">
          <h2>Here's everything Dr.Info can do for you</h2>
          <p>From quick lookups to complex case analysis, Dr.Info is your comprehensive medical AI assistant.</p>
          
          <div class="feature-grid">
            <div class="feature">
              <h3>🔍 Quick Diagnostics</h3>
              <p>Get instant differential diagnoses based on symptoms and patient history</p>
            </div>
            <div class="feature">
              <h3>💊 Drug Information</h3>
              <p>Comprehensive drug data, interactions, and dosing guidelines</p>
            </div>
            <div class="feature">
              <h3>📊 Visual Abstracts</h3>
              <p>Generate clear visual representations of complex medical concepts</p>
            </div>
            <div class="feature">
              <h3>📋 Clinical Guidelines</h3>
              <p>Access the latest treatment protocols and best practices</p>
            </div>
            <div class="feature">
              <h3>🔬 Research Summaries</h3>
              <p>Get concise summaries of the latest medical research</p>
            </div>
            <div class="feature">
              <h3>📝 Report Generation</h3>
              <p>Create detailed medical reports and documentation</p>
            </div>
          </div>
          
          <h3>🎯 Perfect For:</h3>
          <ul>
            <li><strong>Physicians:</strong> Quick clinical decision support</li>
            <li><strong>Nurses:</strong> Patient education and care planning</li>
            <li><strong>Pharmacists:</strong> Drug consultation and safety checks</li>
            <li><strong>Students:</strong> Learning and exam preparation</li>
            <li><strong>Researchers:</strong> Literature review and data analysis</li>
          </ul>
          
          <a href="https://drinfo.ai" class="button">Put Dr.Info to Work</a>
          
          <p>Ready to see how Dr.Info can transform your clinical workflow?</p>
        </div>
        <div class="footer">
          <p>© 2024 Dr.Info. All rights reserved.</p>
        </div>
        <div class="unsubscribe">
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
        </div>
      </body>
      </html>
    `,
  },
  7: {
    subject: "Your Premium Access Ends Today—Don't Miss What's Next",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upgrade to Premium</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .urgent { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffc107; }
          .premium-features { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .unsubscribe { text-align: center; padding: 10px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Upgrade to Premium</h1>
        </div>
        <div class="content">
          <div class="urgent">
            <h2>⏰ Your early access ends today!</h2>
            <p>Don't lose access to the advanced features that are helping healthcare professionals save time and improve patient care.</p>
          </div>
          
          <h2>Unlock unlimited Visual Abstracts and more with Premium</h2>
          
          <div class="premium-features">
            <h3>🚀 Premium Features:</h3>
            <ul>
              <li><strong>Unlimited Visual Abstracts:</strong> Generate as many visual summaries as you need</li>
              <li><strong>Advanced Analytics:</strong> Track your usage patterns and insights</li>
              <li><strong>Priority Support:</strong> Get help when you need it most</li>
              <li><strong>Custom Templates:</strong> Save and reuse your favorite prompts</li>
              <li><strong>Bulk Operations:</strong> Process multiple queries at once</li>
              <li><strong>API Access:</strong> Integrate Dr.Info into your existing workflows</li>
            </ul>
          </div>
          
          <h3>💡 What You'll Miss:</h3>
          <ul>
            <li>Visual Abstract generation (limited to 5 per month)</li>
            <li>Advanced search capabilities</li>
            <li>Priority processing</li>
            <li>Custom integrations</li>
          </ul>
          
          <a href="https://drinfo.ai" class="button">Go Premium Now</a>
          
          <p><strong>Special Offer:</strong> Upgrade today and get 20% off your first year!</p>
          
          <p>Thank you for being part of the Dr.Info community. We're excited to continue helping you provide better care to your patients.</p>
        </div>
        <div class="footer">
          <p>© 2024 Dr.Info. All rights reserved.</p>
        </div>
        <div class="unsubscribe">
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
        </div>
      </body>
      </html>
    `,
  },
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

        // Check if within 7 days and needs a new email
        const nextEmailDay = (user.emailDay || 0) + 1;
        if (
          nextEmailDay >= 1 &&
          nextEmailDay <= 7
          // Removed the daysSinceSignup restriction to make it more permissive
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

          // Prepare email data with unsubscribe links using NEXT_PUBLIC_BASE_URL
          const emailData = {
            from: "Dr.Info <noreply@drinfo.ai>",
            to: user.email,
            subject: template.subject,
            html: template.html
              .replace('{{unsubscribe_url}}', `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`)
              .replace('{{preferences_url}}', `${process.env.NEXT_PUBLIC_BASE_URL}/email-preferences?email=${encodeURIComponent(user.email)}`),
            reply_to: "support@drinfo.ai"
          };

          // Send email with retry logic
          const emailSent = await sendEmailWithRetry(emailData);
          
          if (emailSent) {
            // Update user's emailDay and stats
            await db.collection("users").doc(doc.id).update({
              emailDay: nextEmailDay,
              lastEmailSent: admin.firestore.Timestamp.fromDate(new Date()),
              totalEmailsSent: (user.totalEmailsSent || 0) + 1,
              emailAutomationStatus: 'active', // Ensure status remains active
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