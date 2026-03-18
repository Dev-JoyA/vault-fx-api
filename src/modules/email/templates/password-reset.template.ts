export const getPasswordResetTemplate = (
  otp: string,
  name?: string,
): string => {
  const userName = name || 'Valued User';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f4f7fb;
                margin: 0;
                padding: 0;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #DC3545 0%, #B22222 100%);
                padding: 40px 20px;
                text-align: center;
            }
            .header h1 {
                color: white;
                font-size: 28px;
                margin-bottom: 8px;
                font-weight: 600;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 16px;
            }
            .content {
                padding: 40px 30px;
                background-color: #ffffff;
            }
            .warning-banner {
                background-color: #fff3cd;
                border: 1px solid #ffb347;
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 25px;
                color: #856404;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .warning-icon {
                font-size: 24px;
            }
            .otp-container {
                background: linear-gradient(135deg, #fff5f5 0%, #ffe9e9 100%);
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                margin: 25px 0;
                border: 2px dashed #DC3545;
            }
            .otp-code {
                font-size: 48px;
                letter-spacing: 8px;
                font-weight: 700;
                color: #DC3545;
                font-family: 'Courier New', monospace;
                background: white;
                padding: 15px 25px;
                border-radius: 12px;
                display: inline-block;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.15);
            }
            .otp-expiry {
                text-align: center;
                margin: 20px 0;
                padding: 12px;
                background-color: #e7f3ff;
                border: 1px solid #0B4F6C;
                border-radius: 8px;
                color: #0B4F6C;
            }
            .button {
                display: inline-block;
                background-color: #DC3545;
                color: white;
                text-decoration: none;
                padding: 14px 36px;
                border-radius: 30px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
                transition: all 0.3s ease;
            }
            .button:hover {
                background-color: #B22222;
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(220, 53, 69, 0.4);
            }
            .security-checklist {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .checklist-item {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 10px 0;
                color: #555;
            }
            .checklist-item:before {
                content: "✓";
                color: #28a745;
                font-weight: bold;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
            }
            .footer-links {
                margin-top: 15px;
            }
            .footer-links a {
                color: #0B4F6C;
                text-decoration: none;
                margin: 0 10px;
                font-size: 13px;
            }
            .footer-links a:hover {
                text-decoration: underline;
            }
            @media only screen and (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 8px;
                }
                .content {
                    padding: 25px 20px;
                }
                .otp-code {
                    font-size: 36px;
                    letter-spacing: 6px;
                    padding: 12px 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset Request</h1>
                <p>We received a request to reset your password</p>
            </div>
            
            <div class="content">
                <h2 style="color: #333; margin-bottom: 15px;">Hello ${userName},</h2>
                
                <div class="warning-banner">
                    <span class="warning-icon">⚠️</span>
                    <p style="margin: 0;">We received a request to reset your password for your Vault FX account. If you didn't make this request, please ignore this email or contact support immediately.</p>
                </div>
                
                <div class="otp-container">
                    <p style="color: #555; margin-bottom: 15px; font-size: 14px;">Your password reset code is:</p>
                    <div class="otp-code">${otp}</div>
                </div>

                <div class="otp-expiry">
                    <strong>⏰ This code will expire in 10 minutes.</strong>
                </div>

                <div style="text-align: center;">
                    <a href="#" class="button">Reset Password</a>
                </div>

                <div class="security-checklist">
                    <p style="font-weight: bold; margin-bottom: 15px;">✅ For your security:</p>
                    <div class="checklist-item">Never share this code with anyone</div>
                    <div class="checklist-item">Create a strong, unique password</div>
                    <div class="checklist-item">Enable two-factor authentication after logging in</div>
                    <div class="checklist-item">Check your login history regularly</div>
                </div>

                <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                    If you're having trouble resetting your password, please contact our support team.
                </p>
            </div>

            <div class="footer">
                <p>© ${new Date().getFullYear()} Vault FX. All rights reserved.</p>
                <p>Your security is our priority</p>
                <div class="footer-links">
                    <a href="#">Security Center</a> • 
                    <a href="#">Support</a> • 
                    <a href="#">Report Fraud</a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};
