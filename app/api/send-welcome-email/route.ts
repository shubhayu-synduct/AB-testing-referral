import { NextResponse } from "next/server"
import { Resend } from "resend"
import { logger } from '@/lib/logger'
import { day1Template } from "../send-emails/templates/day1"

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

    const { userName, userEmail } = await request.json()

    if (!userName || !userEmail) {
      logger.error("Missing required fields:", { userName, userEmail })
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    logger.apiLog("Sending Day 1 welcome email to:", userEmail)

    // Prepare email data with personalization
    const emailData = {
      from: "DR. INFO <noreply@drinfo.ai>",
      to: userEmail,
      subject: day1Template.subject,
      html: day1Template.html
        .replace(/\{\{name\}\}/g, userName)
        .replace('{{unsubscribe_url}}', `https://app.drinfo.ai/unsubscribe?email=${encodeURIComponent(userEmail)}`)
    }

    // Send welcome email
    const emailResponse = await resend.emails.send(emailData)

    if (!emailResponse) {
      logger.error("Failed to send welcome email - no response from Resend")
      throw new Error('Failed to send welcome email')
    }

    // Update user's emailDay to 1 after Day 1 email is sent
    try {
      const admin = await import("firebase-admin")
      const db = admin.firestore()
      
      // Find user by email and update emailDay to 1
      const userSnapshot = await db.collection("users")
        .where("email", "==", userEmail.toLowerCase().trim())
        .get()
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0]
        await db.collection("users").doc(userDoc.id).update({
          emailDay: 1,
          lastEmailSent: admin.firestore.Timestamp.fromDate(new Date()),
          totalEmailsSent: 1,
          updatedAt: admin.firestore.Timestamp.fromDate(new Date())
        })
        logger.apiLog("Updated user emailDay to 1 for:", userEmail)
      } else {
        logger.error("User not found in database for email:", userEmail)
      }
    } catch (updateError) {
      logger.error("Failed to update user emailDay after Day 1 email:", updateError)
      // Don't fail the email send if update fails
    }

    logger.apiLog("Day 1 welcome email sent successfully to:", userEmail)

    return NextResponse.json({ 
      success: true, 
      message: "Welcome email sent successfully" 
    })
  } catch (error: any) {
    logger.error("Error sending welcome email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send welcome email" },
      { status: 500 }
    )
  }
}
