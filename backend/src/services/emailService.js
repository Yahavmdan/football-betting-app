const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

const emailStrings = {
  en: {
    verifyTitle: 'Verify Your Email',
    verifyDesc: 'Thanks for signing up! Enter this code to verify your email address and activate your account.',
    codeLabel: 'Your verification code is:',
    expiresIn: 'This code expires in 10 minutes.',
    footerApp: '1X2 BET',
    footerAuto: 'This is an automated message. Please do not reply.',
    subject: (otp) => `${otp} - Verify your email - 1X2 BET`
  },
  he: {
    verifyTitle: 'אמת את כתובת האימייל שלך',
    verifyDesc: 'תודה שנרשמת! הזן את הקוד הזה כדי לאמת את כתובת האימייל שלך ולהפעיל את החשבון.',
    codeLabel: 'קוד האימות שלך:',
    expiresIn: 'קוד זה יפוג בעוד 10 דקות.',
    footerApp: '1X2 BET',
    footerAuto: 'זוהי הודעה אוטומטית. אנא אל תשיב.',
    subject: (otp) => `${otp} - אימות אימייל - 1X2 BET`
  }
};

function baseTemplate(content, lang = 'en') {
  const isRtl = lang === 'he';
  const dir = isRtl ? 'rtl' : 'ltr';
  const align = isRtl ? 'right' : 'left';
  const t = emailStrings[lang] || emailStrings.en;

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #0f172a !important; }
      .email-card { background-color: #1e293b !important; }
      .email-heading { color: #f1f5f9 !important; }
      .email-text { color: #94a3b8 !important; }
      .email-code-text { color: #f1f5f9 !important; }
      .email-muted { color: #64748b !important; }
      .email-footer { background-color: #0f172a !important; border-top-color: #334155 !important; }
      .email-footer-text { color: #64748b !important; }
      .otp-digit { background-color: #1a3a2a !important; color: #f1f5f9 !important; border-color: #4ade80 !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" class="email-body" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" class="email-card" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:800;color:#4ade80;">1</span>
              <span style="font-size:28px;font-weight:800;color:rgba(255,255,255,0.9);">X</span>
              <span style="font-size:28px;font-weight:800;color:#4ade80;">2</span>
              <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.45);letter-spacing:3px;margin-left:8px;">BET</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;" dir="${dir}" align="${align}">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding:24px 40px;background:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
              <p class="email-footer-text" style="margin:0;color:#94a3b8;font-size:12px;">${t.footerApp}</p>
              <p class="email-footer-text" style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">${t.footerAuto}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

exports.sendVerificationOTP = async (to, otp, lang = 'en') => {
  const t = emailStrings[lang] || emailStrings.en;
  const digits = otp.split('');

  const digitBoxes = digits.map(d =>
    `<td class="otp-digit" style="width:48px;height:56px;background:#f0fdf4;border:2px solid #4ade80;border-radius:12px;text-align:center;font-size:28px;font-weight:800;color:#1a1a2e;font-family:'Segoe UI',monospace;">${d}</td>`
  ).join('<td style="width:8px;"></td>');

  const html = baseTemplate(`
    <h2 class="email-heading" style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">${t.verifyTitle}</h2>
    <p class="email-text" style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
      ${t.verifyDesc}
    </p>
    <table dir="ltr" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;direction:ltr;">
      <tr>${digitBoxes}</tr>
    </table>
    <p class="email-muted" style="margin:0 0 4px;color:#94a3b8;font-size:13px;text-align:center;">${t.codeLabel}</p>
    <p class="email-code-text" style="margin:0 0 24px;text-align:center;font-size:24px;font-weight:800;color:#1a1a2e;letter-spacing:8px;direction:ltr;unicode-bidi:bidi-override;">${otp}</p>
    <p class="email-muted" style="margin:0;color:#cbd5e1;font-size:12px;">${t.expiresIn}</p>
  `, lang);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: t.subject(otp),
    html
  });

  if (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

exports.sendPasswordResetEmail = async (to, token) => {
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;

  const html = baseTemplate(`
    <h2 class="email-heading" style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">Reset Your Password</h2>
    <p class="email-text" style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#4ade80,#22c55e);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;letter-spacing:0.025em;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p class="email-muted" style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Or copy this link into your browser:</p>
    <p style="margin:0 0 24px;word-break:break-all;color:#4ade80;font-size:13px;direction:ltr;">${resetUrl}</p>
    <p class="email-muted" style="margin:0 0 4px;color:#cbd5e1;font-size:12px;">This link expires in 1 hour.</p>
    <p class="email-muted" style="margin:0;color:#cbd5e1;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
  `);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your password - 1X2 BET',
    html
  });

  if (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
