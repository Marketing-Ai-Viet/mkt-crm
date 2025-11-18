import {
  MKT_TEMPLATE_DATA_SEEDS_IDS,
  MKT_TEMPLATE_TYPE,
} from 'src/mkt-core/order/constants/mkt-template.constant';

const ORDER_COMPLETED_EMAIL = [
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ORDER_COMPLETED_EMAIL_ID,
    name: 'Thông báo đơn hàng hoàn thành',
    type: MKT_TEMPLATE_TYPE.ORDER_EMAIL,
    content: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đơn hàng #{{order_number}} đã hoàn thành</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Đơn hàng #{{order_number}} đã hoàn thành
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Xin chào <strong>{{customer_name}}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Đơn hàng của bạn đã được xử lý và hoàn thành thành công! 🎉
                            </p>
                            
                            <!-- Order Info Box -->
                            <table role="presentation" style="width: 100%; background-color: #f0fdf4; border-radius: 8px; margin: 30px 0; border-left: 4px solid #10b981;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px 0; color: #065f46; font-size: 18px; font-weight: 600;">
                                            📋 Thông tin đơn hàng
                                        </h2>
                                        
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">
                                                    Mã đơn hàng:
                                                </td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                                                    #{{order_number}}
                                                </td>
                                            </tr>
                                            <tr style="border-top: 2px solid #d1fae5;">
                                                <td style="padding: 15px 0 8px 0; color: #6b7280; font-size: 14px;">
                                                    Tổng giá trị:
                                                </td>
                                                <td style="padding: 15px 0 8px 0; color: #10b981; font-size: 20px; font-weight: 700;">
                                                    {{order_total}}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                                    Trạng thái:
                                                </td>
                                                <td style="padding: 8px 0;">
                                                    <span style="display: inline-block; padding: 4px 12px; background-color: #d1fae5; color: #065f46; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                                        ✓ {{order_status}}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                                    Ngày hoàn thành:
                                                </td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px;">
                                                    {{order_date}}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Products Table -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                                <thead>
                                    <tr style="background-color: #f3f4f6;">
                                        <th style="padding: 12px; text-align: left; color: #374151; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">
                                            Sản phẩm
                                        </th>
                                        <th style="padding: 12px; text-align: center; color: #374151; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">
                                            Số lượng
                                        </th>
                                        <th style="padding: 12px; text-align: right; color: #374151; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">
                                            Giá
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {{order_items}}
                                </tbody>
                            </table>
                            
                            <!-- Thank you message -->
                            <table role="presentation" style="width: 100%; background-color: #fef3f2; border-radius: 8px; margin: 30px 0; border-left: 4px solid #10b981;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600;">
                                            💚 Cảm ơn bạn đã tin tưởng!
                                        </h3>
                                        <p style="margin: 0; color: #059669; font-size: 14px; line-height: 1.6;">
                                            Chúng tôi rất trân trọng sự hợp tác của bạn. Nếu có bất kỳ thắc mắc nào, đừng ngần ngại liên hệ với chúng tôi.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.8; text-align: center;">
                                Chúc bạn một ngày tốt lành! ✨
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fc; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #333333; font-size: 15px; font-weight: 600;">
                                Trân trọng,
                            </p>
                            <p style="margin: 0; color: #10b981; font-size: 16px; font-weight: 700;">
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
    position: 20,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    locale: 'VI',
    templateKey: 'order_completed_notification',
  },
];

export const ORDER_EMAIL_TEMPLATE = [
  ...ORDER_COMPLETED_EMAIL,
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.NEW_ORDER_EMAIL_ID,
    name: 'Thông báo đơn hàng mới',
    type: MKT_TEMPLATE_TYPE.ORDER_EMAIL,
    content: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đơn hàng mới #{{order_number}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                            <div style="font-size: 48px; margin-bottom: 10px;">🛒</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Đơn hàng mới #{{order_number}}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Xin chào, Bạn có một đơn hàng mới
                            </p>
                            
                            <!-- Order Info Box -->
                            <table role="presentation" style="width: 100%; background-color: #f0fdf4; border-radius: 8px; margin: 30px 0; border-left: 4px solid #10b981;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px 0; color: #065f46; font-size: 18px; font-weight: 600;">
                                            📋 Thông tin đơn hàng
                                        </h2>
                                        
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">
                                                    Mã đơn hàng:
                                                </td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                                                    #{{order_number}}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                                    Khách hàng:
                                                </td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                                                    {{customer_name}}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                                    Email:
                                                </td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px;">
                                                    <a href="mailto:{{customer_email}}" style="color: #10b981; text-decoration: none;">{{customer_email}}</a>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                                    Số điện thoại:
                                                </td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px;">
                                                    <a href="tel:{{customer_phone}}" style="color: #10b981; text-decoration: none;">{{customer_phone}}</a>
                                                </td>
                                            </tr>
                                            <tr style="border-top: 2px solid #d1fae5;">
                                                <td style="padding: 15px 0 8px 0; color: #6b7280; font-size: 14px;">
                                                    Tổng giá trị:
                                                </td>
                                                <td style="padding: 15px 0 8px 0; color: #10b981; font-size: 20px; font-weight: 700;">
                                                    {{order_value}}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                                    Trạng thái:
                                                </td>
                                                <td style="padding: 8px 0;">
                                                    <span style="display: inline-block; padding: 4px 12px; background-color: #fef3c7; color: #92400e; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                                        {{order_status}}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                                    Ngày đặt hàng:
                                                </td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px;">
                                                    {{order_date}}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Products Table -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                                <thead>
                                    <tr style="background-color: #f3f4f6;">
                                        <th style="padding: 12px; text-align: left; color: #374151; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">
                                            Sản phẩm
                                        </th>
                                        <th style="padding: 12px; text-align: center; color: #374151; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">
                                            Số lượng
                                        </th>
                                        <th style="padding: 12px; text-align: right; color: #374151; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">
                                            Giá
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {{order_items}}
                                </tbody>
                            </table>
                            
                            <!-- QR Code Payment -->
                            {{#if qr_code_url}}
                            <table role="presentation" style="width: 100%; background-color: #fef3f2; border-radius: 8px; margin: 30px 0; border-left: 4px solid #ef4444;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <h3 style="margin: 0 0 20px 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                                            💳 Quét mã QR để thanh toán
                                        </h3>
                                        <img src="{{qr_code_url}}" alt="QR Code thanh toán" style="max-width: 300px; width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 15px;" />
                                        <p style="margin: 0 0 15px 0; color: #7f1d1d; font-size: 13px; line-height: 1.6;">
                                            Quét mã QR bằng ứng dụng ngân hàng để thanh toán nhanh chóng
                                        </p>
                                        {{#if payment_page_url}}
                                        <p style="margin: 0; color: #991b1b; font-size: 14px;">
                                            Hoặc <a href="{{payment_page_url}}" style="color: #dc2626; font-weight: 600; text-decoration: underline;">nhấn vào đây</a> để truy cập trang thanh toán
                                        </p>
                                        {{/if}}
                                    </td>
                                </tr>
                            </table>
                            {{/if}}
                            
                            <!-- Notes if any -->
                            {{#if order_notes}}
                            <table role="presentation" style="width: 100%; background-color: #f8f9fc; border-radius: 8px; margin: 30px 0; border-left: 4px solid #6366f1;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="margin: 0 0 12px 0; color: #3730a3; font-size: 15px; font-weight: 600;">
                                            📝 Ghi chú
                                        </h3>
                                        <p style="margin: 0; color: #4338ca; font-size: 14px; line-height: 1.6;">
                                            {{order_notes}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}
                            
                            <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.8; text-align: center;">
                                Vui lòng xử lý đơn hàng này trong thời gian sớm nhất
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fc; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #333333; font-size: 15px; font-weight: 600;">
                                Trân trọng,
                            </p>
                            <p style="margin: 0; color: #10b981; font-size: 16px; font-weight: 700;">
                                Hệ thống {{company_name}}
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
    position: 19,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    locale: 'VI',
    templateKey: 'new_order_notification',
  },
];
