import {
  MKT_TEMPLATE_DATA_SEEDS_IDS,
  MKT_TEMPLATE_TYPE,
} from 'src/mkt-core/order/constants/mkt-template.constant';

const EXAMPLES = [
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_1,
    name: 'Welcome Email Template',
    type: MKT_TEMPLATE_TYPE.EMAIL,
    content: `Dear {{customer_name}},

Welcome to our platform! We're excited to have you on board.

Your account has been successfully created and you can now access all our features.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
{{company_name}} Team`,
    version: '1.0.0',
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Sarah Johnson',
    locale: 'EN',
    templateKey: 'welcome_member_email',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_2,
    name: 'Invoice Template',
    type: MKT_TEMPLATE_TYPE.INVOICE,
    content: `INVOICE

Invoice Number: {{invoice_number}}
Date: {{invoice_date}}
Due Date: {{due_date}}

Customer: {{customer_name}}
Address: {{customer_address}}

Description:
{{item_description}}

Amount: {{amount}}
VAT: {{vat}}
Total: {{total_amount}}

Payment Terms: Net 30 days

Thank you for your business!`,
    version: '2.1.0',
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Michael Chen',
    locale: 'EN',
    templateKey: 'standard_invoice',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_3,
    name: 'License Agreement Template',
    type: MKT_TEMPLATE_TYPE.CONTRACT,
    content: `SOFTWARE LICENSE AGREEMENT

This Software License Agreement ("Agreement") is entered into between {{company_name}} ("Licensor") and {{customer_name}} ("Licensee").

1. LICENSE GRANT
Subject to the terms of this Agreement, Licensor grants Licensee a non-exclusive, non-transferable license to use the software.

2. TERM
This license is valid from {{start_date}} to {{end_date}}.

3. PAYMENT
Licensee agrees to pay the license fee of {{license_fee}}.

4. TERMINATION
This Agreement may be terminated by either party with 30 days written notice.

Signed by:
{{company_name}}: _________________
{{customer_name}}: _________________`,
    version: '1.5.0',
    position: 3,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'David Kim',
    locale: 'EN',
    templateKey: 'license_agreement',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_4,
    name: 'Support Ticket Template',
    type: MKT_TEMPLATE_TYPE.TICKET,
    content: `SUPPORT TICKET

Ticket ID: {{ticket_id}}
Priority: {{priority}}
Category: {{category}}

Customer: {{customer_name}}
Email: {{customer_email}}

Issue Description:
{{issue_description}}

Steps to Reproduce:
{{steps_to_reproduce}}

Expected Behavior:
{{expected_behavior}}

Actual Behavior:
{{actual_behavior}}

Additional Information:
{{additional_info}}`,
    version: '1.2.0',
    position: 4,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Lisa Wang',
    locale: 'EN',
    templateKey: 'support_ticket',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_5,
    name: 'Order Confirmation Template',
    type: MKT_TEMPLATE_TYPE.ORDER,
    content: `ORDER CONFIRMATION

Order Number: {{order_number}}
Order Date: {{order_date}}

Customer Information:
Name: {{customer_name}}
Email: {{customer_email}}
Phone: {{customer_phone}}

Order Details:
{{order_items}}

Subtotal: {{subtotal}}
Tax: {{tax}}
Total: {{total}}

Shipping Address:
{{shipping_address}}

Estimated Delivery: {{estimated_delivery}}

Thank you for your order!`,
    version: '1.3.0',
    position: 5,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jennifer Davis',
    locale: 'EN',
    templateKey: 'order_confirmation',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_6,
    name: 'Password Reset Template',
    type: MKT_TEMPLATE_TYPE.EMAIL,
    content: `Password Reset Request

Dear {{customer_name}},

We received a request to reset your password for your account.

Click the link below to reset your password:
{{reset_link}}

This link will expire in 24 hours.

If you didn't request this password reset, please ignore this email.

Best regards,
{{company_name}} Security Team`,
    version: '1.1.0',
    position: 6,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Robert Taylor',
    locale: 'EN',
    templateKey: 'password_reset',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_7,
    name: 'Service Agreement Template',
    type: MKT_TEMPLATE_TYPE.CONTRACT,
    content: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is made between {{company_name}} ("Service Provider") and {{customer_name}} ("Client").

SERVICES
Service Provider will provide the following services:
{{service_description}}

TERM
This agreement begins on {{start_date}} and continues until {{end_date}}.

COMPENSATION
Client agrees to pay {{service_fee}} for the services provided.

TERMINATION
Either party may terminate this agreement with 30 days written notice.

Signed:
{{company_name}}: _________________
{{customer_name}}: _________________`,
    version: '2.0.0',
    position: 7,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jessica Brown',
    locale: 'EN',
    templateKey: 'service_agreement',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_8,
    name: 'Product Catalog Template',
    type: MKT_TEMPLATE_TYPE.CATALOG,
    content: `PRODUCT CATALOG

{{company_name}} - {{catalog_date}}

{{#each products}}
Product: {{name}}
SKU: {{sku}}
Price: {{price}}
Description: {{description}}
Category: {{category}}
Availability: {{availability}}

{{/each}}

For more information, visit: {{website_url}}
Contact: {{contact_email}}`,
    version: '1.4.0',
    position: 8,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Mark Wilson',
    locale: 'EN',
    templateKey: 'product_catalog',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_9,
    name: 'Maintenance Notice Template',
    type: MKT_TEMPLATE_TYPE.NOTIFICATION,
    content: `MAINTENANCE NOTICE

Dear {{customer_name}},

We will be performing scheduled maintenance on {{maintenance_date}} from {{start_time}} to {{end_time}}.

During this time, the following services may be temporarily unavailable:
{{affected_services}}

We apologize for any inconvenience this may cause.

For urgent matters, please contact our emergency support line: {{emergency_contact}}

Thank you for your understanding.

{{company_name}} Operations Team`,
    version: '1.0.0',
    position: 9,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Christopher Martinez',
    locale: 'EN',
    templateKey: 'maintenance_notice',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_10,
    name: 'Quote Request Template',
    type: MKT_TEMPLATE_TYPE.QUOTE,
    content: `QUOTE REQUEST

Request ID: {{request_id}}
Date: {{request_date}}

Customer Information:
Company: {{company_name}}
Contact: {{contact_name}}
Email: {{contact_email}}
Phone: {{contact_phone}}

Requirements:
{{requirements_description}}

Budget Range: {{budget_min}} - {{budget_max}}
Timeline: {{timeline}}

Additional Notes:
{{additional_notes}}

We will review your request and provide a detailed quote within 3 business days.

Thank you for considering our services.`,
    version: '1.2.0',
    position: 10,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Amanda Lopez',
    locale: 'EN',
    templateKey: 'quote_request',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_11,
    name: 'Feedback Survey Template',
    type: MKT_TEMPLATE_TYPE.SURVEY,
    content: `CUSTOMER FEEDBACK SURVEY

Dear {{customer_name}},

We value your feedback! Please take a moment to share your experience with our {{product_service}}.

Survey Link: {{survey_link}}

Your feedback helps us improve our services and better serve our customers.

As a thank you, you'll receive {{incentive}} for completing this survey.

Survey closes on: {{survey_deadline}}

Thank you for your time!

{{company_name}} Customer Success Team`,
    version: '1.1.0',
    position: 11,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Kevin Anderson',
    locale: 'EN',
    templateKey: 'feedback_survey',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_12,
    name: 'Renewal Reminder Template',
    type: MKT_TEMPLATE_TYPE.EMAIL,
    content: `Renewal Reminder

Dear {{customer_name}},

Your {{service_name}} subscription will expire on {{expiry_date}}.

To ensure uninterrupted service, please renew your subscription before the expiration date.

Current Plan: {{current_plan}}
Renewal Amount: {{renewal_amount}}

Renew Now: {{renewal_link}}

If you have any questions about your subscription, please contact our support team.

Thank you for your continued business!

{{company_name}} Billing Team`,
    version: '1.3.0',
    position: 12,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Michelle Garcia',
    locale: 'EN',
    templateKey: 'renewal_reminder',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_13,
    name: 'Onboarding Checklist Template',
    type: MKT_TEMPLATE_TYPE.CHECKLIST,
    content: `ONBOARDING CHECKLIST

Customer: {{customer_name}}
Onboarding Date: {{onboarding_date}}

□ Account Setup
  □ User accounts created
  □ Access permissions configured
  □ Initial login completed

□ Training
  □ Product overview session
  □ Feature walkthrough
  □ Best practices shared

□ Configuration
  □ System configured
  □ Data imported
  □ Integrations set up

□ Documentation
  □ User guides provided
  □ Support contacts shared
  □ FAQ access granted

□ Follow-up
  □ 30-day check-in scheduled
  □ Success metrics defined
  □ Support plan established

Onboarding Manager: {{onboarding_manager}}`,
    version: '1.0.0',
    position: 13,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Daniel Thompson',
    locale: 'EN',
    templateKey: 'onboarding_checklist',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_14,
    name: 'Incident Report Template',
    type: MKT_TEMPLATE_TYPE.REPORT,
    content: `INCIDENT REPORT

Incident ID: {{incident_id}}
Report Date: {{report_date}}
Severity: {{severity}}

Incident Summary:
{{incident_summary}}

Affected Systems:
{{affected_systems}}

Impact Assessment:
{{impact_assessment}}

Root Cause:
{{root_cause}}

Resolution:
{{resolution}}

Prevention Measures:
{{prevention_measures}}

Reported by: {{reported_by}}
Resolved by: {{resolved_by}}
Resolution time: {{resolution_time}}`,
    version: '1.1.0',
    position: 14,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Rachel White',
    locale: 'EN',
    templateKey: 'incident_report',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_15,
    name: 'Monthly Report Template',
    type: MKT_TEMPLATE_TYPE.REPORT,
    content: `MONTHLY REPORT

Period: {{report_period}}
Generated: {{generation_date}}

EXECUTIVE SUMMARY
{{executive_summary}}

KEY METRICS
- Revenue: {{revenue}}
- New Customers: {{new_customers}}
- Churn Rate: {{churn_rate}}%
- Customer Satisfaction: {{satisfaction_score}}

HIGHLIGHTS
{{highlights}}

CHALLENGES
{{challenges}}

NEXT MONTH PRIORITIES
{{next_month_priorities}}

Prepared by: {{prepared_by}}
Reviewed by: {{reviewed_by}}`,
    version: '2.0.0',
    position: 15,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Thomas Lee',
    locale: 'EN',
    templateKey: 'monthly_report',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.ID_16,
    name: 'Payment Receipt Template',
    type: MKT_TEMPLATE_TYPE.PAYMENT,
    content: `PAYMENT RECEIPT

Receipt Number: {{receipt_number}}
Date: {{payment_date}}

Received From:
Name: {{customer_name}}
Email: {{customer_email}}

Payment Details:
Amount Paid: {{amount_paid}}
Payment Method: {{payment_method}}
Duration: {{payment_duration}} seconds
Transaction ID: {{transaction_id}}

Description:
{{payment_description}}

Thank you for your payment!

{{company_name}} Billing Department`,
    version: '1.0.0',
    position: 16,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Olivia Harris',
    locale: 'EN',
    templateKey: 'payment_receipt',
  },
  {
    id: MKT_TEMPLATE_DATA_SEEDS_IDS.SEPAY_QR_ID,
    name: 'SEPay QR Code Payment Page',
    type: MKT_TEMPLATE_TYPE.PAYMENT,
    content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thanh toán SEPay QR</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .payment-container { 
            background: white; 
            max-width: 500px; 
            width: 100%;
            border-radius: 20px; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            overflow: hidden;
            animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header { 
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .content { padding: 40px 30px; }
        .status-badge {
            background: #e8f5e8;
            color: #28a745;
            padding: 12px 20px;
            border-radius: 25px;
            text-align: center;
            margin-bottom: 30px;
            font-weight: 600;
            border: 2px solid #d4edda;
        }
        .payment-info {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
            border-left: 4px solid #28a745;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #6c757d; font-weight: 500; }
        .info-value { font-weight: 600; color: #333; }
        .amount { font-size: 24px; color: #28a745; font-weight: 700; }
        .qr-section { 
            text-align: center; 
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            border: 2px dashed #28a745;
        }
        .qr-code { 
            max-width: 250px; 
            width: 100%;
            height: auto; 
            margin: 20px 0; 
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .qr-title { 
            color: #28a745; 
            font-size: 20px; 
            font-weight: 600; 
            margin-bottom: 10px;
        }
        .instructions {
            background: #e8f5e8;
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
        }
        .instructions h4 {
            color: #28a745;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .instructions ol {
            color: #333;
            padding-left: 20px;
        }
        .instructions li {
            margin-bottom: 8px;
            line-height: 1.5;
        }
        .timer {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
            border: 1px solid #ffeaa7;
            font-weight: 600;
        }
        .footer {
            background: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .support-link {
            color: #28a745;
            text-decoration: none;
            font-weight: 600;
        }
        .support-link:hover {
            text-decoration: underline;
        }
        @media (max-width: 768px) {
            .payment-container { margin: 10px; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .qr-code { max-width: 200px; }
        }
    </style>
</head>
<body>
    <div class="payment-container">
        <div class="header">
            <h1>🏦 Thanh toán SEPay QR</h1>
            <p>Quét mã QR để hoàn tất thanh toán</p>
        </div>
        
        <div class="content">
            <div class="status-badge">
                ✅ Đã tạo mã QR thanh toán
            </div>
            
            <div class="payment-info">
                <div class="info-row">
                    <span class="info-label">Khách hàng:</span>
                    <span class="info-value">{{customer_name}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Mã đơn hàng:</span>
                    <span class="info-value">{{order_code}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Số tiền:</span>
                    <span class="info-value amount">{{amount}} {{currency}}</span>
                </div>
            </div>
            
            <div class="qr-section">
                <div class="qr-title">📱 Quét mã QR để thanh toán</div>
                <img src="{{qr_code_url}}" alt="SEPay QR Code" class="qr-code" />
                <div class="timer">
                    ⏰ Mã QR có hiệu lực trước {{expired_at}}
                </div>
            </div>
            
            <div class="instructions">
                <h4>🚀 Hướng dẫn thanh toán:</h4>
                <ol>
                    <li>Mở ứng dụng ngân hàng hoặc ví điện tử</li>
                    <li>Chọn tính năng "Quét mã QR" hoặc "Thanh toán QR"</li>
                    <li>Quét mã QR phía trên bằng camera điện thoại</li>
                    <li>Kiểm tra thông tin và xác nhận thanh toán</li>
                    <li>Hoàn tất giao dịch</li>
                </ol>
            </div>
        </div>
        
        <div class="footer">
            <p>� Giao dịch được bảo mật bởi SEPay</p>
            <p>Cần hỗ trợ? <a href="#" class="support-link">Liên hệ với chúng tôi</a></p>
        </div>
    </div>
</body>
</html>`,
    version: '2.0.0',
    position: 17,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Ethan Clark',
    locale: 'VI',
    templateKey: 'sepay_qr_code',
  },
];

export const MKT_TEMPLATE_EXAMPLES = EXAMPLES.map((example) => ({
  ...example,
}));
