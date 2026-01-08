# Quy Trình Tạo Đơn Hàng

> Tài liệu hướng dẫn quy trình tạo và xử lý đơn hàng dành cho các phòng ban.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Các Loại Đơn Hàng](#2-các-loại-đơn-hàng)
3. [Trạng Thái Đơn Hàng](#3-trạng-thái-đơn-hàng)
4. [Quy Trình Chi Tiết](#4-quy-trình-chi-tiết)
5. [Luồng Dùng Thử (Trial)](#5-luồng-dùng-thử-trial)
6. [Thanh Toán Tự Động SEPay](#6-thanh-toán-tự-động-sepay)
7. [Hướng Dẫn Theo Phòng Ban](#7-hướng-dẫn-theo-phòng-ban)
8. [Câu Hỏi Thường Gặp](#8-câu-hỏi-thường-gặp)

---

## 1. Tổng Quan

### Đơn hàng là gì?

Đơn hàng (Order) là bản ghi về việc khách hàng mua sản phẩm/dịch vụ. Mỗi đơn hàng bao gồm:

| Thông tin | Mô tả |
|-----------|-------|
| **Mã đơn hàng** | Mã định danh duy nhất (VD: `MKT20250108001`) |
| **Khách hàng** | Thông tin người mua |
| **Sản phẩm** | Danh sách sản phẩm/gói mua |
| **Tổng tiền** | Số tiền cần thanh toán |
| **Trạng thái** | Trạng thái hiện tại của đơn |
| **Thanh toán** | Thông tin QR code, phương thức thanh toán |

### Sơ đồ quy trình tổng quan

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Tạo đơn   │───▶│  Chờ thanh  │───▶│  Kế toán    │───▶│  Hoàn thành │
│   hàng      │    │  toán       │    │  xác nhận   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     DRAFT         PENDING_PAYMENT      CONFIRMED          COMPLETED
```

---

## 2. Các Loại Đơn Hàng

### 2.1. Đơn hàng thường (NEW_ORDER)

Đây là loại đơn hàng phổ biến nhất khi khách hàng mua sản phẩm mới.

**Quy trình:**
1. Sales tạo đơn hàng
2. Hệ thống tạo mã QR thanh toán
3. Khách hàng thanh toán
4. Kế toán xác nhận
5. License được tạo tự động
6. Đơn hàng hoàn thành

### 2.2. Đơn hàng nháp (Draft Order)

Đơn hàng nháp cho phép Sales tạo và chỉnh sửa đơn hàng **trước khi** gửi cho khách hàng.

**Đặc điểm:**
- ✅ Tính toán đầy đủ giá trị đơn hàng
- ✅ Có thể chỉnh sửa sản phẩm, số lượng
- ❌ Chưa tạo mã QR thanh toán
- ❌ Chưa tạo license
- ❌ Khách hàng chưa nhìn thấy

**Khi nào dùng đơn nháp?**
- Cần xem trước tổng tiền trước khi gửi báo giá
- Cần trao đổi nội bộ về đơn hàng
- Cần approval từ quản lý trước khi gửi khách

**Sau khi hoàn tất, Sales "Xuất bản" đơn nháp để:**
- Chuyển sang trạng thái Chờ thanh toán
- Tạo mã QR thanh toán
- Gửi thông tin cho khách hàng

### 2.3. Đơn gia hạn (LICENSE_RENEWING)

Khi license của khách hàng sắp hết hạn.

**Quy trình:**
1. Hệ thống phát hiện license sắp hết hạn
2. Sales tạo đơn gia hạn (liên kết với license cũ)
3. Khách thanh toán
4. License được gia hạn thêm thời gian

### 2.4. Đơn chuyển đổi Trial (TRIAL_TO_PAID)

Khi khách hàng đang dùng thử muốn mua bản chính thức.

**Quy trình:**
1. Khách đang có license trial
2. Sales tạo đơn chuyển đổi
3. License trial tạm được tạo ngay
4. Sau khi thanh toán, trial → license chính thức

---

## 3. Trạng Thái Đơn Hàng

### Bảng trạng thái

| Trạng thái | Màu | Ý nghĩa | Hành động tiếp theo |
|------------|-----|---------|---------------------|
| **DRAFT** | Xám | Đơn nháp, đang soạn | Chỉnh sửa hoặc Xuất bản |
| **PENDING_PAYMENT** | Cam | Chờ khách thanh toán | Chờ thanh toán |
| **CONFIRMED** | Xanh dương | Kế toán đã xác nhận | Chờ tạo license |
| **COMPLETED** | Xanh lá | Hoàn thành | Không cần hành động |
| **TRIAL** | Vàng | Đơn dùng thử | Chờ chuyển đổi hoặc hết hạn |
| **TRIAL_EXPIRED** | Đỏ | Trial đã hết hạn | Liên hệ khách hàng |
| **CANCELED** | Xám | Đã hủy | Không cần hành động |
| **OVERDUE** | Đỏ | Quá hạn thanh toán | Liên hệ khách hoặc hủy |
| **REFUND** | Cyan | Đã hoàn tiền | Không cần hành động |

### Sơ đồ chuyển trạng thái

```
                                    ┌─────────────────┐
                                    │    CANCELED     │
                                    └────────▲────────┘
                                             │ Hủy
┌────────┐      Xuất bản      ┌──────────────┴───────────────┐
│ DRAFT  │───────────────────▶│      PENDING_PAYMENT         │
└────────┘                    └──────────────┬───────────────┘
    │                                        │
    │ Hủy                          Thanh toán │
    ▼                                        ▼
┌────────┐                    ┌──────────────────────────────┐
│CANCELED│                    │         CONFIRMED            │
└────────┘                    └──────────────┬───────────────┘
                                             │
                               Tạo license   │
                                             ▼
                              ┌──────────────────────────────┐
                              │         COMPLETED            │
                              └──────────────────────────────┘
                                             │
                                   Hoàn tiền │
                                             ▼
                              ┌──────────────────────────────┐
                              │          REFUND              │
                              └──────────────────────────────┘
```

---

## 4. Quy Trình Chi Tiết

### 4.1. Tạo đơn hàng thường

```
Bước 1: Chọn khách hàng
         │
         ▼
Bước 2: Chọn sản phẩm/gói
         │
         ▼
Bước 3: Chọn phương thức thanh toán
         │
         ▼
Bước 4: Xác nhận tạo đơn
         │
         ▼
    ┌────┴────┐
    │ Hệ thống│
    └────┬────┘
         │
    ┌────▼────────────────────────────────────┐
    │ • Tạo mã đơn hàng (MKT20250108001)     │
    │ • Tính tổng tiền                        │
    │ • Tạo mã QR thanh toán                  │
    │ • Gửi email/SMS cho khách               │
    │ • Đặt lịch nhắc thanh toán (24h)        │
    └────┬────────────────────────────────────┘
         │
         ▼
    Trạng thái: PENDING_PAYMENT
```

### 4.2. Tạo đơn hàng nháp (Draft)

```
Bước 1: Chọn khách hàng
         │
         ▼
Bước 2: Chọn sản phẩm/gói
         │
         ▼
Bước 3: Đánh dấu "Tạo nháp" ✓
         │
         ▼
Bước 4: Xác nhận tạo đơn
         │
         ▼
    ┌────┴────┐
    │ Hệ thống│
    └────┬────┘
         │
    ┌────▼────────────────────────────────────┐
    │ • Tạo mã đơn hàng                       │
    │ • Tính tổng tiền                        │
    │ • ❌ KHÔNG tạo QR thanh toán            │
    │ • ❌ KHÔNG gửi email cho khách          │
    │ • ❌ KHÔNG đặt lịch nhắc                │
    └────┬────────────────────────────────────┘
         │
         ▼
    Trạng thái: DRAFT
         │
         │ Chỉnh sửa nếu cần...
         │
         ▼
    "Xuất bản đơn hàng"
         │
         ▼
    ┌────┴────┐
    │ Hệ thống│
    └────┬────┘
         │
    ┌────▼────────────────────────────────────┐
    │ • Tạo mã QR thanh toán                  │
    │ • Gửi email/SMS cho khách               │
    │ • Đặt lịch nhắc thanh toán (24h)        │
    └────┬────────────────────────────────────┘
         │
         ▼
    Trạng thái: PENDING_PAYMENT
```

### 4.3. Xác nhận thanh toán

```
    Khách thanh toán qua QR
              │
              ▼
    Webhook từ SEPay/BIDV
              │
              ▼
    ┌─────────┴─────────┐
    │ Hệ thống tự động  │
    │ hoặc Kế toán      │
    │ xác nhận thủ công │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────────────────────────────┐
    │ Hành động:                                │
    │ • Cập nhật trạng thái → CONFIRMED        │
    │ • Tạo license trên MKT Server            │
    │ • Gửi email license key cho khách        │
    │ • Cập nhật trạng thái → COMPLETED        │
    │ • Tạo hóa đơn (nếu cần)                  │
    └───────────────────────────────────────────┘
```

---

## 5. Luồng Dùng Thử (Trial)

### 5.1. Tổng quan về Trial License

Trial license cho phép khách hàng dùng thử sản phẩm **miễn phí** trong một khoảng thời gian giới hạn trước khi quyết định mua.

**Đặc điểm quan trọng:**
- ⚠️ **Trial KHÔNG tạo qua đơn hàng** - Khác với các loại order khác
- Trial license được tạo trực tiếp qua chức năng riêng
- Thời gian dùng thử: **7-14 ngày** (tùy cấu hình)
- Sau khi hết hạn: License tự động chuyển sang `TRIAL_EXPIRED`

### 5.2. Quy trình tạo Trial License

```
Bước 1: Xác định khách hàng cần trial
         │
         ▼
Bước 2: Chọn sản phẩm/gói cho trial
         │
         ▼
Bước 3: Sử dụng chức năng "Tạo Trial License"
         │
         ▼
    ┌────┴────┐
    │ Hệ thống│
    └────┬────┘
         │
    ┌────▼────────────────────────────────────┐
    │ • Tạo license với status = TRIAL        │
    │ • Gán thời hạn dùng thử (7-14 ngày)     │
    │ • Đồng bộ license lên MKT Server        │
    │ • Gửi thông tin license cho khách       │
    │ • ❌ KHÔNG tạo đơn hàng                 │
    │ • ❌ KHÔNG tạo QR thanh toán            │
    └────┬────────────────────────────────────┘
         │
         ▼
    License status: TRIAL
```

### 5.3. Vòng đời Trial License

```
┌───────────┐                              ┌───────────────┐
│   TRIAL   │───── Hết hạn tự động ───────▶│ TRIAL_EXPIRED │
│ (Active)  │                              │               │
└─────┬─────┘                              └───────────────┘
      │
      │ Khách muốn mua
      │ chính thức
      ▼
┌─────────────────────────────────────────┐
│  Tạo đơn hàng TRIAL_TO_PAID             │
│  • Liên kết với trial license cũ        │
│  • Tạo QR thanh toán                    │
└─────────────────┬───────────────────────┘
                  │
                  │ Khách thanh toán
                  ▼
┌─────────────────────────────────────────┐
│  Kế toán xác nhận / SEPay tự động       │
│  • Trial license → ACTIVE               │
│  • Cập nhật thời hạn chính thức         │
│  • Order → COMPLETED                    │
└─────────────────────────────────────────┘
```

### 5.4. Xử lý các tình huống Trial

| Tình huống | Hệ thống xử lý |
|------------|----------------|
| Trial đang dùng → Khách muốn mua | Tạo đơn `TRIAL_TO_PAID`, sau thanh toán license TRIAL → ACTIVE |
| Trial hết hạn → Khách muốn mua | Tạo đơn `NEW_ORDER` mới, tạo license mới |
| Trial đang dùng → Không muốn tiếp tục | Để tự động hết hạn, không cần hành động |
| Trial hết hạn | License tự động = `TRIAL_EXPIRED`, không truy cập được |

### 5.5. Lưu ý quan trọng về Trial

**Cho Sales:**
- Trial license **không cần thanh toán** → không tạo đơn hàng
- Theo dõi trial sắp hết hạn để liên hệ khách mua chính thức
- Khi khách muốn mua, dùng action `TRIAL_TO_PAID` để liên kết với license cũ

**Cho Customer Support:**
- Trial hết hạn là **bình thường**, không phải lỗi hệ thống
- Nếu khách hỏi "license hết hạn" → kiểm tra có phải trial không
- Hướng dẫn khách liên hệ Sales để mua bản chính thức

---

## 6. Thanh Toán Tự Động SEPay

### 6.1. Tổng quan

Hệ thống tích hợp **SEPay** để tự động xác nhận thanh toán, **không cần Kế toán xác nhận thủ công**.

**Ưu điểm:**
- ⚡ Xử lý tức thì (real-time)
- 🤖 Hoàn toàn tự động
- ✅ License được cấp ngay sau khi thanh toán
- 📉 Giảm tải cho Phòng Kế toán

### 6.2. Luồng thanh toán tự động

```
┌─────────────────────────────────────────────────────────────────┐
│                    KHÁCH HÀNG                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ 1. Quét mã QR thanh toán
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ỨNG DỤNG NGÂN HÀNG                             │
│            (MB Bank, Vietcombank, BIDV, ...)                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ 2. Chuyển khoản thành công
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SEPAY                                     │
│  • Nhận thông báo giao dịch từ ngân hàng                       │
│  • Parse nội dung chuyển khoản (MKT20250108001)                │
│  • Gửi webhook đến hệ thống CRM                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ 3. Webhook notification
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HỆ THỐNG CRM                                 │
│                                                                 │
│  Xử lý tự động:                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Nhận webhook từ SEPay                                │   │
│  │ 2. Tìm đơn hàng theo mã trong nội dung CK               │   │
│  │ 3. Kiểm tra số tiền khớp với đơn hàng                   │   │
│  │ 4. Cập nhật Payment status = CONFIRMED                  │   │
│  │ 5. Cập nhật Order status = CONFIRMED                    │   │
│  │ 6. Tạo license trên MKT Server                          │   │
│  │ 7. Gửi email license cho khách                          │   │
│  │ 8. Cập nhật Order status = COMPLETED                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⏱️ Thời gian xử lý: < 30 giây                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ 4. Email thông báo
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    KHÁCH HÀNG                                   │
│           Nhận email license key ngay lập tức                   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3. Điều kiện để thanh toán tự động hoạt động

| Điều kiện | Mô tả | Ví dụ |
|-----------|-------|-------|
| **Nội dung CK đúng** | Phải chứa mã đơn hàng | `MKT20250108001` |
| **Số tiền khớp** | Số tiền CK = Tổng tiền đơn | 1,500,000 VND |
| **Đơn hàng hợp lệ** | Đơn ở trạng thái `PENDING_PAYMENT` | Không phải DRAFT, CANCELED |
| **Chưa thanh toán** | Đơn chưa được xác nhận trước đó | Payment status != CONFIRMED |

### 6.4. Khi nào cần Kế toán xác nhận thủ công?

Mặc dù SEPay tự động hóa phần lớn, vẫn có trường hợp cần xác nhận thủ công:

| Tình huống | Lý do | Xử lý |
|------------|-------|-------|
| **Nội dung CK sai** | Khách ghi sai mã đơn | Kế toán tìm đơn đúng và xác nhận |
| **Số tiền không khớp** | CK thiếu/thừa so với đơn | Kế toán xác nhận hoặc liên hệ khách |
| **Webhook thất bại** | Lỗi kết nối, timeout | Kế toán xác nhận thủ công |
| **Thanh toán nhiều lần** | Khách CK làm nhiều lần | Kế toán đối soát và xử lý |
| **Chuyển khoản ngoài SEPay** | CK trực tiếp vào tài khoản | Kế toán xác nhận thủ công |

### 6.5. Quy trình xác nhận thủ công (khi cần)

```
    Kế toán phát hiện giao dịch
    chưa được tự động xác nhận
              │
              ▼
    ┌─────────────────────────┐
    │ Kiểm tra sao kê ngân    │
    │ hàng để xác nhận        │
    │ giao dịch thực          │
    └───────────┬─────────────┘
                │
                ▼
    ┌─────────────────────────┐
    │ Tìm đơn hàng tương ứng  │
    │ (theo mã hoặc số tiền)  │
    └───────────┬─────────────┘
                │
                ▼
    ┌─────────────────────────┐
    │ Xác nhận thanh toán     │
    │ action: CONFIRM_ORDER   │
    └───────────┬─────────────┘
                │
                ▼
    Hệ thống tự động tạo license
    và cập nhật trạng thái
```

### 6.6. So sánh 2 luồng thanh toán

| Tiêu chí | SEPay Tự động | Kế toán Thủ công |
|----------|---------------|------------------|
| **Thời gian xử lý** | < 30 giây | 1-24 giờ (tùy ca làm việc) |
| **Cần nhân sự** | Không | Có |
| **Độ chính xác** | Cao (số tiền khớp chính xác) | Phụ thuộc người xác nhận |
| **Hoạt động 24/7** | Có | Không (giờ hành chính) |
| **Xử lý lỗi** | Cần Kế toán can thiệp | Kế toán xử lý |
| **Tỷ lệ áp dụng** | ~95% giao dịch | ~5% giao dịch |

### 6.7. Theo dõi và giám sát

**Dashboard Kế toán hiển thị:**
- Số giao dịch tự động thành công hôm nay
- Số giao dịch cần xác nhận thủ công
- Danh sách giao dịch webhook thất bại
- Tổng doanh thu đã xác nhận

**Cảnh báo tự động:**
- Webhook SEPay thất bại liên tục
- Có nhiều giao dịch chờ xác nhận
- Giao dịch có số tiền bất thường

---

## 7. Hướng Dẫn Theo Phòng Ban

### 7.1. Phòng Kinh Doanh (Sales)

**Nhiệm vụ chính:**
- Tạo đơn hàng cho khách hàng
- Theo dõi trạng thái đơn hàng
- Liên hệ khách khi đơn quá hạn

**Khi nào dùng đơn nháp?**

| Tình huống | Nên dùng Draft? |
|------------|-----------------|
| Khách yêu cầu báo giá | ✅ Có |
| Cần xin approval từ quản lý | ✅ Có |
| Khách đã xác nhận mua | ❌ Không |
| Khách thanh toán ngay | ❌ Không |

**Lưu ý quan trọng:**
- Đơn nháp sẽ **không** gửi thông tin cho khách
- Nhớ "Xuất bản" đơn sau khi hoàn tất chỉnh sửa
- Theo dõi đơn OVERDUE để liên hệ khách kịp thời

### 7.2. Phòng Kế Toán

**Nhiệm vụ chính:**
- Xác nhận thanh toán (nếu webhook thất bại)
- Xử lý hoàn tiền khi có yêu cầu
- Đối soát doanh thu

**Quy trình xác nhận thanh toán thủ công:**
1. Kiểm tra giao dịch ngân hàng
2. Tìm đơn hàng theo mã (VD: `MKT20250108001`)
3. Xác nhận số tiền khớp
4. Nhấn "Xác nhận thanh toán"

**Quy trình hoàn tiền:**
1. Nhận yêu cầu hoàn tiền từ Sales
2. Kiểm tra đơn hàng đủ điều kiện
3. Thực hiện hoàn tiền qua ngân hàng
4. Cập nhật trạng thái đơn → REFUND

### 7.3. Phòng Hỗ Trợ Khách Hàng (Customer Support)

**Nhiệm vụ chính:**
- Hỗ trợ khách hàng về thanh toán
- Xử lý các vấn đề về license

**Câu hỏi thường gặp từ khách:**

| Câu hỏi | Giải đáp |
|---------|----------|
| "Tôi thanh toán rồi sao chưa có license?" | Kiểm tra trạng thái đơn. Nếu vẫn PENDING_PAYMENT → liên hệ Kế toán xác nhận |
| "Mã QR không hoạt động" | Kiểm tra đơn có bị OVERDUE không. Nếu có → tạo đơn mới |
| "Tôi muốn hủy đơn hàng" | Nếu chưa thanh toán → hủy được. Nếu đã thanh toán → chuyển yêu cầu hoàn tiền |

---

## 8. Câu Hỏi Thường Gặp

### Q1: Đơn nháp có thể chỉnh sửa được không?

**A:** Có, đơn ở trạng thái DRAFT có thể chỉnh sửa:
- Thay đổi sản phẩm
- Thay đổi số lượng
- Thêm/xóa sản phẩm

Sau khi "Xuất bản" (PENDING_PAYMENT) thì không thể chỉnh sửa.

### Q2: Đơn hàng quá hạn (OVERDUE) thì sao?

**A:** Sau 24 giờ không thanh toán:
- Hệ thống tự động chuyển → OVERDUE
- Mã QR cũ không còn hiệu lực
- Sales cần liên hệ khách và tạo đơn mới nếu khách vẫn muốn mua

### Q3: License được tạo khi nào?

**A:** Tùy loại đơn hàng:

| Loại đơn | Thời điểm tạo license |
|----------|----------------------|
| NEW_ORDER | Sau khi Kế toán xác nhận thanh toán |
| TRIAL_TO_PAID | Trial tạo ngay, chính thức sau xác nhận |
| LICENSE_RENEWING | Gia hạn sau xác nhận thanh toán |

### Q4: Combo và sản phẩm lẻ khác nhau thế nào?

**A:**
- **Sản phẩm lẻ:** Mua từng sản phẩm riêng, giá gốc
- **Combo:** Mua nhiều sản phẩm kết hợp, có thể có giá ưu đãi

Xem thêm: [Hướng dẫn Combo và Khuyến mãi](./HUONG_DAN_COMBO_VA_KHUYEN_MAI.md)

### Q5: Ai có thể xác nhận thanh toán?

**A:**
- **Tự động:** Hệ thống qua webhook SEPay/BIDV
- **Thủ công:** Chỉ Phòng Kế toán (role: Accounting)

### Q6: Trial license khác gì license thường?

**A:**

| Đặc điểm | Trial License | License Thường |
|----------|---------------|----------------|
| **Cách tạo** | Trực tiếp, không qua đơn hàng | Qua đơn hàng + thanh toán |
| **Thời hạn** | 7-14 ngày | Theo gói mua (tháng/năm) |
| **Thanh toán** | Không | Có |
| **Tính năng** | Đầy đủ (có thể giới hạn) | Đầy đủ |
| **Hết hạn** | TRIAL_EXPIRED | EXPIRED, cần gia hạn |

### Q7: Tại sao khách thanh toán rồi mà chưa nhận được license?

**A:** Có thể do một trong các nguyên nhân:

1. **Nội dung chuyển khoản sai** - Khách ghi sai mã đơn hàng
   - Xử lý: Kế toán xác nhận thủ công

2. **SEPay webhook chưa gửi** - Độ trễ từ ngân hàng
   - Xử lý: Chờ 5-10 phút, nếu chưa có → Kế toán xác nhận

3. **Đơn hàng đã quá hạn (OVERDUE)** - QR code hết hiệu lực
   - Xử lý: Tạo đơn mới, hoàn tiền đơn cũ nếu cần

4. **Số tiền không khớp** - Khách chuyển thiếu/thừa
   - Xử lý: Kế toán kiểm tra và xử lý

### Q8: SEPay tự động xác nhận dựa vào tiêu chí gì?

**A:** Hệ thống kiểm tra 4 điều kiện:

1. ✅ Nội dung chuyển khoản chứa mã đơn hàng (VD: `MKT20250108001`)
2. ✅ Số tiền khớp chính xác với tổng tiền đơn hàng
3. ✅ Đơn hàng đang ở trạng thái `PENDING_PAYMENT`
4. ✅ Đơn hàng chưa được xác nhận trước đó

Nếu **tất cả 4 điều kiện** đều đúng → Tự động xác nhận
Nếu **bất kỳ điều kiện nào sai** → Cần Kế toán xác nhận thủ công

### Q9: Khách đang dùng trial muốn mua chính thức thì làm sao?

**A:** Quy trình:

1. Sales tìm license trial hiện tại của khách
2. Tạo đơn hàng với action = `TRIAL_TO_PAID`
3. Liên kết đơn với license trial cũ
4. Khách thanh toán
5. Hệ thống tự động:
   - Chuyển trial → license chính thức
   - Cập nhật thời hạn sử dụng
   - Giữ nguyên license key (khách không cần cài lại)

### Q10: Trial hết hạn rồi, khách mới muốn mua thì sao?

**A:** Không thể dùng `TRIAL_TO_PAID` nữa vì trial đã expired.

Quy trình:
1. Sales tạo đơn hàng mới với action = `NEW_ORDER`
2. Khách thanh toán
3. Hệ thống tạo license **mới hoàn toàn**
4. Khách nhận license key mới

---

## Liên Hệ Hỗ Trợ

| Vấn đề | Liên hệ |
|--------|---------|
| Lỗi hệ thống | IT Support |
| Quy trình nghiệp vụ | Quản lý phòng ban |
| Thanh toán | Phòng Kế toán |
| License | Phòng Hỗ trợ khách hàng |

---

*Cập nhật lần cuối: 2026-01-08*
