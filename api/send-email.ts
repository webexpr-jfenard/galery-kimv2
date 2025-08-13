// API Route for sending emails with Resend
// This file should be placed in /api folder for Vercel deployment

import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Resend with API key from environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error: 'RESEND_API_KEY environment variable not configured'
      });
    }

    const { to, from, subject, html, text, replyTo } = req.body;

    // Validate required fields
    if (!to || !from || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, from, subject, html' 
      });
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to) || !emailRegex.test(from)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Send email with Resend
    const data = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
      text: text || undefined,
      reply_to: replyTo || undefined,
    });

    console.log('✅ Email sent successfully:', data.id);

    // Return success response
    return res
      .status(200)
      .json({ 
        success: true, 
        messageId: data.id 
      });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Handle Resend API errors
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ 
          error: error.message || 'Failed to send email' 
        });
    }

    return res
      .status(500)
      .json({ 
        error: 'Internal server error' 
      });
  }
}