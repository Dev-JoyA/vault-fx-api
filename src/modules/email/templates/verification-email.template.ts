export const getVerificationEmailTemplate = (otp: string, name?: string, email?: string): string => {
  const userName = name || 'Valued User';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
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
                background: linear-gradient(135deg, #0B4F6C 0%, #1A7F8C 100%);
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
            .otp-container {
                background: linear-gradient(135deg, #f8faff 0%, #edf2f9 100%);
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                margin: 25px 0;
                border: 2px dashed #0B4F6C;
            }
            .otp-code {
                font-size: 48px;
                letter-spacing: 8px;
                font-weight: 700;
                color: #0B4F6C;
                font-family: 'Courier New', monospace;
                background: white;
                padding: 15px 25px;
                border-radius: 12px;
                display: inline-block;
                box-shadow: 0 4px 12px rgba(11, 79, 108, 0.15);
            }
            .otp-expiry {
                text-align: center;
                margin: 20px 0;
                padding: 12px;
                background-color: #fff3cd;
                border: 1px solid #ffb347;
                border-radius: 8px;
                color: #856404;
            }
            .otp-expiry strong {
                color: #e67e22;
            }
            .button {
                display: inline-block;
                background-color: #0B4F6C;
                color: white;
                text-decoration: none;
                padding: 14px 36px;
                border-radius: 30px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                box-shadow: 0 4px 12px rgba(11, 79, 108, 0.3);
                transition: all 0.3s ease;
            }
            .button:hover {
                background-color: #1A7F8C;
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(11, 79, 108, 0.4);
            }
            .features {
                display: flex;
                justify-content: space-around;
                margin: 30px 0;
                padding: 20px 0;
                border-top: 1px solid #e9ecef;
                border-bottom: 1px solid #e9ecef;
            }
            .feature-item {
                text-align: center;
                flex: 1;
            }
            .feature-icon {
                font-size: 24px;
                margin-bottom: 8px;
            }
            .feature-text {
                font-size: 14px;
                color: #6c757d;
            }
            .security-note {
                background-color: #f0f7fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                font-size: 14px;
                color: #0B4F6C;
                border-left: 4px solid #0B4F6C;
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
            .divider {
                height: 1px;
                background: linear-gradient(to right, transparent, #0B4F6C, transparent);
                margin: 20px 0;
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
                .features {
                    flex-direction: column;
                    gap: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Welcome to Vault FX</h1>
                <p>Your secure gateway to foreign exchange trading</p>
            </div>
            
            <div class="content">
                <h2 style="color: #333; margin-bottom: 15px;">Hello ${userName},</h2>
                <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
                    Thank you for choosing Vault FX! To ensure the security of your account and comply with financial regulations, 
                    we need to verify your email address before you can start trading.
                </p>
                
                <div class="otp-container">
                    <p style="color: #555; margin-bottom: 15px; font-size: 14px;">Your verification code is:</p>
                    <div class="otp-code">${otp}</div>
                </div>

                <div class="otp-expiry">
                    <strong>⏰ Important:</strong> This code will expire in 10 minutes. Please verify your email promptly.
                </div>

                <div style="text-align: center;">
                    <a href="#" class="button">Verify Email Address</a>
                </div>

                <div class="security-note">
                    <strong>🛡️ Security Tip:</strong> Never share this OTP with anyone. Our team will never ask for your verification code.
                </div>

                <div class="features">
                    <div class="feature-item">
                        <div class="feature-icon">⚡</div>
                        <div class="feature-text">Real-time Rates</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🔒</div>
                        <div class="feature-text">Bank-level Security</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🌍</div>
                        <div class="feature-text">Multi-currency</div>
                    </div>
                </div>

                <p style="color: #666; font-size: 14px; text-align: center;">
                    If you didn't create an account with Vault FX, please ignore this email or contact our support team immediately.
                </p>
            </div>

            <div class="footer">
                <p>© ${new Date().getFullYear()} Vault FX. All rights reserved.</p>
                <p>Your trusted partner in foreign exchange trading</p>
                <div class="footer-links">
                    <a href="#">Privacy Policy</a> • 
                    <a href="#">Terms of Service</a> • 
                    <a href="#">Contact Support</a>
                </div>
                <div class="divider"></div>
                <p style="font-size: 12px; color: #999;">
                    Vault FX is a product of CredPal. This email was sent to ${email} 
                    in response to your registration request.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};