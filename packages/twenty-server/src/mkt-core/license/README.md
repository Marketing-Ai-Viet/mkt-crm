# License Generation Job

## Tổng quan

Hệ thống này tự động tạo license khi order được thanh toán (status = paid). Quá trình này sử dụng message queue để xử lý bất đồng bộ.

## Cách hoạt động

### 1. Trigger Job
Khi order status được cập nhật thành `paid`, hook `MktOrderUpdateOnePreQueryHook` sẽ được trigger và tạo job `LicenseGenerationJob`.

### 2. Job Processing
Job sẽ:
- Gọi API bên ngoài để lấy license key
- Tạo license mới trong database
- Liên kết license với order

## Cấu trúc Files

```
src/mkt-core/license/
├── mkt-license-api.service.ts      # Service gọi API license
├── jobs/
│   └── license-generation.job.ts   # Job xử lý tạo license
├── hooks/
│   └── mkt-order-update-one.pre-query.hook.ts  # Hook theo dõi order update
└── mkt-license.module.ts           # Module đăng ký services
```

## Cấu hình

### Environment Variables
```bash
LICENSE_API_URL=https://api.license-provider.com/licenses
```

### API Response Format
API phải trả về format:
```json
{
  "licenseKey": "LIC-XXXX-1234567890",
  "status": "active",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

## Sử dụng

### 1. Cập nhật Order Status
```graphql
mutation UpdateOrder {
  updateOneMktOrder(
    id: "order-id"
    data: {
      status: PAID
    }
  ) {
    id
    status
  }
}
```

### 2. Job sẽ tự động:
- Gọi API để lấy license
- Tạo license record
- Cập nhật licenseKey

## Monitoring

Job logs có thể được theo dõi trong:
- Application logs
- Message queue dashboard
- Database license table

## Error Handling

- Nếu API call thất bại, job sẽ retry theo cấu hình queue
- Nếu order không tồn tại, job sẽ log error và skip
- Nếu license đã tồn tại, job sẽ skip để tránh duplicate

## Customization

### Thay đổi API Endpoint
Cập nhật `LICENSE_API_URL` environment variable

### Thay đổi Queue
Cập nhật `MessageQueue.billingQueue` trong job

### Thêm Fields
Cập nhật `LicenseApiResponse` interface và job logic
