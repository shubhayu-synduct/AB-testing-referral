export const day1Template = {
    subject: "DR. INFO – Fast, Evidence-Based Answers at Your Fingertips",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DR. INFO</title>
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
          .section-text { font-size: 16px; color: #000000; margin-bottom: 16px; line-height: 1.6; }
          .feature-list { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
          .feature-list li { margin-bottom: 8px; font-size: 16px; color: #000000; }
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
            .feature-list { padding-left: 16px; }
            .feature-list li { font-size: 15px; }
            .greeting { font-size: 16px; }
            .intro-text { font-size: 15px; }
            .footer-section { padding: 24px; }
            .footer-text { font-size: 13px; }
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
            .footer-section { padding: 20px; }
            .footer-text { font-size: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-section">
            <img src="https://app.drinfo.ai/login-logo.png" alt="DR. INFO Logo" class="logo" />
            <h1 class="card-title">Welcome to DR. INFO - Redefining How Medicine Finds Answers</h1>
            <p class="card-subtitle">"Built by physicians for physicians, validated in real world clinical settings"</p>
          </div>
          
          <div class="main-content">
            <div class="card">
              <p class="greeting">Dear {{name}},</p>
              <p class="intro-text">You've just joined a growing community of physicians and students who want one thing: to spend less time searching, and more time treating.</p>
              <p class="intro-text">DR. INFO is your AI-powered clinical knowledge assistant, built with physicians, for physicians. It distills vast, complex guidelines and literature into clear, referenced, and actionable insights so you can make evidence-based decisions faster and with more confidence.</p>
              
              <div style="margin-bottom: 24px;">
                <h2 class="section-title">DR. INFO helps you:</h2>
                <ul class="feature-list">
                  <li>Ask any medical question and get a concise, guideline-backed answer in seconds</li>
                  <li>See instantly where the information comes from - full traceability, no black box</li>
                  <li>Explore topics further through real-time follow-up questions or visual abstracts</li>
                  <li>Get reliable, specialty-specific guidance without the noise</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="https://app.drinfo.ai" class="button" style="display: inline-block; background: #214498; background-color: #214498; color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 12px; margin: 20px 0; font-weight: 600; text-align: center; font-size: 16px; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; border: 2px solid #214498; min-height: 44px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Start Using DR. INFO Now</a>
              </div>
            
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
  