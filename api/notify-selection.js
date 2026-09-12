// Notifies the photographer that a visitor submitted a selection.
//
// Safe by construction, because the browser that calls this endpoint is public and can
// hold no secret: the recipient is fixed server-side, the message is built here from
// structured fields (nothing client-provided is sent as-is), the selection file travels
// as an attachment instead of a public storage URL, and each IP is rate-limited.
//
// Environment (Vercel): GMAIL_USER, GMAIL_APP_PASSWORD (sender), NOTIFY_TO (recipient,
// defaults to GMAIL_USER), SITE_URL (optional, defaults to the request host).

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 30;
const MAX_TEXT_LENGTH = 200_000;
const hitsByIp = new Map(); // best effort, per warm instance

function tooManyRequests(ip) {
  const now = Date.now();
  const recent = (hitsByIp.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hitsByIp.set(ip, recent);
  if (hitsByIp.size > 5000) hitsByIp.clear();
  return recent.length > RATE_LIMIT_MAX;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cleanString(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function safeFileName(value) {
  const base = cleanString(value, 120).replace(/[^a-zA-Z0-9._-]+/g, '_') || 'selection';
  return base.endsWith('.txt') ? base : `${base}.txt`;
}

async function loadNodemailer() {
  const mod = await import('nodemailer');
  return mod.default || mod;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (tooManyRequests(ip)) {
    return res.status(429).json({ error: 'Trop de demandes, réessayez dans quelques minutes.' });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const recipient = process.env.NOTIFY_TO || gmailUser;
  if (!gmailUser || !gmailAppPassword || !recipient) {
    console.error('notify-selection: GMAIL_USER / GMAIL_APP_PASSWORD missing');
    return res.status(500).json({ error: "L'envoi d'e-mail n'est pas configuré." });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const siteUrl = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');

  let subject;
  let html;
  let attachments = [];

  if (body.test === true) {
    subject = '[Galerie] E-mail de test';
    html = `<p>Ceci est un e-mail de test envoyé depuis l'administration de la galerie (${escapeHtml(siteUrl)}).</p>`;
  } else {
    const galleryId = cleanString(body.galleryId, 64);
    const galleryName = cleanString(body.galleryName, 200) || galleryId;
    const userName = cleanString(body.userName, 80) || 'Visiteur';
    const userEmail = cleanString(body.userEmail, 200);
    const selectionType = body.selectionType === 'complete' ? 'complete' : 'personal';
    const photoCount = Number.isInteger(body.photoCount) && body.photoCount >= 0 ? body.photoCount : 0;
    const textContent = typeof body.textContent === 'string' ? body.textContent.slice(0, MAX_TEXT_LENGTH) : '';

    if (!galleryId || !textContent) {
      return res.status(400).json({ error: 'Champs requis manquants : galleryId, textContent' });
    }

    const kind = selectionType === 'complete' ? 'Sélection complète' : 'Sélection personnelle';
    subject = `[Galerie] ${kind} · ${galleryName} · ${userName}`;
    const favoritesUrl = `${siteUrl}/#/favorites/${encodeURIComponent(galleryId)}`;
    html = `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${escapeHtml(kind)}</h2>
        <table style="border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Galerie</td><td>${escapeHtml(galleryName)}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Envoyée par</td><td>${escapeHtml(userName)}${userEmail ? ` (${escapeHtml(userEmail)})` : ''}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Photos</td><td>${photoCount}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Date</td><td>${escapeHtml(new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }))}</td></tr>
        </table>
        <p style="margin: 16px 0;">La liste complète est en pièce jointe. Vous pouvez aussi la consulter en ligne :</p>
        <p><a href="${escapeHtml(favoritesUrl)}" style="background: #111827; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">Voir la sélection</a></p>
      </div>`;
    attachments = [{ filename: safeFileName(body.fileName), content: textContent, contentType: 'text/plain; charset=utf-8' }];
  }

  try {
    const nodemailer = await loadNodemailer();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword }
    });
    const info = await transporter.sendMail({
      from: `"Galerie photo" <${gmailUser}>`,
      to: recipient,
      subject,
      html,
      attachments
    });
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('notify-selection: send failed', error?.message || error);
    return res.status(502).json({ error: "L'e-mail n'a pas pu être envoyé." });
  }
}
