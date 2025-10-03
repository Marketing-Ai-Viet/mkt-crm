export const MKT_SENDMAIL_TEMPLATE_SEEDS_IDS = {
  WELCOME: 'c136713b-9013-4383-88af-25746e0fd3a5',
  PASSWORD_RESET: 'f6b252ae-2d15-4ed9-abe1-6150e7350d03',
};

// Seed record shape for sendmail templates
export interface MktSendmailTemplateSeed {
  name: string;
  code: string;
  language: string; // e.g., 'en', 'vi'
  type: string; // e.g., 'WELCOME_EMAIL', 'PASSWORD_RESET'
  subject: string;
  text: string; // plain text content
  body: string; // HTML content
}

export const MKT_SENDMAIL_TEMPLATE_DATA_SEED_COLUMNS: (keyof MktSendmailTemplateSeed)[] =
  ['name', 'code', 'language', 'type', 'subject', 'text', 'body'];

export const MKT_SENDMAIL_TEMPLATE_DATA_SEEDS: MktSendmailTemplateSeed[] = [
  {
    name: 'Welcome Email',
    code: 'WELCOME',
    language: 'en',
    type: 'WELCOME_EMAIL',
    subject: 'Welcome to Our Service!',
    text: `Hello,
Your account has been created successfully on our system.
Here is your temporary password:
{{password}}

Please log in and change your password as soon as possible for security reasons.
If you have any issues accessing your account, feel free to contact support.

Thank you,
The Support Team

---------------------------
This is an automated message, please do not reply to this email.`,
    body: `<div style="font-family:Arial,sans-serif;background-color:#f6f8fa;padding:20px;"><div style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e1e4e8;border-radius:6px;padding:30px;"><h2 style="color:#2c3e50;">Hello,</h2><p>Your account has been created successfully on our system.</p><p><strong>Here is your temporary password:</strong></p><div style="font-weight:bold;background-color:#f0f0f0;padding:8px 12px;border-radius:4px;display:inline-block;font-family:'Courier New',monospace;margin-top:10px;color:#e74c3c;">{{password}}</div><p>Please log in and change your password as soon as possible for security reasons.<br>If you have any issues accessing your account, feel free to contact support.</p><p>Thank you,<br>The Support Team</p><div style="margin-top:30px;font-size:13px;color:#888;">This is an automated message, please do not reply to this email.</div></div></div>`,
  },
  {
    name: 'Chào mừng',
    code: 'WELCOME',
    language: 'vi-VN',
    type: 'WELCOME_EMAIL',
    subject: 'Chào mừng bạn đến với dịch vụ của chúng tôi!',
    text: `Xin chào,
Tài khoản của bạn đã được tạo thành công trên hệ thống của chúng tôi.
Đây là mật khẩu tạm thời của bạn:
{{password}}

Vui lòng đăng nhập và đổi mật khẩu ngay để đảm bảo an toàn.
Nếu bạn gặp bất kỳ vấn đề nào khi truy cập tài khoản, hãy liên hệ bộ phận hỗ trợ.

Cảm ơn bạn,
Đội ngũ Hỗ trợ

---------------------------
Đây là email tự động, vui lòng không trả lời email này.`,
    body: `<div style="font-family:Arial,sans-serif;background-color:#f6f8fa;padding:20px;"><div style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e1e4e8;border-radius:6px;padding:30px;"><h2 style="color:#2c3e50;">Xin chào,</h2><p>Tài khoản của bạn đã được tạo thành công trên hệ thống của chúng tôi.</p><p><strong>Đây là mật khẩu tạm thời của bạn:</strong></p><div style="font-weight:bold;background-color:#f0f0f0;padding:8px 12px;border-radius:4px;display:inline-block;font-family:'Courier New',monospace;margin-top:10px;color:#e74c3c;">{{password}}</div><p>Vui lòng đăng nhập và đổi mật khẩu ngay để đảm bảo an toàn.<br>Nếu bạn gặp bất kỳ vấn đề nào khi truy cập tài khoản, hãy liên hệ bộ phận hỗ trợ.</p><p>Cảm ơn bạn,<br>Đội ngũ Hỗ trợ</p><div style="margin-top:30px;font-size:13px;color:#888;">Đây là email tự động, vui lòng không trả lời email này.</div></div></div>`,
  },
];
