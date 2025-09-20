export const day7Template = {
  subject: "Don't Hit the Cap! Go Pro for Unlimited Answers & Visual Abstracts",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upgrade to DR. INFO Pro - Unlimited Everything</title>
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
        .highlight-box { 
          background: linear-gradient(135deg, #F4F7FF 0%, #E8F0FF 100%); 
          border: 2px solid #3771FE; 
          border-radius: 16px; 
          padding: 24px; 
          margin: 24px 0; 
          box-shadow: 0 4px 12px rgba(55, 113, 254, 0.1);
        }
        .highlight-content h3 { 
          color: #3771FE; 
          margin-bottom: 12px; 
          font-size: 20px; 
          font-weight: 600;
        }
        .highlight-content p { 
          color: #223258; 
          margin: 0; 
          line-height: 1.6;
        }
        .pro-features { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin: 24px 0;
        }
        .feature-item { 
          background: white; 
          border: 2px solid rgba(55, 113, 254, 0.2); 
          border-radius: 12px; 
          padding: 20px; 
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(55, 113, 254, 0.08);
        }
        .feature-item:hover { 
          border-color: #3771FE; 
          box-shadow: 0 4px 16px rgba(55, 113, 254, 0.15);
          transform: translateY(-2px);
        }

        .feature-text h4 { 
          color: #3771FE; 
          margin: 0 0 8px 0; 
          font-size: 16px; 
          font-weight: 600;
        }
        .feature-text p { 
          color: #223258; 
          margin: 0; 
          font-size: 14px; 
          line-height: 1.5;
        }
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
          .highlight-box { padding: 20px; margin: 20px 0; }
          .pro-features { grid-template-columns: 1fr; gap: 16px; }
          .feature-item { padding: 16px; }
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
          .highlight-box { padding: 16px; margin: 16px 0; }
          .pro-features { gap: 12px; }
          .feature-item { padding: 12px; }
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
          <h1 class="card-title">Keep Your Momentum. Unlock Unlimited with DR. INFO Pro.</h1>
          <p class="card-subtitle">"Built by physicians for physicians, validated in real world clinical settings"</p>
        </div>
        
        <div class="main-content">
          <div class="card">
            <p class="greeting">Dear {{name}},</p>
            
            <div class="highlight-box">
              <div class="highlight-content">
                <h3>You're on the Free Plan</h3>
                <p>This includes a limited number of questions and Visual Abstracts each month. As you use DR. INFO, you'll get in-app notifications before you reach your monthly cap, so you can plan ahead and avoid interruptions.</p>
              </div>
            </div>
            
            <h2 class="section-title">Why upgrade to Pro?</h2>
            
            <div class="pro-features">
              <div class="feature-item">
                <div class="feature-text">
                  <h4>Unlimited Questions</h4>
                  <p>Keep clinical reasoning flowing without limits</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-text">
                  <h4>Unlimited Visual Abstracts</h4>
                  <p>Generate as many evidence-based visuals as you need</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-text">
                  <h4>Full Feature Access</h4>
                  <p>Follow-ups, EMA drug info, global guideline search, and transparent references</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-text">
                  <h4>Flexible Billing</h4>
                  <p>Choose monthly or annual plans that fit your workflow</p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="https://app.drinfo.ai" class="button" style="display: inline-block; background: #214498; background-color: #214498; color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 12px; margin: 20px 0; font-weight: 600; text-align: center; font-size: 16px; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; border: 2px solid #214498; min-height: 44px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Upgrade to Pro – Unlimited Everything</a>
            </div>
            
            <p class="intro-text"><strong>Prefer to stay on Free?</strong> No problem, we'll warn you as you approach your monthly limit so you're never caught off guard. You can upgrade anytime.</p>
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
