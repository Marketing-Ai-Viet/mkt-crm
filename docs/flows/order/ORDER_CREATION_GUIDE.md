# Quy trình Tạo Đơn hàng và Cấp License - Hướng dẫn Nghiệp vụ

## Giới thiệu

Tài liệu này mô tả quy trình tạo đơn hàng và cấp license cho khách hàng trong hệ thống CRM. Dành cho các phòng ban: Kinh doanh, Chăm sóc Khách hàng, Kế toán và Quản lý.

**Thuật ngữ quan trọng:**
- **Đơn hàng (Order):** Phiếu ghi nhận thông tin mua hàng của khách
- **License:** Giấy phép sử dụng phần mềm được cấp cho khách sau khi thanh toán
- **Trial:** Dùng thử miễn phí trong thời gian giới hạn

---

## 1. Tổng quan Quy trình

### 1.1 Luồng Chính

```
┌────────────────────────────────────────────────────────────────┐
│                    QUY TRÌNH TẠO ĐƠN HÀNG                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📝 Bước 1: Tạo đơn hàng                                       │
│     • Nhập thông tin khách hàng                               │
│     • Chọn sản phẩm/gói sản phẩm                              │
│     • Áp dụng khuyến mãi (nếu có)                             │
│                           ↓                                    │
│  💳 Bước 2: Chờ thanh toán                                     │
│     • Hệ thống tạo mã QR thanh toán                           │
│     • Gửi thông tin thanh toán cho khách                      │
│                           ↓                                    │
│  ✅ Bước 3: Xác nhận thanh toán                                │
│     • Kế toán xác nhận đã nhận tiền                           │
│     • Hệ thống tự động cấp license                            │
│                           ↓                                    │
│  🎉 Bước 4: Hoàn thành                                         │
│     • Khách nhận license                                       │
│     • Có thể sử dụng phần mềm                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Các Loại Đơn hàng

| Loại | Mô tả | License được cấp khi nào? |
|------|-------|---------------------------|
| **Đơn mới** | Khách mua lần đầu | Sau khi xác nhận thanh toán |
| **Dùng thử (Trial)** | Khách dùng thử miễn phí | Ngay lập tức khi tạo đơn |
| **Gia hạn** | Gia hạn license đang dùng | Sau khi xác nhận thanh toán |
| **Nâng cấp** | Đổi sang gói cao hơn | Sau khi xác nhận thanh toán |

---

## 2. Chi tiết Từng Bước

### 2.1 Bước 1: Tạo Đơn hàng

#### Ai thực hiện?
- Nhân viên Kinh doanh
- Nhân viên CSKH
- Khách hàng (nếu có portal tự phục vụ)

#### Thông tin cần nhập

| Thông tin | Bắt buộc | Ghi chú |
|-----------|----------|---------|
| Thông tin khách hàng | ✅ | Tên, email, số điện thoại |
| Sản phẩm/Gói sản phẩm | ✅ | Chọn từ danh sách |
| Số lượng license | ✅ | Mặc định: 1 |
| Thời hạn sử dụng | ✅ | 1 tháng / 3 tháng / 1 năm |
| Mã khuyến mãi | ❌ | Nếu có |
| Ghi chú | ❌ | Yêu cầu đặc biệt |

#### Quy trình tạo đơn

```
Nhân viên đăng nhập hệ thống
         ↓
Chọn "Tạo đơn hàng mới"
         ↓
Nhập/Chọn thông tin khách hàng
         ↓
Chọn sản phẩm và số lượng
         ↓
Hệ thống tự động tính giá
         ↓
Nhập mã khuyến mãi (nếu có)
         ↓
Xác nhận tạo đơn
         ↓
Hệ thống tạo mã QR thanh toán
         ↓
Gửi thông tin thanh toán cho khách
```

#### Kết quả sau khi tạo đơn

- **Mã đơn hàng:** ORD-XXXXXX (dùng để tra cứu)
- **Trạng thái:** "Chờ thanh toán"
- **Mã QR thanh toán:** Hiển thị trên màn hình và gửi email

---

### 2.2 Bước 2: Chờ Thanh toán

#### Trạng thái đơn hàng
Đơn hàng ở trạng thái **"Chờ thanh toán"** (Pending Payment)

#### Thời hạn thanh toán
- **Mặc định:** 24 giờ (có thể cấu hình)
- **Sau khi quá hạn:** Đơn tự động chuyển sang "Quá hạn"

#### Các phương thức thanh toán

| Phương thức | Mô tả | Xác nhận |
|-------------|-------|----------|
| Chuyển khoản ngân hàng | QR code hoặc số tài khoản | Kế toán xác nhận thủ công |
| SEPay | Cổng thanh toán tự động | Tự động (webhook) |
| BIDV | QR code BIDV | Tự động hoặc thủ công |

#### Thông tin gửi cho khách

```
Kính gửi Quý khách [Tên],

Cảm ơn Quý khách đã đặt hàng. Thông tin đơn hàng:

- Mã đơn: [Mã đơn]
- Sản phẩm: [Tên sản phẩm]
- Số lượng: [Số lượng] license
- Thời hạn: [Thời hạn]
- Tổng tiền: [Số tiền] VND

Vui lòng thanh toán trong vòng 24 giờ.

Thông tin chuyển khoản:
- Ngân hàng: [Tên ngân hàng]
- Số tài khoản: [Số TK]
- Nội dung: [Mã đơn]

Hoặc quét mã QR đính kèm.

Trân trọng,
[Công ty]
```

---

### 2.3 Bước 3: Xác nhận Thanh toán

#### Ai thực hiện?
- **Tự động:** Hệ thống nhận webhook từ cổng thanh toán
- **Thủ công:** Nhân viên Kế toán xác nhận

#### Quy trình xác nhận thủ công

```
Kế toán kiểm tra sao kê ngân hàng
         ↓
Tìm giao dịch khớp với mã đơn
         ↓
Kiểm tra số tiền đúng không
         ↓
Vào hệ thống CRM
         ↓
Tìm đơn hàng theo mã
         ↓
Chọn "Xác nhận thanh toán"
         ↓
Nhập ghi chú (số giao dịch ngân hàng)
         ↓
Xác nhận
```

#### Sau khi xác nhận thanh toán

| Hành động | Hệ thống tự động |
|-----------|------------------|
| Cập nhật trạng thái | "Chờ thanh toán" → "Đã xác nhận" |
| Cấp license | Tạo license mới trên MKT Server |
| Cập nhật tiếp | "Đã xác nhận" → "Hoàn thành" |
| Gửi thông báo | Email chứa thông tin license |

---

### 2.4 Bước 4: Cấp License và Hoàn thành

#### License được tạo như thế nào?

```
┌────────────────────────────────────────────────────────────────┐
│                    QUY TRÌNH CẤP LICENSE                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Kế toán xác nhận thanh toán                                   │
│              ↓                                                 │
│  Hệ thống CRM gửi yêu cầu đến MKT Server                       │
│              ↓                                                 │
│  MKT Server tạo license mới:                                   │
│     • Mã license: LIC-XXXXXX                                   │
│     • Trạng thái: Hoạt động                                    │
│     • Ngày hết hạn: [Ngày bắt đầu + Thời hạn mua]             │
│              ↓                                                 │
│  CRM nhận thông tin license                                    │
│              ↓                                                 │
│  Cập nhật đơn hàng: "Hoàn thành"                              │
│              ↓                                                 │
│  Gửi email license cho khách                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Thông tin license gửi cho khách

```
Kính gửi Quý khách [Tên],

Đơn hàng [Mã đơn] đã được xử lý thành công!

THÔNG TIN LICENSE:
─────────────────────────────
Mã license: [Mã license]
Sản phẩm: [Tên sản phẩm]
Ngày kích hoạt: [Ngày]
Ngày hết hạn: [Ngày]
─────────────────────────────

HƯỚNG DẪN SỬ DỤNG:
1. Tải phần mềm tại: [Link download]
2. Cài đặt và mở phần mềm
3. Nhập mã license khi được yêu cầu
4. Bắt đầu sử dụng!

Nếu cần hỗ trợ, vui lòng liên hệ:
- Hotline: [Số điện thoại]
- Email: [Email hỗ trợ]

Cảm ơn Quý khách đã tin tưởng sử dụng dịch vụ!

Trân trọng,
[Công ty]
```

---

## 3. Quy trình Đặc biệt

### 3.1 Đơn hàng Dùng thử (Trial)

**Khác biệt:** License được cấp NGAY khi tạo đơn, không cần thanh toán.

```
Tạo đơn hàng Trial
         ↓
Hệ thống tự động cấp license trial
         ↓
Đơn hàng: "Đang dùng thử"
         ↓
Khách sử dụng trong 7-14 ngày
         ↓
┌─────────────┬─────────────────┐
│ Hết hạn     │ Khách mua       │
│ trial       │ license         │
├─────────────┼─────────────────┤
│ Trạng thái: │ Tạo đơn mới     │
│ "Trial hết  │ → Thanh toán    │
│ hạn"        │ → Cấp license   │
│             │ chính thức      │
└─────────────┴─────────────────┘
```

**Lưu ý về Trial:**
- Mỗi khách hàng chỉ được dùng thử 1 lần
- License trial có đầy đủ tính năng nhưng giới hạn thời gian
- Sau khi hết hạn, không thể gia hạn trial

### 3.2 Đơn hàng Gia hạn

**Điều kiện:** Khách đang có license sắp hết hạn hoặc đã hết hạn.

```
Khách yêu cầu gia hạn
         ↓
Tạo đơn hàng gia hạn
(Liên kết với license hiện tại)
         ↓
Khách thanh toán
         ↓
Kế toán xác nhận
         ↓
Hệ thống gia hạn license:
   • License cũ: Cập nhật ngày hết hạn
   • HOẶC: Tạo license mới (tùy cấu hình)
```

### 3.3 Đơn hàng Nâng cấp (Upgrade)

**Điều kiện:** Khách muốn đổi sang gói cao hơn.

```
Khách yêu cầu nâng cấp
         ↓
Tạo đơn hàng nâng cấp
         ↓
Hệ thống tính:
   • Giá gói mới
   • Trừ giá trị còn lại của gói cũ
   • = Số tiền cần thanh toán thêm
         ↓
Khách thanh toán phần chênh lệch
         ↓
Kế toán xác nhận
         ↓
Thu hồi license cũ + Cấp license mới
```

---

## 4. Trạng thái Đơn hàng

### 4.1 Bảng Trạng thái

| Trạng thái | Ý nghĩa | License | Hành động tiếp theo |
|------------|---------|---------|---------------------|
| Nháp (Draft) | Đơn đang soạn, chưa gửi | ❌ Chưa có | Hoàn tất → Chờ thanh toán |
| Chờ thanh toán | Đợi khách thanh toán | ❌ Chưa có | Thanh toán → Xác nhận |
| Đang dùng thử | Khách đang trial | ✅ Trial | Mua → Chờ thanh toán |
| Trial hết hạn | Hết thời gian trial | ❌ Hết hạn | Mua mới |
| Đã xác nhận | Kế toán xác nhận TT | ⏳ Đang tạo | Tự động → Hoàn thành |
| Hoàn thành | Đơn hoàn tất | ✅ Hoạt động | Gia hạn / Nâng cấp |
| Quá hạn | Chưa TT sau 24h | ❌ Bị khóa | TT lại hoặc Hủy |
| Đã chặn | Admin chặn đơn | ❌ Bị khóa | Mở khóa hoặc Hủy |
| Đã hủy | Đơn bị hủy | ❌ Không có | Tạo đơn mới |
| Hoàn tiền | Đã hoàn tiền | ❌ Bị thu hồi | Không thể thay đổi |

### 4.2 Sơ đồ Luồng Trạng thái

```
                    ┌─────────┐
                    │  Nháp   │
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            ↓                         ↓
    ┌───────────────┐         ┌───────────────┐
    │ Chờ thanh toán │         │ Đang dùng thử │
    └───────┬───────┘         └───────┬───────┘
            │                         │
     ┌──────┼──────┐           ┌──────┼──────┐
     ↓      ↓      ↓           ↓             ↓
┌────────┐┌──────┐┌────────┐┌───────────┐┌───────────────┐
│Đã xác  ││Quá   ││Đã hủy  ││Trial hết  ││Chờ thanh toán │
│nhận    ││hạn   ││        ││hạn        ││(chuyển đổi)   │
└────┬───┘└──────┘└────────┘└───────────┘└───────────────┘
     │
     ↓
┌────────────┐
│ Hoàn thành │
└─────┬──────┘
      │
      ↓
┌────────────┐
│ Hoàn tiền  │ (Không thể thay đổi)
└────────────┘
```

---

## 5. Xử lý Các Trường hợp Đặc biệt

### 5.1 Đơn hàng Quá hạn Thanh toán

**Tình huống:** Khách không thanh toán trong 24 giờ.

**Xử lý:**
1. Hệ thống tự động chuyển sang "Quá hạn"
2. License (nếu có) bị khóa
3. Gửi email nhắc nhở khách

**Khách muốn tiếp tục mua:**
- Liên hệ CSKH để mở lại đơn
- Hoặc: Tạo đơn hàng mới

### 5.2 Khách Thanh toán Sai Số tiền

**Tình huống:** Khách chuyển thiếu hoặc thừa tiền.

| Trường hợp | Xử lý |
|------------|-------|
| Thiếu tiền | Liên hệ khách chuyển thêm |
| Thừa tiền | Hoàn lại phần thừa hoặc ghi nhận công nợ |

### 5.3 Khách Thanh toán Nhưng Quên Ghi Nội dung

**Xử lý:**
1. Kế toán đối chiếu theo tên/số tiền/thời gian
2. Xác nhận với khách qua điện thoại/email
3. Xác nhận thanh toán thủ công

### 5.4 Lỗi Khi Cấp License

**Tình huống:** Xác nhận thanh toán nhưng license không được tạo.

**Xử lý:**
1. Kiểm tra trạng thái đơn hàng
2. Nếu "Đã xác nhận" nhưng không có license → Báo IT
3. IT kiểm tra kết nối với MKT Server
4. Cấp license thủ công nếu cần

---

## 6. Quy định theo Phòng ban

### 6.1 Phòng Kinh doanh

| Quyền hạn | Có/Không |
|-----------|----------|
| Tạo đơn hàng mới | ✅ |
| Chọn sản phẩm/gói | ✅ |
| Áp dụng khuyến mãi | ✅ |
| Xác nhận thanh toán | ❌ (Cần Kế toán) |
| Hủy đơn hàng | ⚠️ Chỉ đơn chưa thanh toán |

**Lưu ý:**
- Kiểm tra kỹ thông tin khách trước khi tạo đơn
- Xác nhận sản phẩm và số lượng với khách
- Gửi thông tin thanh toán đầy đủ

### 6.2 Phòng Kế toán

| Quyền hạn | Có/Không |
|-----------|----------|
| Xem đơn hàng | ✅ |
| Xác nhận thanh toán | ✅ |
| Tạo đơn hàng | ❌ |
| Hủy đơn hàng | ❌ (Cần Quản lý) |

**Quy trình xác nhận:**
1. Đối chiếu sao kê ngân hàng hàng ngày
2. Xác nhận các đơn có giao dịch khớp
3. Ghi chú số giao dịch để truy soát
4. Báo cáo các trường hợp bất thường

### 6.3 Phòng CSKH

| Quyền hạn | Có/Không |
|-----------|----------|
| Tạo đơn hàng cho khách | ✅ |
| Xem trạng thái đơn | ✅ |
| Hỗ trợ khách tra cứu | ✅ |
| Xác nhận thanh toán | ❌ |
| Hủy đơn hàng | ⚠️ Tùy cấp bậc |

**Hướng dẫn hỗ trợ:**
- Tra cứu đơn bằng: Mã đơn, Email, SĐT khách
- Giải thích trạng thái đơn cho khách
- Hướng dẫn thanh toán nếu khách gặp khó khăn

### 6.4 Phòng Quản lý

| Quyền hạn | Có/Không |
|-----------|----------|
| Tất cả quyền trên | ✅ |
| Hủy đơn hàng | ✅ |
| Chặn/Mở khóa đơn | ✅ |
| Hoàn tiền | ✅ |
| Xem báo cáo | ✅ |

---

## 7. Câu hỏi Thường gặp (FAQ)

### Q1: Sau khi thanh toán, bao lâu thì nhận được license?
**A:**
- Thanh toán qua cổng tự động: Ngay lập tức (vài phút)
- Chuyển khoản ngân hàng: Sau khi Kế toán xác nhận (trong giờ hành chính)

### Q2: Khách muốn thay đổi sản phẩm sau khi tạo đơn?
**A:**
- Nếu chưa thanh toán: Hủy đơn cũ, tạo đơn mới
- Nếu đã thanh toán: Hoàn tiền + Tạo đơn mới

### Q3: Có thể tạo nhiều đơn hàng cho 1 khách không?
**A:** Có, mỗi đơn hàng độc lập với nhau.

### Q4: Đơn hàng quá hạn có tự động hủy không?
**A:** Không tự động hủy, chỉ chuyển sang trạng thái "Quá hạn". Admin có thể hủy hoặc mở lại.

### Q5: Khách có thể tự tạo đơn hàng không?
**A:** Tùy vào cấu hình hệ thống. Có thể mở portal khách hàng để khách tự đặt.

### Q6: Một đơn hàng có thể có nhiều sản phẩm không?
**A:** Có, một đơn có thể chứa nhiều sản phẩm với số lượng khác nhau.

### Q7: License được gửi qua đâu?
**A:** Qua email đăng ký của khách hàng. Khách cũng có thể xem trong trang quản lý tài khoản.

---

## 8. Liên hệ Hỗ trợ

| Vấn đề | Liên hệ |
|--------|---------|
| Hỗ trợ tạo đơn | Phòng Kinh doanh |
| Xác nhận thanh toán | Phòng Kế toán |
| Tra cứu đơn hàng | Phòng CSKH |
| Lỗi hệ thống | IT Support |
| Phê duyệt đặc biệt | Quản lý |

---

## 9. Phụ lục

### 9.1 Checklist Tạo Đơn hàng

```
☐ Xác nhận thông tin khách hàng (tên, email, SĐT)
☐ Xác nhận sản phẩm khách muốn mua
☐ Xác nhận số lượng license
☐ Xác nhận thời hạn sử dụng
☐ Áp dụng mã khuyến mãi (nếu có)
☐ Kiểm tra lại tổng tiền
☐ Tạo đơn hàng
☐ Gửi thông tin thanh toán cho khách
```

### 9.2 Checklist Xác nhận Thanh toán

```
☐ Kiểm tra sao kê ngân hàng
☐ Tìm giao dịch khớp mã đơn
☐ Xác nhận số tiền đúng
☐ Ghi nhận số giao dịch ngân hàng
☐ Xác nhận thanh toán trên CRM
☐ Kiểm tra license đã được cấp
☐ Thông báo cho khách (nếu cần)
```

---

## Lịch sử Cập nhật

| Phiên bản | Ngày | Người cập nhật | Nội dung thay đổi |
|-----------|------|----------------|-------------------|
| 1.0 | 2024-01-15 | - | Tạo mới tài liệu |

---

*Tài liệu này được quản lý bởi Phòng Vận hành. Mọi góp ý vui lòng gửi về email: [email hỗ trợ]*
