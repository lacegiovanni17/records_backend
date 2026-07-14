export const otpTemplate = (code: string, recipientEmail: string): string => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="480" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:8px;padding:40px;border:1px solid #e4e4e7;">
          <tr>
            <td>
              <h2 style="margin:0 0 8px;color:#18181b;font-size:20px;">Verification Code</h2>
              <p style="color:#71717a;font-size:14px;margin:0 0 24px;">
                We've sent a code to <strong style="color:#18181b;">${recipientEmail}</strong>.
                Enter it below to continue.
              </p>
              <div style="text-align:center;padding:24px 0;">
                <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#18181b;">
                  ${code}
                </span>
              </div>
              <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0;text-align:center;">
                Expires in <strong>10 minutes</strong>. Never share this code.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
