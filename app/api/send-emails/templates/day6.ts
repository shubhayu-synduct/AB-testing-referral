export const day6Template = {
  subject: "All the Ways DR. INFO 2025 Works for You — At a Glance",
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
        .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .feature { background: white; padding: 15px; border-radius: 8px; border: 1px solid rgba(55, 113, 254, 0.3); box-shadow: 0 2px 4px rgba(55, 113, 254, 0.1); }
        .feature h3 { color: #3771FE; margin-bottom: 8px; }
        .feature p { font-size: 14px; color: #000000; }
        .feature-list { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
        .feature-list li { margin-bottom: 8px; font-size: 16px; color: #000000; }
        .feature-list strong { color: #223258; }
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
          <img src="https://app.drinfo.ai/login-logo.png" alt="DR. INFO Logo" class="logo" />
          <h1 class="card-title">Your Clinical Assistant</h1>
          <p class="card-subtitle">"Built by physicians for physicians, validated in real world clinical settings"</p>
        </div>
        
        <div class="main-content">
          <div class="card">
            <p class="greeting">Dear {{name}},</p>
            <p class="intro-text">From quick lookups to complex case analysis, DR. INFO is your comprehensive medical AI assistant.</p>
            
            <div class="feature-grid">
              <div class="feature">
                <h3>Quick Diagnostics</h3>
                <p>Get instant differential diagnoses based on symptoms and patient history</p>
              </div>
              <div class="feature">
                <h3>Drug Information</h3>
                <p>Comprehensive drug data, interactions, and dosing guidelines</p>
              </div>
              <div class="feature">
                <h3>Visual Abstracts</h3>
                <p>Generate clear visual representations of complex medical concepts</p>
              </div>
              <div class="feature">
                <h3>Clinical Guidelines</h3>
                <p>Access the latest treatment protocols and best practices</p>
              </div>
              <div class="feature">
                <h3>Research Summaries</h3>
                <p>Get concise summaries of the latest medical research</p>
              </div>
              <div class="feature">
                <h3>Report Generation</h3>
                <p>Create detailed medical reports and documentation</p>
              </div>
            </div>
            
            <h3 class="section-title">Perfect For:</h3>
            <ul class="feature-list">
              <li><strong>Physicians:</strong> Quick clinical decision support</li>
              <li><strong>Nurses:</strong> Patient education and care planning</li>
              <li><strong>Pharmacists:</strong> Drug consultation and safety checks</li>
              <li><strong>Students:</strong> Learning and exam preparation</li>
              <li><strong>Researchers:</strong> Literature review and data analysis</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="https://app.drinfo.ai" class="button" style="display: inline-block; background: #214498; background-color: #214498; color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 12px; margin: 20px 0; font-weight: 600; text-align: center; font-size: 16px; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; border: 2px solid #214498; min-height: 44px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Put DR. INFO to Work</a>
            </div>
            
            <p class="intro-text">Ready to see how DR. INFO can transform your clinical workflow?</p>
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
