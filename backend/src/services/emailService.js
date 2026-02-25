const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#1a1a2e;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.3);">
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
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">Football Betting App</p>
              <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">This is an automated message. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

exports.sendVerificationOTP = async (to, otp) => {
  const digits = otp.split('');
  const digitBoxes = digits.map(d =>
    `<td style="width:48px;height:56px;background:#f0fdf4;border:2px solid #4ade80;border-radius:12px;text-align:center;font-size:28px;font-weight:800;color:#1a1a2e;font-family:'Segoe UI',monospace;">${d}</td>`
  ).join('<td style="width:8px;"></td>');

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">Verify Your Email</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
      Thanks for signing up! Enter this code to verify your email address and activate your account.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>${digitBoxes}</tr>
    </table>
    <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;text-align:center;">Your verification code is:</p>
    <p style="margin:0 0 24px;text-align:center;font-size:24px;font-weight:800;color:#1a1a2e;letter-spacing:8px;">${otp}</p>
    <p style="margin:0;color:#cbd5e1;font-size:12px;">This code expires in 10 minutes.</p>
  `);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${otp} - Verify your email - Football Betting`,
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
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">Reset Your Password</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
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
    <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Or copy this link into your browser:</p>
    <p style="margin:0 0 24px;word-break:break-all;color:#4ade80;font-size:13px;">${resetUrl}</p>
    <p style="margin:0 0 4px;color:#cbd5e1;font-size:12px;">This link expires in 1 hour.</p>
    <p style="margin:0;color:#cbd5e1;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
  `);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your password - Football Betting',
    html
  });

  if (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
