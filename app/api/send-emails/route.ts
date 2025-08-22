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
    subject: "Welcome to DR.INFO 2025 – Fast, Evidence-Based Answers at Your Fingertips",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DR.INFO 2025</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header-section { padding: 24px 20px; background-color: white; text-align: center; border-bottom: 2px solid rgba(55, 113, 254, 0.1); }
          .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 16px; }
          .main-content { padding: 0 20px 24px; }
          .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #223258; }
          .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; color: #223258; }
          .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
          .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
          .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
          .feature-list { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .feature-list li { margin-bottom: 8px; font-size: 16px; color: #000000; }
          .button { display: inline-block; background: #3771FE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; text-align: center; }
          .footer-section { border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 20px; margin-top: 32px; text-align: center; }
          .footer-text { font-size: 16px; font-weight: 600; color: #223258; }
          .unsubscribe { text-align: center; padding: 10px; color: #666; font-size: 12px; }
          .unsubscribe a { color: #3771FE; text-decoration: underline; }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 0; }
            .header-section { padding: 20px 16px; }
            .main-content { padding: 0 16px 20px; }
            .card { padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 20px; }
            .card-subtitle { font-size: 16px; }
            .section-title { font-size: 16px; }
            .section-text { font-size: 15px; }
            .feature-list { padding-left: 16px; }
            .feature-list li { font-size: 15px; }
            .greeting { font-size: 16px; }
            .intro-text { font-size: 15px; }
            .footer-text { font-size: 15px; }
          }
          
          @media only screen and (max-width: 480px) {
            .header-section { padding: 16px 12px; }
            .main-content { padding: 0 12px 16px; }
            .card { padding: 16px; }
            .card-title { font-size: 18px; }
            .card-subtitle { font-size: 15px; }
            .section-title { font-size: 15px; }
            .section-text { font-size: 14px; }
            .feature-list li { font-size: 14px; }
            .greeting { font-size: 15px; }
            .intro-text { font-size: 14px; }
            .footer-text { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-section">
            <img src="https://app.drinfo.ai/login-logo.png" alt="DR.INFO Logo" class="logo" />
            <h1 class="card-title">Welcome to DR.INFO 2025</h1>
            <p class="card-subtitle">Your AI-Powered Medical Assistant</p>
          </div>
          
          <div class="main-content">
            <div class="card">
              <p class="greeting">Dear Healthcare Professional,</p>
              <p class="intro-text">You've just joined a growing community of healthcare professionals who are getting faster, more accurate answers to their clinical questions.</p>
              <p class="intro-text">DR.INFO combines the latest medical research with advanced AI to provide you with evidence-based answers in seconds, not hours.</p>
              
              <div style="margin-bottom: 24px;">
                <h2 class="section-title">What you can do right now:</h2>
                <ul class="feature-list">
                  <li>Ask complex medical questions and get instant answers</li>
                  <li>Access the latest clinical guidelines and research</li>
                  <li>Generate detailed medical reports and summaries</li>
                  <li>Get drug information and interaction alerts</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="https://app.drinfo.ai" class="button">Start Using DR.INFO Now</a>
              </div>
              
              <p class="intro-text">We're excited to see how DR.INFO helps you provide better care to your patients.</p>
              <p class="footer-text">Best regards,<br>The DR.INFO Team</p>
            </div>
          </div>
          
          <div class="footer-section">
            <p class="footer-text">© 2025 DR.INFO by Synduct. All rights reserved.</p>
            <div class="unsubscribe">
              <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  2: {
    subject: "How to Ask Smarter Questions in DR.INFO 2025",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Get More Precise Answers with Better Prompts</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header-section { padding: 24px 20px; background-color: white; text-align: center; border-bottom: 2px solid rgba(55, 113, 254, 0.1); }
          .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 16px; }
          .main-content { padding: 0 20px 24px; }
          .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #223258; }
          .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; color: #223258; }
          .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
          .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
          .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
          .tip { background: rgba(55, 113, 254, 0.1); padding: 20px; border-left: 4px solid #3771FE; margin: 20px 0; border-radius: 8px; }
          .tip h3 { color: #3771FE; margin-bottom: 12px; }
          .tip strong { color: #223258; }
          .button { display: inline-block; background: #3771FE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; text-align: center; }
          .footer-section { border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 20px; margin-top: 32px; text-align: center; }
          .footer-text { font-size: 16px; font-weight: 600; color: #223258; }
          .unsubscribe { text-align: center; padding: 10px; color: #666; font-size: 12px; }
          .unsubscribe a { color: #3771FE; text-decoration: underline; }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 0; }
            .header-section { padding: 20px 16px; }
            .main-content { padding: 0 16px 20px; }
            .card { padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 20px; }
            .card-subtitle { font-size: 16px; }
            .section-title { font-size: 16px; }
            .section-text { font-size: 15px; }
            .tip { padding: 16px; }
            .greeting { font-size: 16px; }
            .intro-text { font-size: 15px; }
            .footer-text { font-size: 15px; }
          }
          
          @media only screen and (max-width: 480px) {
            .header-section { padding: 16px 12px; }
            .main-content { padding: 0 12px 16px; }
            .card { padding: 16px; }
            .card-title { font-size: 18px; }
            .card-subtitle { font-size: 15px; }
            .section-title { font-size: 15px; }
            .section-text { font-size: 14px; }
            .tip { padding: 12px; }
            .greeting { font-size: 15px; }
            .intro-text { font-size: 14px; }
            .footer-text { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-section">
            <img src="https://app.drinfo.ai/login-logo.png" alt="DR.INFO Logo" class="logo" />
            <h1 class="card-title">Get More Precise Answers with Better Prompts</h1>
            <p class="card-subtitle">Master the Art of Questioning in DR.INFO</p>
          </div>
          
          <div class="main-content">
            <div class="card">
              <p class="greeting">Dear Healthcare Professional,</p>
              <p class="intro-text">The secret to getting the best out of DR.INFO? It starts with how you ask.</p>
              <p class="intro-text">Just like in medicine, the quality of your question determines the quality of your answer. Here are some pro tips to get the most accurate responses:</p>
              
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
              
              <div style="text-align: center;">
                <a href="https://app.drinfo.ai" class="button">Try a Smarter Prompt Now</a>
              </div>
              
              <p class="intro-text">Remember: The more specific and detailed your question, the more precise and actionable your answer will be.</p>
            </div>
          </div>
          
          <div class="footer-section">
            <p class="footer-text">© 2025 DR.INFO by Synduct. All rights reserved.</p>
            <div class="unsubscribe">
              <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
            </div>
          </div>
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
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header-section { padding: 24px 20px; background-color: white; text-align: center; border-bottom: 2px solid rgba(55, 113, 254, 0.1); }
          .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 16px; }
          .main-content { padding: 0 20px 24px; }
          .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #223258; }
          .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; color: #223258; }
          .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
          .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
          .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
          .feature { background: rgba(55, 113, 254, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3771FE; }
          .feature h3 { color: #3771FE; margin-bottom: 12px; }
          .feature-list { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .feature-list li { margin-bottom: 8px; font-size: 16px; color: #000000; }
          .button { display: inline-block; background: #3771FE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; text-align: center; }
          .footer-section { border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 20px; margin-top: 32px; text-align: center; }
          .footer-text { font-size: 16px; font-weight: 600; color: #223258; }
          .unsubscribe { text-align: center; padding: 10px; color: #666; font-size: 12px; }
          .unsubscribe a { color: #3771FE; text-decoration: underline; }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 0; }
            .header-section { padding: 20px 16px; }
            .main-content { padding: 0 16px 20px; }
            .card { padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 20px; }
            .card-subtitle { font-size: 16px; }
            .section-title { font-size: 16px; }
            .section-text { font-size: 15px; }
            .feature { padding: 16px; }
            .greeting { font-size: 16px; }
            .intro-text { font-size: 15px; }
            .footer-text { font-size: 15px; }
          }
          
          @media only screen and (max-width: 480px) {
            .header-section { padding: 16px 12px; }
            .main-content { padding: 0 12px 16px; }
            .card { padding: 16px; }
            .card-title { font-size: 18px; }
            .card-subtitle { font-size: 15px; }
            .section-title { font-size: 15px; }
            .section-text { font-size: 14px; }
            .feature { padding: 12px; }
            .greeting { font-size: 15px; }
            .intro-text { font-size: 14px; }
            .footer-text { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-section">
            <img src="https://app.drinfo.ai/login-logo.png" alt="DR.INFO Logo" class="logo" />
            <h1 class="card-title">Your Medical Question. Now in One Powerful Image.</h1>
            <p class="card-subtitle">Introducing Visual Abstracts in DR.INFO 2025</p>
          </div>
          
          <div class="main-content">
            <div class="card">
              <p class="greeting">Dear Healthcare Professional,</p>
              <p class="intro-text">Ever wished you could see the answer to a complex question?</p>
              <p class="intro-text">We're excited to introduce <strong>Visual Abstracts</strong> - a revolutionary new feature that transforms your medical queries into clear, comprehensive visual summaries.</p>
              
              <div class="feature">
                <h3>🎯 What are Visual Abstracts?</h3>
                <p>Visual Abstracts are AI-generated diagrams that break down complex medical concepts into easy-to-understand visual representations. Perfect for:</p>
                <ul class="feature-list">
                  <li>Understanding treatment pathways</li>
                  <li>Visualizing drug mechanisms</li>
                  <li>Explaining procedures to patients</li>
                  <li>Creating educational materials</li>
                </ul>
              </div>
              
              <div class="feature">
                <h3>⚡ How it Works</h3>
                <p>Simply ask any medical question, and DR.INFO will generate both a detailed text response AND a visual abstract that captures the key points in an easy-to-scan format.</p>
              </div>
              
              <div style="text-align: center;">
                <a href="https://app.drinfo.ai" class="button">Generate Your First Visual Abstract</a>
              </div>
              
              <p class="intro-text"><strong>Available now for all users!</strong> Try asking questions like:</p>
              <ul class="feature-list">
                <li>"Show me the mechanism of action of ACE inhibitors"</li>
                <li>"Create a visual of the treatment algorithm for hypertension"</li>
                <li>"Explain the pathophysiology of diabetes with a diagram"</li>
              </ul>
            </div>
          </div>
          
          <div class="footer-section">
            <p class="footer-text">© 2025 DR.INFO by Synduct. All rights reserved.</p>
            <div class="unsubscribe">
              <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  4: {
    subject: "Case Study: DR.INFO 2025 in Real Life",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DR.INFO in Action</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header-section { padding: 24px 20px; background-color: white; text-align: center; border-bottom: 2px solid rgba(55, 113, 254, 0.1); }
          .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 16px; }
          .main-content { padding: 0 20px 24px; }
          .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #223258; }
          .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; color: #223258; }
          .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
          .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
          .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
          .case-study { background: rgba(55, 113, 254, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3771FE; }
          .case-study h3 { color: #3771FE; margin-bottom: 12px; }
          .case-study strong { color: #223258; }
          .case-study ul { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .case-study li { margin-bottom: 8px; font-size: 16px; color: #000000; }
          .button { display: inline-block; background: #3771FE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; text-align: center; }
          .footer-section { border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 20px; margin-top: 32px; text-align: center; }
          .footer-text { font-size: 16px; font-weight: 600; color: #223258; }
          .unsubscribe { text-align: center; padding: 10px; color: #666; font-size: 12px; }
          .unsubscribe a { color: #3771FE; text-decoration: underline; }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 0; }
            .header-section { padding: 20px 16px; }
            .main-content { padding: 0 16px 20px; }
            .card { padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 20px; }
            .card-subtitle { font-size: 16px; }
            .section-title { font-size: 16px; }
            .section-text { font-size: 15px; }
            .case-study { padding: 16px; }
            .greeting { font-size: 16px; }
            .intro-text { font-size: 15px; }
            .footer-text { font-size: 15px; }
          }
          
          @media only screen and (max-width: 480px) {
            .header-section { padding: 16px 12px; }
            .main-content { padding: 0 12px 16px; }
            .card { padding: 16px; }
            .card-title { font-size: 18px; }
            .card-subtitle { font-size: 15px; }
            .section-title { font-size: 15px; }
            .section-text { font-size: 14px; }
            .case-study { padding: 12px; }
            .greeting { font-size: 15px; }
            .intro-text { font-size: 14px; }
            .footer-text { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-section">
            <img src="https://app.drinfo.ai/login-logo.png" alt="DR.INFO Logo" class="logo" />
            <h1 class="card-title">DR.INFO in Action</h1>
            <p class="card-subtitle">See How DR.INFO Helped in a Real-Life High-Stakes Case</p>
          </div>
          
          <div class="main-content">
            <div class="card">
              <p class="greeting">Dear Healthcare Professional,</p>
              
              <div class="case-study">
                <h3>🏥 Real Case Study: Emergency Department</h3>
                <p><strong>Scenario:</strong> A 65-year-old patient presents with chest pain and multiple comorbidities including diabetes, hypertension, and chronic kidney disease.</p>
                
                <p><strong>The Challenge:</strong> The attending physician needed to quickly assess the patient's risk factors, determine appropriate diagnostic tests, and consider drug interactions with the patient's current medications.</p>
                
                <p><strong>How DR.INFO Helped:</strong></p>
                <ul>
                  <li>Provided instant access to the latest chest pain evaluation guidelines</li>
                  <li>Generated a comprehensive drug interaction report for the patient's medications</li>
                  <li>Created a visual abstract showing the diagnostic algorithm</li>
                  <li>Identified specific considerations for patients with CKD</li>
                </ul>
                
                <p><strong>Result:</strong> The physician was able to make an informed decision in minutes rather than hours, potentially saving the patient's life.</p>
              </div>
              
              <p class="intro-text">This is just one example of how DR.INFO is helping healthcare professionals make better decisions faster.</p>
              
              <div style="text-align: center;">
                <a href="https://app.drinfo.ai" class="button">Read More Case Studies</a>
              </div>
              
              <p class="intro-text"><strong>Your turn:</strong> What challenging case could DR.INFO help you with today?</p>
            </div>
          </div>
          
          <div class="footer-section">
            <p class="footer-text">© 2025 DR.INFO by Synduct. All rights reserved.</p>
            <div class="unsubscribe">
              <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
            </div>
          </div>
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
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header-section { padding: 24px 20px; background-color: white; text-align: center; border-bottom: 2px solid rgba(55, 113, 254, 0.1); }
          .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 16px; }
          .main-content { padding: 0 20px 24px; }
          .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #223258; }
          .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; color: #223258; }
          .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
          .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
          .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
          .transparency { background: rgba(55, 113, 254, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3771FE; }
          .transparency h3 { color: #3771FE; margin-bottom: 12px; }
          .transparency strong { color: #223258; }
          .transparency ul { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .transparency li { margin-bottom: 8px; font-size: 16px; color: #000000; }
          .feature-list { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .feature-list li { margin-bottom: 8px; font-size: 16px; color: #000000; }
          .button { display: inline-block; background: #3771FE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; text-align: center; }
          .footer-section { border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 20px; margin-top: 32px; text-align: center; }
          .footer-text { font-size: 16px; font-weight: 600; color: #223258; }
          .unsubscribe { text-align: center; padding: 10px; color: #666; font-size: 12px; }
          .unsubscribe a { color: #3771FE; text-decoration: underline; }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 0; }
            .header-section { padding: 20px 16px; }
            .main-content { padding: 0 16px 20px; }
            .card { padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 20px; }
            .card-subtitle { font-size: 16px; }
            .section-title { font-size: 16px; }
            .section-text { font-size: 15px; }
            .transparency { padding: 16px; }
            .greeting { font-size: 16px; }
            .intro-text { font-size: 15px; }
            .footer-text { font-size: 15px; }
          }
          
          @media only screen and (max-width: 480px) {
            .header-section { padding: 16px 12px; }
            .main-content { padding: 0 12px 16px; }
            .card { padding: 16px; }
            .card-title { font-size: 18px; }
            .card-subtitle { font-size: 15px; }
            .section-title { font-size: 15px; }
            .section-text { font-size: 14px; }
            .transparency { padding: 12px; }
            .greeting { font-size: 15px; }
            .intro-text { font-size: 14px; }
            .footer-text { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-section">
            <img src="https://app.drinfo.ai/login-logo.png" alt="DR.INFO Logo" class="logo" />
            <h1 class="card-title">Full Transparency</h1>
            <p class="card-subtitle">Every Answer is Backed by Real Medical Sources</p>
          </div>
          
          <div class="main-content">
            <div class="card">
              <p class="greeting">Dear Healthcare Professional,</p>
              <p class="intro-text">In medicine, trust is everything. That's why DR.INFO provides complete transparency about where every piece of information comes from.</p>
              
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
              
              <h3 class="section-title">📚 How Source Transparency Works</h3>
              <p class="section-text">Every time DR.INFO provides an answer, you'll see:</p>
              <ul class="feature-list">
                <li>Direct links to the original sources</li>
                <li>Publication dates and authors</li>
                <li>Study methodologies and limitations</li>
                <li>Confidence levels for each claim</li>
              </ul>
              
              <p class="intro-text">This means you can always verify the information and make informed decisions based on the latest evidence.</p>
              
              <div style="text-align: center;">
                <a href="https://app.drinfo.ai" class="button">See the Sources</a>
              </div>
              
              <p class="intro-text"><strong>No black boxes.</strong> No hidden algorithms. Just transparent, evidence-based medicine.</p>
            </div>
          </div>
          
          <div class="footer-section">
            <p class="footer-text">© 2025 DR.INFO by Synduct. All rights reserved.</p>
            <div class="unsubscribe">
              <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  6: {
    subject: "All the Ways DR.INFO 2025 Works for You — At a Glance",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Clinical Assistant</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header-section { padding: 24px 20px; background-color: white; text-align: center; border-bottom: 2px solid rgba(55, 113, 254, 0.1); }
          .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 16px; }
          .main-content { padding: 0 20px 24px; }
          .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #223258; }
          .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; color: #223258; }
          .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
          .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
          .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
          .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .feature { background: white; padding: 15px; border-radius: 8px; border: 1px solid rgba(55, 113, 254, 0.3); box-shadow: 0 2px 4px rgba(55, 113, 254, 0.1); }
          .feature h3 { color: #3771FE; margin-bottom: 8px; }
          .feature p { font-size: 14px; color: #000000; }
          .feature-list { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .feature-list li { margin-bottom: 8px; font-size: 16px; color: #000000; }
          .feature-list strong { color: #223258; }
          .button { display: inline-block; background: #3771FE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; text-align: center; }
          .footer-section { border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 20px; margin-top: 32px; text-align: center; }
          .footer-text { font-size: 16px; font-weight: 600; color: #223258; }
          .unsubscribe { text-align: center; padding: 10px; color: #666; font-size: 12px; }
          .unsubscribe a { color: #3771FE; text-decoration: underline; }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 0; }
            .header-section { padding: 20px 16px; }
            .main-content { padding: 0 16px 20px; }
            .card { padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 20px; }
            .card-subtitle { font-size: 16px; }
            .section-title { font-size: 16px; }
            .section-text { font-size: 15px; }
            .feature-grid { grid-template-columns: 1fr; gap: 12px; }
            .greeting { font-size: 16px; }
            .intro-text { font-size: 15px; }
            .footer-text { font-size: 15px; }
          }
          
          @media only screen and (max-width: 480px) {
            .header-section { padding: 16px 12px; }
            .main-content { padding: 0 12px 16px; }
            .card { padding: 16px; }
            .card-title { font-size: 18px; }
            .card-subtitle { font-size: 15px; }
            .section-title { font-size: 15px; }
            .section-text { font-size: 14px; }
            .greeting { font-size: 15px; }
            .intro-text { font-size: 14px; }
            .footer-text { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-section">
            <img src="https://app.drinfo.ai/login-logo.png" alt="DR.INFO Logo" class="logo" />
            <h1 class="card-title">Your Clinical Assistant</h1>
            <p class="card-subtitle">Here's Everything DR.INFO Can Do for You</p>
          </div>
          
          <div class="main-content">
            <div class="card">
              <p class="greeting">Dear Healthcare Professional,</p>
              <p class="intro-text">From quick lookups to complex case analysis, DR.INFO is your comprehensive medical AI assistant.</p>
              
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
              
              <h3 class="section-title">🎯 Perfect For:</h3>
              <ul class="feature-list">
                <li><strong>Physicians:</strong> Quick clinical decision support</li>
                <li><strong>Nurses:</strong> Patient education and care planning</li>
                <li><strong>Pharmacists:</strong> Drug consultation and safety checks</li>
                <li><strong>Students:</strong> Learning and exam preparation</li>
                <li><strong>Researchers:</strong> Literature review and data analysis</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="https://app.drinfo.ai" class="button">Put DR.INFO to Work</a>
              </div>
              
              <p class="intro-text">Ready to see how DR.INFO can transform your clinical workflow?</p>
            </div>
          </div>
          
          <div class="footer-section">
            <p class="footer-text">© 2025 DR.INFO by Synduct. All rights reserved.</p>
            <div class="unsubscribe">
              <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
            </div>
          </div>
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
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header-section { padding: 24px 20px; background-color: white; text-align: center; border-bottom: 2px solid rgba(55, 113, 254, 0.1); }
          .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 16px; }
          .main-content { padding: 0 20px 24px; }
          .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #223258; }
          .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; color: #223258; }
          .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
          .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
          .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
          .urgent { background: rgba(55, 113, 254, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #3771FE; }
          .urgent h2 { color: #3771FE; margin-bottom: 12px; }
          .premium-features { background: rgba(55, 113, 254, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3771FE; }
          .premium-features h3 { color: #3771FE; margin-bottom: 12px; }
          .premium-features strong { color: #223258; }
          .premium-features ul { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .premium-features li { margin-bottom: 8px; font-size: 16px; color: #000000; }
          .feature-list { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .feature-list li { margin-bottom: 8px; font-size: 16px; color: #000000; }
          .button { display: inline-block; background: #3771FE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; text-align: center; }
          .footer-section { border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 20px; margin-top: 32px; text-align: center; }
          .footer-text { font-size: 16px; font-weight: 600; color: #223258; }
          .unsubscribe { text-align: center; padding: 10px; color: #666; font-size: 12px; }
          .unsubscribe a { color: #3771FE; text-decoration: underline; }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 0; }
            .header-section { padding: 20px 16px; }
            .main-content { padding: 0 16px 20px; }
            .card { padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 20px; }
            .card-subtitle { font-size: 16px; }
            .section-title { font-size: 16px; }
            .section-text { font-size: 15px; }
            .urgent { padding: 16px; }
            .premium-features { padding: 16px; }
            .greeting { font-size: 16px; }
            .intro-text { font-size: 15px; }
            .footer-text { font-size: 15px; }
          }
          
          @media only screen and (max-width: 480px) {
            .header-section { padding: 16px 12px; }
            .main-content { padding: 0 12px 16px; }
            .card { padding: 16px; }
            .card-title { font-size: 18px; }
            .card-subtitle { font-size: 15px; }
            .section-title { font-size: 15px; }
            .section-text { font-size: 14px; }
            .urgent { padding: 12px; }
            .premium-features { padding: 12px; }
            .greeting { font-size: 15px; }
            .intro-text { font-size: 14px; }
            .footer-text { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-section">
            <img src="https://app.drinfo.ai/login-logo.png" alt="DR.INFO Logo" class="logo" />
            <h1 class="card-title">Upgrade to Premium</h1>
            <p class="card-subtitle">Unlock Unlimited Visual Abstracts and More</p>
          </div>
          
          <div class="main-content">
            <div class="card">
              <p class="greeting">Dear Healthcare Professional,</p>
              
              <div class="urgent">
                <h2>⏰ Your early access ends today!</h2>
                <p>Don't lose access to the advanced features that are helping healthcare professionals save time and improve patient care.</p>
              </div>
              
              <h2 class="section-title">Unlock unlimited Visual Abstracts and more with Premium</h2>
              
              <div class="premium-features">
                <h3>🚀 Premium Features:</h3>
                <ul>
                  <li><strong>Unlimited Visual Abstracts:</strong> Generate as many visual summaries as you need</li>
                  <li><strong>Advanced Analytics:</strong> Track your usage patterns and insights</li>
                  <li><strong>Priority Support:</strong> Get help when you need it most</li>
                  <li><strong>Custom Templates:</strong> Save and reuse your favorite prompts</li>
                  <li><strong>Bulk Operations:</strong> Process multiple queries at once</li>
                  <li><strong>API Access:</strong> Integrate DR.INFO into your existing workflows</li>
                </ul>
              </div>
              
              <h3 class="section-title">💡 What You'll Miss:</h3>
              <ul class="feature-list">
                <li>Visual Abstract generation (limited to 5 per month)</li>
                <li>Advanced search capabilities</li>
                <li>Priority processing</li>
                <li>Custom integrations</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="https://app.drinfo.ai" class="button">Go Premium Now</a>
              </div>
              
              <p class="intro-text"><strong>Special Offer:</strong> Upgrade today and get 20% off your first year!</p>
              
              <p class="intro-text">Thank you for being part of the DR.INFO community. We're excited to continue helping you provide better care to your patients.</p>
            </div>
          </div>
          
          <div class="footer-section">
            <p class="footer-text">© 2025 DR.INFO by Synduct. All rights reserved.</p>
            <div class="unsubscribe">
              <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a></p>
            </div>
          </div>
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