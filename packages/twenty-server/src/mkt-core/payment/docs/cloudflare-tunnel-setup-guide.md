# Hướng dẫn Triển khai Cloudflare Tunnel

## Mục đích

Tài liệu này hướng dẫn cách sử dụng Cloudflare Tunnel để expose localhost ra internet, phục vụ việc test webhook trong quá trình phát triển.

**Use case chính:** Test webhook từ các dịch vụ bên thứ ba (SePay, Payment Gateway, CRM, v.v.) trong môi trường development.

---

## Tổng quan

### Cloudflare Tunnel là gì?

Cloudflare Tunnel (trước đây gọi là Argo Tunnel) là dịch vụ cho phép expose các ứng dụng chạy trên localhost ra internet thông qua một kết nối bảo mật đến Cloudflare edge network, mà không cần mở port hay cấu hình firewall.

### Ưu điểm

| Tính năng | Mô tả |
|-----------|-------|
| **Miễn phí** | Không mất phí cho việc test/development |
| **Bảo mật** | Kết nối được mã hóa end-to-end |
| **Đơn giản** | Chỉ cần 1 lệnh để chạy |
| **Không cần config network** | Không cần mở port, NAT, hay firewall |
| **HTTPS tự động** | URL public luôn có HTTPS |

### So sánh với các giải pháp khác

| Tiêu chí | Cloudflare Tunnel | ngrok (Free) | localtunnel |
|----------|-------------------|--------------|-------------|
| Giá | Miễn phí | Miễn phí (giới hạn) | Miễn phí |
| Số tunnel | Không giới hạn | 1 tunnel | Không giới hạn |
| URL cố định | Có (Named Tunnel) | Không | Không |
| Tốc độ | Nhanh | Trung bình | Chậm |
| Độ ổn định | Cao | Cao | Trung bình |

---

## Yêu cầu hệ thống

- Hệ điều hành: Linux (Ubuntu/Debian), macOS, hoặc Windows
- Quyền sudo (để cài đặt)
- Ứng dụng backend đang chạy trên localhost

---

## Cài đặt Cloudflared CLI

### Ubuntu/Debian

```bash
# Download package
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Cài đặt
sudo dpkg -i cloudflared.deb

# Xác nhận cài đặt thành công
cloudflared --version
```

### macOS

```bash
# Sử dụng Homebrew
brew install cloudflared

# Xác nhận cài đặt
cloudflared --version
```

### Windows

```powershell
# Sử dụng winget
winget install --id Cloudflare.cloudflared

# Hoặc download trực tiếp từ GitHub releases
# https://github.com/cloudflare/cloudflared/releases
```

---

## Phương pháp 1: Quick Tunnel (Khuyến nghị cho Development)

### Mô tả

Quick Tunnel là cách nhanh nhất để tạo tunnel mà không cần đăng nhập hay cấu hình. Phù hợp cho việc test nhanh trong quá trình development.

### Cách sử dụng

```bash
# Cú pháp cơ bản
cloudflared tunnel --url http://localhost:<PORT>

# Ví dụ: Backend NestJS chạy port 3000
cloudflared tunnel --url http://localhost:3000

# Ví dụ: Frontend Next.js chạy port 3001
cloudflared tunnel --url http://localhost:3001
```

### Kết quả mong đợi

```
2024-01-15T10:30:00Z INF Thank you for trying Cloudflare Tunnel!
2024-01-15T10:30:00Z INF Your quick Tunnel has been created!
2024-01-15T10:30:00Z INF +-----------------------------------------------------------+
2024-01-15T10:30:00Z INF |  Your free tunnel has been created! Visit it at:         |
2024-01-15T10:30:00Z INF |  https://example-words-here.trycloudflare.com             |
2024-01-15T10:30:00Z INF +-----------------------------------------------------------+
```

### Lưu ý quan trọng

- URL sẽ **thay đổi** mỗi lần restart tunnel
- Cần update webhook URL trong service bên thứ ba khi URL đổi
- Tunnel sẽ tự động đóng khi tắt terminal hoặc nhấn `Ctrl+C`

---

## Phương pháp 2: Named Tunnel (URL ổn định)

### Mô tả

Named Tunnel cho phép tạo tunnel với tên cố định, giúp quản lý và tái sử dụng dễ dàng hơn. Yêu cầu tài khoản Cloudflare (miễn phí).

### Bước 1: Đăng nhập Cloudflare

```bash
cloudflared tunnel login
```

Lệnh này sẽ mở trình duyệt để xác thực với tài khoản Cloudflare. Sau khi đăng nhập thành công, certificate sẽ được lưu tại `~/.cloudflared/cert.pem`.

### Bước 2: Tạo Tunnel

```bash
# Tạo tunnel với tên tùy chọn
cloudflared tunnel create <TUNNEL_NAME>

# Ví dụ
cloudflared tunnel create mkt-dev-webhook
```

**Output:**

```
Tunnel credentials written to /home/user/.cloudflared/<TUNNEL_ID>.json
Created tunnel mkt-dev-webhook with id <TUNNEL_ID>
```

### Bước 3: Tạo file cấu hình

Tạo file `~/.cloudflared/config.yml`:

```yaml
# Tunnel ID (lấy từ bước 2)
tunnel: <TUNNEL_ID>

# Đường dẫn đến credentials file
credentials-file: /home/<USER>/.cloudflared/<TUNNEL_ID>.json

# Cấu hình ingress rules
ingress:
  # Route cho backend API
  - hostname: mkt-api.example.com
    service: http://localhost:3000
  
  # Route cho frontend (nếu cần)
  - hostname: mkt-app.example.com
    service: http://localhost:3001
  
  # Catch-all rule (bắt buộc)
  - service: http_status:404
```

### Bước 4: Tạo DNS Record

```bash
# Tạo CNAME record trỏ đến tunnel
cloudflared tunnel route dns <TUNNEL_NAME> <HOSTNAME>

# Ví dụ
cloudflared tunnel route dns mkt-dev-webhook mkt-api.example.com
```

### Bước 5: Chạy Tunnel

```bash
# Chạy với config file
cloudflared tunnel run <TUNNEL_NAME>

# Hoặc chạy với URL trực tiếp
cloudflared tunnel --url http://localhost:3000 run <TUNNEL_NAME>
```

---

## Workflow Test Webhook

### Quy trình tổng quát

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Third-party    │────▶│   Cloudflare    │────▶│   Localhost     │
│  Service        │     │   Tunnel        │     │   Backend       │
│  (SePay, etc.)  │     │                 │     │   (NestJS)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Các bước thực hiện

**Bước 1:** Khởi động backend server

```bash
# NestJS
cd /path/to/backend
npm run start:dev
```

**Bước 2:** Khởi động Cloudflare Tunnel

```bash
# Terminal mới
cloudflared tunnel --url http://localhost:3000
```

**Bước 3:** Copy URL public từ output

```
https://random-example.trycloudflare.com
```

**Bước 4:** Cấu hình webhook URL trong service bên thứ ba

Ví dụ với SePay:
- Đăng nhập SePay Dashboard
- Vào mục Cài đặt → Webhook
- Nhập URL: `https://random-example.trycloudflare.com/api/webhooks/sepay`
- Lưu cấu hình

**Bước 5:** Thực hiện giao dịch test

- Tạo giao dịch test trong SePay
- Kiểm tra logs trong terminal NestJS
- Xác nhận webhook được nhận và xử lý đúng

---

## Ví dụ cụ thể: Test Webhook SePay

### Cấu trúc endpoint webhook (NestJS)

```
POST /api/webhooks/sepay
```

### Các bước chi tiết

```bash
# Terminal 1: Chạy NestJS
cd ~/projects/mkt-backend
npm run start:dev

# Terminal 2: Chạy Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```

### Cấu hình SePay

| Field | Value |
|-------|-------|
| Webhook URL | `https://<tunnel-url>/api/webhooks/sepay` |
| Method | POST |
| Content-Type | application/json |

### Kiểm tra kết quả

Khi có transaction mới, SePay sẽ gửi webhook với payload:

```json
{
  "id": 123456,
  "gateway": "SePay",
  "transactionDate": "2024-01-15 10:30:00",
  "accountNumber": "0123456789",
  "code": "TXN123456",
  "content": "Payment for order #123",
  "transferType": "in",
  "transferAmount": 500000,
  "accumulated": 1500000,
  "subAccount": null,
  "referenceCode": "REF123",
  "description": "Payment received"
}
```

---

## Xử lý sự cố

### Lỗi thường gặp

#### 1. Connection refused

**Triệu chứng:**
```
ERR error="connection refused" 
```

**Nguyên nhân:** Backend server chưa chạy hoặc sai port.

**Giải pháp:**
- Kiểm tra backend đã start chưa
- Xác nhận đúng port đang sử dụng
- Test local: `curl http://localhost:3000/health`

#### 2. Tunnel disconnected

**Triệu chứng:**
```
INF Tunnel disconnected
```

**Nguyên nhân:** Mất kết nối internet hoặc Cloudflare edge.

**Giải pháp:**
- Kiểm tra kết nối internet
- Restart tunnel
- Thử lại sau vài phút

#### 3. Certificate error (Named Tunnel)

**Triệu chứng:**
```
ERR error="certificate has expired"
```

**Giải pháp:**
```bash
# Xóa certificate cũ và đăng nhập lại
rm ~/.cloudflared/cert.pem
cloudflared tunnel login
```

### Debug mode

```bash
# Chạy tunnel với verbose logging
cloudflared tunnel --url http://localhost:3000 --loglevel debug
```

---

## Best Practices

### Development

1. **Sử dụng Quick Tunnel** cho test nhanh
2. **Đặt alias** trong shell config để tiện sử dụng:
   ```bash
   # Thêm vào ~/.bashrc hoặc ~/.zshrc
   alias tunnel-api='cloudflared tunnel --url http://localhost:3000'
   alias tunnel-web='cloudflared tunnel --url http://localhost:3001'
   ```

3. **Kiểm tra logs** trong terminal để debug webhook

### Security

1. **Không expose tunnel lên production** - Chỉ dùng cho development/testing
2. **Tắt tunnel** khi không sử dụng
3. **Sử dụng webhook secret** để xác thực request từ service bên thứ ba
4. **Validate payload** trước khi xử lý

### Performance

1. **Một tunnel per service** - Không nên route quá nhiều service qua một tunnel
2. **Monitor resource** - Cloudflared tiêu tốn ít tài nguyên nhưng nên theo dõi

---

## Tài liệu tham khảo

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflared GitHub Repository](https://github.com/cloudflare/cloudflared)
- [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)

---

## Changelog

| Phiên bản | Ngày | Mô tả |
|-----------|------|-------|
| 1.0.0 | 2025-01-21 | Phiên bản đầu tiên |

---

*Tài liệu được tạo cho dự án MKT Software Management*
