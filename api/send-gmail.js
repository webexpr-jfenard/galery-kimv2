// Gmail API Route for Vercel - Using native SMTP without nodemailer
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
    // Validate Gmail SMTP environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    console.log('Gmail config check:', {
      user: !!gmailUser,
      pass: !!gmailAppPassword
    });

    if (!gmailUser || !gmailAppPassword) {
      return res.status(500).json({
        error: 'Gmail configuration missing. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.',
        details: 'Check Vercel environment variables'
      });
    }

    const { to, subject, html, text } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      });
    }

    console.log('Attempting to send email to:', to);

    // Use nodemailer with dynamic import
    const nodemailer = await import('nodemailer');
    
    console.log('Nodemailer imported successfully');

    // Gmail SMTP configuration
    const transporter = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    console.log('Transporter created');

    // Verify connection
    try {
      await transporter.verify();
      console.log('SMTP connection verified');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      return res.status(500).json({
        error: 'Gmail SMTP connection failed',
        details: verifyError.message
      });
    }

    // Send email
    const info = await transporter.sendMail({
      from: `"Galerie Photo" <${gmailUser}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || undefined,
    });

    console.log('✅ Gmail email sent:', info.messageId);

    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('❌ Gmail email error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to send email via Gmail',
      details: error.message,
      stack: error.stack
    });
  }
}