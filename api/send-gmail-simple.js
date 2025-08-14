// Simple Gmail API without nodemailer - Alternative solution
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Gmail API Simple Called ===');
    
    // Validate Gmail SMTP environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasGmailUser: !!gmailUser,
      hasGmailPassword: !!gmailAppPassword,
      gmailUserLength: gmailUser ? gmailUser.length : 0,
      gmailPasswordLength: gmailAppPassword ? gmailAppPassword.length : 0
    });

    if (!gmailUser || !gmailAppPassword) {
      console.error('Missing Gmail credentials');
      return res.status(500).json({
        error: 'Gmail configuration missing',
        details: 'GMAIL_USER and GMAIL_APP_PASSWORD must be set in environment variables',
        env: {
          hasGmailUser: !!gmailUser,
          hasGmailPassword: !!gmailAppPassword
        }
      });
    }

    const { to, subject, html, text } = req.body;

    console.log('Request data:', {
      to: to,
      subject: subject,
      hasHtml: !!html,
      hasText: !!text
    });

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['to', 'subject', 'html'],
        received: { to: !!to, subject: !!subject, html: !!html }
      });
    }

    // For now, let's return success to test the API endpoint
    console.log('✅ Gmail API called successfully (mock)');

    // TODO: Implement actual email sending once API is working
    return res.status(200).json({ 
      success: true, 
      messageId: 'mock-' + Date.now(),
      message: 'Email would be sent here',
      config: {
        from: gmailUser,
        to: to,
        subject: subject
      }
    });

  } catch (error) {
    console.error('❌ Gmail API error:', error);
    
    return res.status(500).json({ 
      error: 'Gmail API internal error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}