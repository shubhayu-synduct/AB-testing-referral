import { NextResponse } from "next/server"
import { Resend } from "resend"
import { logger } from '@/lib/logger'

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      logger.error("RESEND_API_KEY is not configured")
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      )
    }

    const { userName, userEmail, deletionReason } = await request.json()

    if (!userName || !userEmail) {
      logger.error("Missing required fields:", { userName, userEmail })
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    logger.apiLog("Sending delete account email to:", userEmail)

    // Get current date in a formatted string
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Send delete account confirmation email
    const emailResponse = await resend.emails.send({
      from: "DR. INFO <noreply@drinfo.ai>",
      to: userEmail,
      subject: "Your DR. INFO Account Has Been Deleted",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Account Deletion Confirmation</title>
          <style>
            /* Reset and base styles */
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
            
            /* Container styles */
            .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header-section { padding: 24px 20px; background-color: white; }
            .main-content { padding: 0 20px 24px; }
            .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
            
            /* Typography */
            .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
            .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; }
            .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
            .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
            .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
            .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
            .footer-text { font-size: 16px; font-weight: 600; margin-top: 16px; }
            
            /* Lists */
            .feature-list { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
            .feature-list li { margin-bottom: 8px; font-size: 16px; color: #000000; }
            
            /* Links */
            .link { color: #3771FE; text-decoration: underline; }
            .email-link { color: #3771FE; text-decoration: none; }
            
            /* Logo */
            .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 24px; }
            
            /* Footer section */
            .footer-section { border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 20px; margin-top: 32px; }
            .footer-item { margin-bottom: 8px; font-size: 16px; color: #000000; }
            .footer-label { font-weight: 500; }
            
            /* Responsive adjustments */
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
              .footer-item { font-size: 15px; }
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
              .footer-item { font-size: 14px; }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <!-- Header Section -->
            <div class="header-section">
              <p class="greeting">Dear ${userName},</p>
              <p class="intro-text">We're sorry to see you go. Your DR. INFO account has been successfully deleted as requested.</p>
              <p class="intro-text">This email serves as confirmation that your account and all associated data have been permanently removed from our systems.</p>
              <p class="intro-text">If you have any questions about this process or if you'd like to provide feedback about your experience, please don't hesitate to contact us at <a href="mailto:info@synduct.com" class="email-link">info@synduct.com</a>.</p>
              <p class="intro-text">We hope to see you again in the future. Thank you for being part of the DR. INFO community!</p>
              <p class="footer-text">DR. INFO by Synduct team</p>
            </div>
            
            <!-- Main Content -->
            <div class="main-content">
              <div class="card">
                <img src="https://app.drinfo.ai/login-logo.png" alt="Dr. Info Logo" class="logo" />
                <h1 class="card-title">Account Deletion Confirmation</h1>
                <p class="card-subtitle">Your DR. INFO Account Has Been Successfully Deleted</p>
                
                <div style="margin-bottom: 24px;">
                  <h2 class="section-title">What Happens Next</h2>
                  <p class="section-text"><span class="footer-label">Immediate Actions:</span></p>
                  <ul class="feature-list">
                    <li>Your account has been permanently deactivated</li>
                    <li>All personal data has been removed from our systems</li>
                    <li>Your subscription (if active) has been cancelled</li>
                    <li>Access to DR. INFO services has been revoked</li>
                  </ul>
                </div>

                <div style="margin-bottom: 24px;">
                  <h2 class="section-title">Data Privacy & Security</h2>
                  <p class="section-text">We take your privacy seriously. All personal information, account data have been permanently deleted from our servers. This process is irreversible and complies with GDPR requirements.</p>
                </div>

                <div style="margin-bottom: 24px;">
                  <h2 class="section-title">Feedback & Support</h2>
                  <p class="section-text">We value your feedback and would love to understand how we could have served you better. If you'd like to share your experience or have any questions, please reach out to our support team.</p>
                </div>

                <div style="margin-bottom: 24px;">
                  <h2 class="section-title">Rejoining DR. INFO</h2>
                  <p class="section-text">If you change your mind in the future, you're always welcome to create a new account. Simply visit <a href="https://app.drinfo.ai" class="link">app.drinfo.ai</a> and sign up again.</p>
                </div>

                <div style="margin-bottom: 24px;">
                  <h2 class="section-title">Contact Information</h2>
                  <p class="section-text">For any questions or concerns regarding your account deletion:</p>
                  <ul class="feature-list">
                    <li><span class="footer-label">Email:</span> <a href="mailto:info@synduct.com" class="link">info@synduct.com</a></li>
                    <li><span class="footer-label">Response Time:</span> Within 24-72 hours</li>
                  </ul>
                </div>

                <div style="margin-bottom: 24px;">
                  <h2 class="section-title">Privacy Policy & Legal Information</h2>
                  <p class="section-text">Your account deletion is processed in accordance with our Privacy Policy and Terms of Service:</p>
                  <ul class="feature-list">
                    <li><a href="https://drinfo.ai/privacy-policy/" class="link">Privacy Policy</a></li>
                    <li><a href="https://drinfo.ai/termsofservice/" class="link">Terms and Conditions</a></li>
                  </ul>
                  <p class="section-text"><span class="footer-label">Note:</span> Some data may be retained for legal compliance purposes (e.g., financial records for tax purposes) as required by applicable law.</p>
                </div>

                <div class="footer-section">
                  <p class="footer-item"><span class="footer-label">Account Holder:</span> ${userName}</p>
                  <p class="footer-item"><span class="footer-label">Email Address:</span> ${userEmail}</p>
                  <p class="footer-item"><span class="footer-label">Deletion Date:</span> ${currentDate}</p>
                  ${deletionReason ? `<p class="footer-item"><span class="footer-label">Reason Provided:</span> ${deletionReason}</p>` : ''}
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (!emailResponse) {
      logger.error("Failed to send delete email - no response from Resend")
      throw new Error('Failed to send delete email')
    }

    logger.apiLog("Delete account email sent successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error("Error sending delete account email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send delete account email" },
      { status: 500 }
    )
  }
}
