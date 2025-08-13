// API Route for sending emails with SMTP (OVH or other providers)
// This file should be placed in /api folder for Vercel deployment

import nodemailer from 'nodemailer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    // Check if SMTP configuration is available
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({
        error: 'SMTP configuration missing (SMTP_HOST, SMTP_USER, SMTP_PASS required)'
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

    // Create SMTP transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for SSL (465), false for TLS (587)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Additional options for OVH and other providers
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    });

    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError);
      return res.status(500).json({
        error: 'SMTP connection failed - check configuration'
      });
    }

    // Send email
    const info = await transporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html,
      text: text || undefined,
      replyTo: replyTo || undefined,
    });

    console.log('✅ Email sent successfully:', info.messageId);

    // Return success response
    return res
      .status(200)
      .json({ 
        success: true, 
        messageId: info.messageId 
      });

  } catch (error) {
    console.error('❌ Error sending email via SMTP:', error);
    
    // Handle SMTP errors
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ 
          error: error.message || 'Failed to send email via SMTP' 
        });
    }

    return res
      .status(500)
      .json({ 
        error: 'Internal server error' 
      });
  }
}