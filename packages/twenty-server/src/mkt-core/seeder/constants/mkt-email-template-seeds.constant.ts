import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/mkt-email/workspace-entities/mkt-template.workspace-entity';

/**
 * Email template seed data for unified MktTemplate entity
 * Used by dev-seeder to populate initial email templates
 */

export const MKT_EMAIL_TEMPLATE_SEEDS_IDS = {
  WELCOME: 'c136713b-9013-4383-88af-25746e0fd3a5',
  PASSWORD_RESET: 'f6b252ae-2d15-4ed9-abe1-6150e7350d03',
};

// Seed record shape for email templates
export type MktEmailTemplateSeed = {
  name: string;
  templateKey: string;
  type: string;
  locale: string;
  subject: string;
  content: string;
  version: string;
  isActive: boolean;
};

export const MKT_EMAIL_TEMPLATE_DATA_SEED_COLUMNS: string[] = [
  'name',
  'templateKey',
  'type',
  'locale',
  'subject',
  'content',
  'version',
  'isActive',
];

/**
 * Email template seeds data
 * Maps old mktSendmailTemplate data to new unified mktTemplate structure
 */
export const MKT_EMAIL_TEMPLATE_DATA_SEEDS: MktEmailTemplateSeed[] = [
  {
    name: 'Welcome Email',
    templateKey: 'WELCOME_EMAIL_en',
    type: MKT_TEMPLATE_TYPE.WELCOME_EMAIL,
    locale: 'en',
    subject: 'Welcome to Our Service!',
    content: `<div style="font-family:Arial,sans-serif;background-color:#f6f8fa;padding:20px;"><div style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e1e4e8;border-radius:6px;padding:30px;"><h2 style="color:#2c3e50;">Hello,</h2><p>Your account has been created successfully on our system.</p><p><strong>Here is your temporary password:</strong></p><div style="font-weight:bold;background-color:#f0f0f0;padding:8px 12px;border-radius:4px;display:inline-block;font-family:'Courier New',monospace;margin-top:10px;color:#e74c3c;">{{password}}</div><p>Please log in and change your password as soon as possible for security reasons.<br>If you have any issues accessing your account, feel free to contact support.</p><p>Thank you,<br>The Support Team</p><div style="margin-top:30px;font-size:13px;color:#888;">This is an automated message, please do not reply to this email.</div></div></div>`,
    version: '1.0.0',
    isActive: true,
  },
  {
    name: 'Chào mừng',
    templateKey: 'WELCOME_EMAIL_vi-VN',
    type: MKT_TEMPLATE_TYPE.WELCOME_EMAIL,
    locale: 'vi-VN',
    subject: 'Chào mừng bạn đến với dịch vụ của chúng tôi!',
    content: `<div style="font-family:Arial,sans-serif;background-color:#f6f8fa;padding:20px;"><div style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e1e4e8;border-radius:6px;padding:30px;"><h2 style="color:#2c3e50;">Xin chào,</h2><p>Tài khoản của bạn đã được tạo thành công trên hệ thống của chúng tôi.</p><p><strong>Đây là mật khẩu tạm thời của bạn:</strong></p><div style="font-weight:bold;background-color:#f0f0f0;padding:8px 12px;border-radius:4px;display:inline-block;font-family:'Courier New',monospace;margin-top:10px;color:#e74c3c;">{{password}}</div><p>Vui lòng đăng nhập và đổi mật khẩu ngay để đảm bảo an toàn.<br>Nếu bạn gặp bất kỳ vấn đề nào khi truy cập tài khoản, hãy liên hệ bộ phận hỗ trợ.</p><p>Cảm ơn bạn,<br>Đội ngũ Hỗ trợ</p><div style="margin-top:30px;font-size:13px;color:#888;">Đây là email tự động, vui lòng không trả lời email này.</div></div></div>`,
    version: '1.0.0',
    isActive: true,
  },
  {
    name: 'Two Factor Authentication',
    templateKey: 'TWO_FACTOR_AUTH_en',
    type: MKT_TEMPLATE_TYPE.TWO_FACTOR_AUTH,
    locale: 'en',
    subject: 'Two Factor Authentication',
    content: `<div style="font-family:Arial,sans-serif;background-color:#f6f8fa;padding:20px;"><div style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e1e4e8;border-radius:6px;padding:30px;"><h2 style="color:#2c3e50;">Hello,</h2><p>Your two factor authentication code is:</p><div style="font-weight:bold;background-color:#f0f0f0;padding:8px 12px;border-radius:4px;display:inline-block;font-family:'Courier New',monospace;margin-top:10px;color:#e74c3c;">{{otp}}</div><p>Please use this code to authenticate your account.<br>If you did not request this authentication, please contact support.</p><p>Thank you,<br>The Support Team</p><div style="margin-top:30px;font-size:13px;color:#888;">This is an automated message, please do not reply to this email.</div></div></div>`,
    version: '1.0.0',
    isActive: true,
  },
  {
    name: 'Xác thực hai yếu tố',
    templateKey: 'TWO_FACTOR_AUTH_vi-VN',
    type: MKT_TEMPLATE_TYPE.TWO_FACTOR_AUTH,
    locale: 'vi-VN',
    subject: 'Xác thực hai yếu tố',
    content: `<div style="font-family:Arial,sans-serif;background-color:#f6f8fa;padding:20px;"><div style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e1e4e8;border-radius:6px;padding:30px;"><h2 style="color:#2c3e50;">Xin chào,</h2><p>Mã xác thực hai yếu tố của bạn là:</p><div style="font-weight:bold;background-color:#f0f0f0;padding:8px 12px;border-radius:4px;display:inline-block;font-family:'Courier New',monospace;margin-top:10px;color:#e74c3c;">{{otp}}</div><p>Vui lòng sử dụng mã này để xác thực tài khoản của bạn.<br>Nếu bạn không yêu cầu xác thực này, vui lòng liên hệ bộ phận hỗ trợ.</p><p>Cảm ơn bạn,<br>Đội ngũ Hỗ trợ</p><div style="margin-top:30px;font-size:13px;color:#888;">Đây là email tự động, vui lòng không trả lời email này.</div></div></div>`,
    version: '1.0.0',
    isActive: true,
  },
  {
    name: 'Account Update Notification',
    templateKey: 'ACCOUNT_UPDATE_EMAIL_en',
    type: MKT_TEMPLATE_TYPE.ACCOUNT_UPDATE_EMAIL,
    locale: 'en',
    subject: 'Your Account Has Been Updated',
    content: `<div style="font-family:Arial,sans-serif;background-color:#f6f8fa;padding:20px;"><div style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e1e4e8;border-radius:6px;padding:30px;"><h2 style="color:#2c3e50;">Hello,</h2><p>Your account information has been updated successfully on our system.</p><p>If you did not make this change or believe this update was made in error, please contact our support team immediately.</p><p>Thank you,<br>The Support Team</p><div style="margin-top:30px;font-size:13px;color:#888;">This is an automated message, please do not reply to this email.</div></div></div>`,
    version: '1.0.0',
    isActive: true,
  },
  {
    name: 'Thông báo cập nhật tài khoản',
    templateKey: 'ACCOUNT_UPDATE_EMAIL_vi-VN',
    type: MKT_TEMPLATE_TYPE.ACCOUNT_UPDATE_EMAIL,
    locale: 'vi-VN',
    subject: 'Tài khoản của bạn đã được cập nhật',
    content: `<div style="font-family:Arial,sans-serif;background-color:#f6f8fa;padding:20px;"><div style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e1e4e8;border-radius:6px;padding:30px;"><h2 style="color:#2c3e50;">Xin chào,</h2><p>Thông tin tài khoản của bạn đã được cập nhật thành công trên hệ thống của chúng tôi.</p><p>Nếu bạn không thực hiện thay đổi này hoặc tin rằng việc cập nhật này được thực hiện nhầm, vui lòng liên hệ ngay với bộ phận hỗ trợ.</p><p>Cảm ơn bạn,<br>Đội ngũ Hỗ trợ</p><div style="margin-top:30px;font-size:13px;color:#888;">Đây là email tự động, vui lòng không trả lời email này.</div></div></div>`,
    version: '1.0.0',
    isActive: true,
  },
];

/**
 * @deprecated Use MKT_TEMPLATE_TYPE from workspace-entity instead
 * Kept for backward compatibility during migration
 */
export const MKT_SENDMAIL_TEMPLATE_TYPE = MKT_TEMPLATE_TYPE;
