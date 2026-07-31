import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://ai-music.viaweb.pro";
  const confirmUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const host = process.env.SMTP_HOST || "localhost";
  const port = parseInt(process.env.SMTP_PORT || "25", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "noreply@ai-music.viaweb.pro";

  // Create transporter for local sendmail or SMTP server
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #080c14; color: #f1f5f9; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #0f172a; border: 1px solid #26334d; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .title { color: #38bdf8; font-size: 22px; font-weight: bold; margin-bottom: 12px; }
          .text { color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .btn { display: inline-block; background: linear-gradient(to right, #38bdf8, #2563eb); color: #ffffff !important; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-size: 15px; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3); }
          .footer { margin-top: 32px; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="title">🎵 AI Music Prompt Generator</div>
          <p class="text">Olá!</p>
          <p class="text">Obrigado por se cadastrar. Clique no botão abaixo para confirmar seu endereço de e-mail e ativar sua conta no <strong>AI Music Prompt Generator</strong>:</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${confirmUrl}" class="btn" target="_blank">Confirmar Meu E-mail</a>
          </p>
          <p class="text" style="font-size: 13px; color: #94a3b8;">Ou copie e cole o link no seu navegador:<br><a href="${confirmUrl}" style="color: #38bdf8;">${confirmUrl}</a></p>
          <div class="footer">
            Music Prompt Generator • Se você não solicitou este cadastro, por favor ignore este e-mail.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `AI Music Generator <${from}>`,
      to: email,
      subject: "Confirme sua conta - AI Music Prompt Generator",
      html,
    });
    console.log("Verification email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    // Return success: false but log error for fallback debugging
    return { success: false, error: error instanceof Error ? error.message : "Email sending failed" };
  }
}
