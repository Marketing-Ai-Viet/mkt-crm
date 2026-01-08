import {
  MKT_TEMPLATE_DATA_SEEDS_IDS,
  MKT_TEMPLATE_TYPE,
} from 'src/mkt-core/order/constants/mkt-template.constant';

export const CUSTOMER_EMAIL_TEMPLATE = [
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.WELCOME_EMAIL_ID,
    name: 'Chào mừng khách hàng mới',
    type: MKT_TEMPLATE_TYPE.WELCOME_EMAIL,
    content: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chào mừng đến với {{company_name}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Chào mừng đến với {{company_name}}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Kính gửi <strong style="color: #667eea;">{{customer_name}}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.8;">
                                Chúng tôi rất vui mừng chào đón bạn đến với hệ thống CRM của chúng tôi! 🎉
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #555555; font-size: 16px; line-height: 1.8;">
                                Hãy bắt đầu hành trình quản lý khách hàng hiệu quả hơn cùng với {{company_name}}. Chúng tôi cam kết mang đến cho bạn trải nghiệm tốt nhất và hỗ trợ tối đa trong quá trình sử dụng.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="margin: 30px 0; width: 100%;">
                                <tr>
                                    <td align="center">
                                        <a href="{{dashboard_url}}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                            Khám phá ngay
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Support Info Box -->
                            <table role="presentation" style="width: 100%; background-color: #f8f9fc; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 12px 0; color: #333333; font-size: 15px; font-weight: 600;">
                                            💡 Cần hỗ trợ?
                                        </p>
                                        <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.6;">
                                            Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp đỡ bạn:<br>
                                            📧 Email: <a href="mailto:{{support_email}}" style="color: #667eea; text-decoration: none;">{{support_email}}</a><br>
                                            📞 Hotline: <a href="tel:{{support_phone}}" style="color: #667eea; text-decoration: none;">{{support_phone}}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; color: #555555; font-size: 16px; line-height: 1.8;">
                                Chúng tôi rất mong được đồng hành cùng bạn trên hành trình phát triển kinh doanh.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fc; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #333333; font-size: 15px; font-weight: 600;">
                                Trân trọng,
                            </p>
                            <p style="margin: 0; color: #667eea; font-size: 16px; font-weight: 700;">
                                Đội ngũ {{company_name}}
                            </p>
                            
                            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                                    Email này được gửi tự động, vui lòng không trả lời.<br>
                                    © 2025 {{company_name}}. Tất cả quyền được bảo lưu.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
    version: '1.0.0',
    position: 18,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Sophia Robinson',
    locale: 'VI',
    templateKey: 'welcome_customers',
  },
];
