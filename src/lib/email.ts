import nodemailer from "nodemailer";

const RESEND_FROM = process.env.RESEND_FROM || "AI Music Generator <no-reply@ai-music.viaweb.pro>";

async function sendViaResend(email: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null; // not configured — caller falls back to SMTP

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: email,
      subject,
      html,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log("Verification email sent via Resend:", data.id);
    return { success: true, messageId: data.id as string };
  }

  const err = await res.text();
  console.error("Resend send failed:", res.status, err);
  return { success: false, error: `Resend error (${res.status})` };
}

async function sendViaSmtp(email: string, subject: string, html: string) {
  const host = process.env.SMTP_HOST || "localhost";
  const port = parseInt(process.env.SMTP_PORT || "25", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || RESEND_FROM;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });

  const info = await transporter.sendMail({
    from: `AI Music Generator <${from}>`,
    to: email,
    subject,
    html,
  });
  console.log("Verification email sent via SMTP:", info.messageId);
  return { success: true, messageId: info.messageId };
}

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://ai-music.viaweb.pro";
  const confirmUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  // Absolute URL required — email clients cannot load local/relative images.
  // PNG format: WebP is not supported by several email clients (Outlook, some Gmail modes).
  const logoUrl = `${baseUrl}/ai-music-light.png`;

  const body = `
          <p class="text">Hi!</p>
          <p class="text">Thanks for signing up for <strong>AI Music Prompt Studio</strong>. Click the button below to confirm your email address and activate your account:</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${confirmUrl}" target="_blank" style="display:inline-block;background-color:#6335f8;color:#ffffff;font-weight:bold;padding:14px 28px;text-decoration:none;border-radius:12px;font-size:15px;"><span class="btn-text" style="color:#ffffff !important;text-decoration:none;">Confirm My Email</span></a>
          </p>
          <p class="text" style="font-size: 13px; color: #6b7280;">Or copy and paste this link into your browser:<br><a href="${confirmUrl}" style="color: #6335f8;">${confirmUrl}</a></p>`;

  const html = buildEmailHtml(logoUrl, "Confirm your email", body);
  const subject = "Confirm your account - AI Music Prompt Studio";

  return sendWithFallback(email, subject, html);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://ai-music.viaweb.pro";
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const logoUrl = `${baseUrl}/ai-music-light.png`;

  const body = `
          <p class="text">Hi!</p>
          <p class="text">We received a request to reset your password for <strong>AI Music Prompt Studio</strong>. Click the button below to choose a new password. This link expires in 1 hour.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" target="_blank" style="display:inline-block;background-color:#6335f8;color:#ffffff;font-weight:bold;padding:14px 28px;text-decoration:none;border-radius:12px;font-size:15px;"><span class="btn-text" style="color:#ffffff !important;text-decoration:none;">Reset My Password</span></a>
          </p>
          <p class="text" style="font-size: 13px; color: #6b7280;">Or copy and paste this link into your browser:<br><a href="${resetUrl}" style="color: #6335f8;">${resetUrl}</a></p>
          <p class="text" style="font-size: 13px; color: #6b7280;">If you didn't request this, you can safely ignore this email.</p>`;

  const html = buildEmailHtml(logoUrl, "Reset your password", body);
  const subject = "Reset your password - AI Music Prompt Studio";

  return sendWithFallback(email, subject, html);
}

function buildEmailHtml(logoUrl: string, title: string, body: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; color: #1a1712; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
          .logo { display: block; margin: 0 auto 24px auto; height: 48px; width: auto; }
          .title { color: #6335f8; font-size: 22px; font-weight: bold; margin-bottom: 12px; text-align: center; }
          .text { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; }
          /* Neutralize Gmail's automatic blue link colorization */
          a:link, a:visited { text-decoration: none; }
          .btn-text { color: #ffffff !important; }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${logoUrl}" alt="AI Music Prompt Studio" class="logo" />
          <div class="title">${title}</div>
          ${body}
          <div class="footer">
            AI Music Prompt Studio • If you didn't request this, please ignore this email.
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendWithFallback(email: string, subject: string, html: string) {
  // Preferred path: Resend API (best deliverability). Falls back to SMTP
  // when RESEND_API_KEY is not configured or the Resend call fails.
  try {
    const resendResult = await sendViaResend(email, subject, html);
    if (resendResult) return resendResult;
  } catch (error) {
    console.error("Resend transport error:", error);
  }

  try {
    return await sendViaSmtp(email, subject, html);
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Email sending failed" };
  }
}
