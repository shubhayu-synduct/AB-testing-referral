export const day4Template = {
  subject: "Dr. Marta: \"Confidence. That's the real impact of DR. INFO.\"",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>How a Pain Specialist Uses DR. INFO</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #223258; background-color: #f8fafc; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header-section { padding: 24px 20px; background-color: white; text-align: center; }
        .logo { max-width: 180px; height: auto; display: block; margin: 0 auto 16px; }
        .main-content { padding: 0 20px 24px; }
        .card { border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 12px; padding: 24px; background-color: #F4F7FF; margin-bottom: 24px; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #223258; }
        .intro-text { font-size: 16px; margin-bottom: 16px; line-height: 1.7; color: #223258; }
        .card-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #223258; }
        .card-subtitle { font-size: 18px; font-style: italic; text-align: center; margin-bottom: 24px; color: #223258; }
        .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; }
        .section-text { font-size: 16px; color: #223258; margin-bottom: 16px; line-height: 1.6; }
        .quote { 
          background: white;
          border: none;
          border-radius: 12px;
          padding: 24px; 
          margin: 24px 0; 
          font-style: italic;
          position: relative;
        }
        .quote p {
          font-size: 18px;
          line-height: 1.7;
          color: #223258;
          margin: 0;
        }
        .quote strong { color: #223258; font-weight: 600; }
        .use-cases { 
          background: white;
          border: none;
          border-radius: 12px;
          padding: 24px; 
          margin: 24px 0; 
        }
        .use-cases h3 { 
          color: #223258; 
          margin-bottom: 8px; 
          font-weight: 600;
          font-size: 18px;
        }
        .use-cases p {
          margin-bottom: 20px;
          font-size: 16px;
          color: #223258;
          line-height: 1.6;
        }
        .why-matters { 
          background: white;
          border: none;
          border-radius: 12px;
          padding: 24px; 
          margin: 24px 0; 
        }
        .why-matters h3 { 
          color: #223258; 
          margin-bottom: 8px; 
          font-weight: 600;
          font-size: 18px;
        }
        .why-matters p {
          font-size: 16px;
          color: #223258;
          line-height: 1.6;
        }
        .button { 
          display: inline-block !important; 
          background: #214498 !important; 
          background-color: #214498 !important; 
          color: #ffffff !important; 
          padding: 18px 48px !important; 
          text-decoration: none !important; 
          border-radius: 12px !important; 
          margin: 20px 0 !important; 
          font-weight: 600 !important; 
          text-align: center !important; 
          font-size: 16px !important;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          line-height: 1.4 !important;
          border: 2px solid #214498 !important;
          min-height: 44px !important;
          cursor: pointer !important;
          -webkit-text-size-adjust: 100% !important;
          -ms-text-size-adjust: 100% !important;
          mso-padding-alt: 18px 48px !important;
        }
        .footer-section { 
          padding: 32px 40px; 
          text-align: center; 
          background: white;
        }
        .footer-text { 
          font-size: 14px; 
          font-weight: 500; 
          color: #5a6689; 
          line-height: 1.6;
          letter-spacing: 0.01em;
        }
        .unsubscribe { 
          text-align: center; 
          padding: 16px 0 0; 
          color: #8892aa; 
          font-size: 12px;
        }
        .unsubscribe a { 
          color: #214498; 
          text-decoration: none; 
          font-weight: 500; 
          transition: all 0.2s ease;
          padding: 0 2px;
          border-bottom: 1px solid transparent;
        }
        .unsubscribe a:hover { 
          border-bottom-color: #214498;
        }
        .footer-links { 
          text-align: center; 
          padding: 16px 0 8px; 
          color: #8892aa; 
          font-size: 12px;
        }
        .footer-links a { 
          color: #214498; 
          text-decoration: none; 
          font-weight: 500; 
          transition: all 0.2s ease;
          padding: 0 2px;
          border-bottom: 1px solid transparent;
        }
        .footer-links a:hover { 
          border-bottom-color: #214498;
        }
        
        @media only screen and (max-width: 600px) {
          .email-container { margin: 0; }
          .header-section { padding: 20px 16px; }
          .main-content { padding: 0 16px 20px; }
          .card { padding: 20px; margin-bottom: 20px; }
          .card-title { font-size: 20px; }
          .card-subtitle { font-size: 16px; }
          .section-title { font-size: 16px; }
          .section-text { font-size: 15px; }
          .quote { 
            padding: 20px; 
            margin: 20px 0;
          }
          .quote p {
            font-size: 16px;
          }
          .use-cases, .why-matters { 
            padding: 20px; 
            margin: 20px 0;
          }
          .use-cases h3, .why-matters h3 {
            font-size: 16px;
          }
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
          .quote { 
            padding: 16px; 
            margin: 16px 0;
          }
          .quote p {
            font-size: 15px;
          }
          .use-cases, .why-matters { 
            padding: 16px; 
            margin: 16px 0;
          }
          .use-cases h3, .why-matters h3 {
            font-size: 15px;
          }
          .greeting { font-size: 15px; }
          .intro-text { font-size: 14px; }
          .footer-text { font-size: 14px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header-section">
          <img src="https://app.drinfo.ai/login-logo.png" alt="DR. INFO Logo" class="logo" />
          <h1 class="card-title">How a Pain Specialist Uses DR. INFO - From OR to Office</h1>
          <p class="card-subtitle">"Built by physicians for physicians, validated in real world clinical settings"</p>
        </div>
        
        <div class="main-content">
          <div class="card">
            <p class="greeting">Dear {{name}},</p>
            
            <p class="intro-text">For <strong>Dr. Marta Isidoro, anesthesiologist and chronic pain specialist</strong>, speed and safety aren't optional, they're essential.</p>
            
            <div class="quote">
              <p><strong>"Being an anesthesiologist means thinking fast. Having DR. INFO on hand is like having a medical book with you every minute, one that actually answers your questions."</strong></p>
            </div>
            
            <p class="intro-text">She's one of many clinicians who've integrated DR. INFO into daily practice. Here's how she uses it across different settings:</p>
            
            <div class="use-cases">
              <h3>In the OR:</h3>
              <p>To clarify less common conditions, drug interactions, and anesthetic implications, on the spot.</p>
              
              <h3>In chronic pain consultations:</h3>
              <p>To quickly review guidelines and save valuable minutes during complex cases.</p>
              
              <h3>In academic work:</h3>
              <p>To speed up paper prep and literature review.</p>
              
              <h3>In day-to-day practice:</h3>
              <p>To stay sharp on conditions outside her usual scope.</p>
            </div>
            
            <p class="intro-text">But for Dr. Marta, the biggest shift wasn't just speed. It was confidence.</p>
            
            <div class="quote">
              <p><strong>"I deliver my work differently now. I trust the answers. And I know where they come from."</strong></p>
            </div>
            
            <div class="why-matters">
              <h3>Why it matters:</h3>
              <p>In high-stakes specialties like anesthesiology and pain medicine, certainty and efficiency go hand-in-hand. DR. INFO helps you work faster, but more importantly, it helps you work smarter and safer.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://app.drinfo.ai" class="button" style="display: inline-block; background: #214498; background-color: #214498; color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 12px; margin: 20px 0; font-weight: 600; text-align: center; font-size: 16px; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; border: 2px solid #214498; min-height: 44px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Explore How DR. INFO Fits Into Your Specialty</a>
            </div>
            
            <p class="intro-text">Ready to experience the same confidence boost in your practice?</p>
            <p class="footer-text">Best regards,<br>The DR. INFO Team</p>
          </div>
        </div>
        
        <div class="footer-section">
          <p class="footer-text">© 2025 DR. INFO by Synduct. All rights reserved.</p>
          <div class="footer-links">
            <p>
                <a href="https://drinfo.ai/privacy-policy/">Privacy Policy</a> | 
                <a href="https://drinfo.ai/termsofservice/">Terms and Conditions</a> | 
              <a href="mailto:info@synduct.com">Contact Us</a>
            </p>
          </div>
          <div class="unsubscribe">
            <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
};