# Hướng dẫn Test SEPay Webhook với Cloudflare Tunnel

## Tóm tắt

Hướng dẫn đơn giản để test webhook SEPay trong môi trường development sử dụng **Cloudflare Quick Tunnel**.

**Chỉ cần 3 bước:**
1. Cài đặt `cloudflared`
2. Chạy tunnel với 1 lệnh
3. Cấu hình webhook URL trong SEPay

---

## 1. Cài đặt Cloudflared

### Ubuntu/Debian

```bash
# Download và cài đặt
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Kiểm tra
cloudflared --version
```

### macOS

```bash
brew install cloudflared
```

### Windows

```powershell
winget install --id Cloudflare.cloudflared
```

---

## 2. Chạy Quick Tunnel

### Bước 1: Khởi động Backend Server

```bash
# Terminal 1: Chạy Twenty Server
npx nx start twenty-server

# Hoặc với Docker
docker-compose up -d server
```

### Bước 2: Khởi động Cloudflare Tunnel

```bash
# Terminal 2: Chạy tunnel
cloudflared tunnel --url http://localhost:3000
```

### Bước 3: Copy URL Public

Khi tunnel khởi động, bạn sẽ thấy output như sau:

```
INF +-----------------------------------------------------------+
INF |  Your free tunnel has been created! Visit it at:         |
INF |  https://random-words-here.trycloudflare.com              |
INF +-----------------------------------------------------------+
```

**Copy URL này** (ví dụ: `https://random-words-here.trycloudflare.com`)

---

## 3. Cấu hình SEPay Webhook

### Đăng nhập SEPay Dashboard

- **Production**: https://my.sepay.vn
- **Sandbox**: https://my.dev.sepay.vn

### Cấu hình Webhook

Vào **Settings > Webhooks** và thêm:

| Field | Giá trị |
|-------|---------|
| URL | `https://random-words-here.trycloudflare.com/hooks/sepay-payment` |
| Method | POST |
| Content-Type | application/json |
| Authentication | API Key (nếu cần) |
| API Key Value | `Apikey your_api_key` |

---

## 4. Test Webhook

### Test thủ công với curl

```bash
# Lấy URL từ tunnel output
TUNNEL_URL="https://random-words-here.trycloudflare.com"

# Gửi test request
curl -X POST "$TUNNEL_URL/hooks/sepay-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "gateway": "Vietcombank",
    "transactionDate": "2024-01-15 10:30:00",
    "accountNumber": "0123456789",
    "code": "ORD-001",
    "content": "Thanh toan don hang ORD-001",
    "transferType": "in",
    "transferAmount": 500000,
    "accumulated": 1000000,
    "referenceCode": "VCB.123456",
    "description": "Test"
  }'
```

### Response mong đợi

```json
{
  "success": true,
  "message": "Thanh toán đã được xử lý thành công",
  "data": {
    "transactionId": "12345",
    "status": "MATCHED"
  }
}
```

---

## 5. Script Tiện ích

### Script khởi động nhanh

Tạo file `scripts/start-tunnel.sh`:

```bash
#!/bin/bash
# start-tunnel.sh - Khởi động Cloudflare Tunnel để test webhook

PORT="${1:-3000}"

echo "========================================"
echo "  Cloudflare Quick Tunnel              "
echo "========================================"
echo "Đang expose localhost:$PORT ra internet..."
echo ""

cloudflared tunnel --url "http://localhost:$PORT"
```

### Alias cho shell

Thêm vào `~/.bashrc` hoặc `~/.zshrc`:

```bash
# Alias để chạy tunnel nhanh
alias tunnel='cloudflared tunnel --url http://localhost:3000'
alias tunnel-api='cloudflared tunnel --url http://localhost:3000'
```

Sau đó chỉ cần gõ `tunnel` để khởi động.

---

## 6. Workflow hoàn chỉnh

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    SEPay        │────▶│   Cloudflare    │────▶│   Localhost     │
│    Server       │     │   Tunnel        │     │   :3000         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                    https://xxx.trycloudflare.com
```

### Các bước thực hiện

```bash
# 1. Terminal 1: Chạy backend
npx nx start twenty-server

# 2. Terminal 2: Chạy tunnel
cloudflared tunnel --url http://localhost:3000

# 3. Copy URL từ output tunnel
# Ví dụ: https://random-words.trycloudflare.com

# 4. Cấu hình URL trong SEPay Dashboard
# URL: https://random-words.trycloudflare.com/hooks/sepay-payment

# 5. Thực hiện giao dịch test trong SEPay

# 6. Kiểm tra logs trong Terminal 1
```

---

## 7. Lưu ý quan trọng

### URL thay đổi mỗi lần restart

⚠️ **Quick Tunnel sẽ tạo URL mới mỗi lần khởi động lại.**

Bạn cần cập nhật lại URL trong SEPay Dashboard khi:
- Restart tunnel
- Khởi động lại máy
- Terminal bị đóng

### Giữ tunnel chạy

- **Không đóng terminal** đang chạy tunnel
- Dùng `Ctrl+C` để dừng tunnel khi xong

### Chỉ dùng cho Development

❌ **KHÔNG** dùng Quick Tunnel cho production
✅ Chỉ dùng để test trong quá trình phát triển

---

## 8. Xử lý sự cố

### Lỗi: Connection refused

```bash
# Kiểm tra backend đã chạy chưa
curl http://localhost:3000/healthz

# Nếu lỗi, khởi động lại backend
npx nx start twenty-server
```

### Lỗi: Tunnel disconnected

```bash
# Khởi động lại tunnel
cloudflared tunnel --url http://localhost:3000
```

### Debug với verbose logging

```bash
cloudflared tunnel --url http://localhost:3000 --loglevel debug
```

---

## 9. Tham khảo nhanh

### Commands

| Mục đích | Lệnh |
|----------|------|
| Chạy tunnel port 3000 | `cloudflared tunnel --url http://localhost:3000` |
| Chạy tunnel port khác | `cloudflared tunnel --url http://localhost:<PORT>` |
| Debug mode | `cloudflared tunnel --url http://localhost:3000 --loglevel debug` |
| Kiểm tra version | `cloudflared --version` |

### URLs

| Môi trường | URL |
|------------|-----|
| SEPay Production | https://my.sepay.vn |
| SEPay Sandbox | https://my.dev.sepay.vn |
| Tunnel URL | `https://xxx.trycloudflare.com` (thay đổi mỗi lần) |

### Webhook Endpoint

```
POST /hooks/sepay-payment
```

---

## 10. Ví dụ SEPay Payload

```json
{
  "id": 92704,
  "gateway": "Vietcombank",
  "transactionDate": "2024-01-15 14:02:37",
  "accountNumber": "0123499999",
  "code": "ORDER123",
  "content": "Thanh toan don hang ORDER123",
  "transferType": "in",
  "transferAmount": 500000,
  "accumulated": 1500000,
  "subAccount": null,
  "referenceCode": "MBVCB.3278907687",
  "description": ""
}
```

---

**Tác giả**: Claude Code Assistant
**Cập nhật**: 21-01-2026
**Mục đích**: Test webhook trong môi trường development
