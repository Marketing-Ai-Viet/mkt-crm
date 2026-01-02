# Quy trình Tạo Đơn hàng và Cấp License - Hướng dẫn Nghiệp vụ

## Giới thiệu

Tài liệu này mô tả quy trình tạo đơn hàng và cấp license cho khách hàng trong hệ thống CRM. Dành cho các phòng ban: Kinh doanh, Chăm sóc Khách hàng, Kế toán và Quản lý.

**Thuật ngữ quan trọng:**
- **Đơn hàng (Order):** Phiếu ghi nhận thông tin mua hàng của khách
- **License:** Giấy phép sử dụng phần mềm được cấp cho khách sau khi thanh toán
- **Trial:** Dùng thử miễn phí trong thời gian giới hạn
- **SEPay:** Cổng thanh toán tự động, tích hợp webhook

---

## 1. Tổng quan Quy trình

### 1.1 Hai Luồng Thanh toán

```
┌────────────────────────────────────────────────────────────────┐
│              HAI LUỒNG THANH TOÁN VÀ CẤP LICENSE               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  🔄 LUỒNG 1: SEPay (Tự động hoàn toàn)                        │
│  ─────────────────────────────────────                        │
│  Tạo đơn → Khách quét QR SEPay → Thanh toán thành công        │
│          → Webhook tự động xác nhận → License cấp ngay        │
│                                                                │
│  ⏳ Thời gian: Vài giây sau khi thanh toán                    │
│  👤 Không cần Kế toán xác nhận                                │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  👋 LUỒNG 2: Tiền mặt / Chuyển khoản thường                   │
│  ─────────────────────────────────────────                    │
│  Tạo đơn → Khách thanh toán → Kế toán xác nhận thủ công       │
│          → License được cấp                                    │
│                                                                │
│  ⏳ Thời gian: Sau khi Kế toán xác nhận (trong giờ hành chính)│
│  👤 Cần Kế toán xác nhận                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Các Loại Đơn hàng

| Loại | Mô tả | License được cấp khi nào? |
|------|-------|---------------------------|
| **Đơn mới** | Khách mua lần đầu | Sau khi thanh toán được xác nhận |
| **Dùng thử (Trial)** | Khách dùng thử miễn phí | Ngay lập tức khi tạo đơn |
| **Gia hạn** | Gia hạn license đang dùng | Sau khi thanh toán được xác nhận |
| **Nâng cấp** | Đổi sang gói cao hơn | Sau khi thanh toán được xác nhận |

### 1.3 Các Phương thức Thanh toán

| Phương thức | Loại | Xác nhận | Cấp License |
|-------------|------|----------|-------------|
| **SEPay** | Tự động | Webhook tự động | Tự động ngay lập tức |
| **Chuyển khoản ngân hàng** | Thủ công | Kế toán xác nhận | Sau khi Kế toán xác nhận |
| **Tiền mặt** | Thủ công | Kế toán xác nhận | Sau khi Kế toán xác nhận |

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
| Phương thức thanh toán | ✅ | SEPay / Chuyển khoản / Tiền mặt |
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
Chọn phương thức thanh toán
         ↓
Hệ thống tự động tính giá
         ↓
Nhập mã khuyến mãi (nếu có)
         ↓
Xác nhận tạo đơn
         ↓
┌─────────────────┬─────────────────┐
│ SEPay           │ Chuyển khoản/   │
│                 │ Tiền mặt        │
├─────────────────┼─────────────────┤
│ Hiển thị QR     │ Hiển thị thông  │
│ SEPay           │ tin chuyển khoản│
└─────────────────┴─────────────────┘
```

#### Kết quả sau khi tạo đơn

- **Mã đơn hàng:** ORD-XXXXXX (dùng để tra cứu)
- **Trạng thái:** "Chờ thanh toán"
- **Thông tin thanh toán:** QR SEPay hoặc số tài khoản ngân hàng

---

### 2.2 Bước 2: Thanh toán

#### A. Thanh toán qua SEPay (Tự động)

```
┌────────────────────────────────────────────────────────────────┐
│               LUỒNG SEPAY - TỰ ĐỘNG HOÀN TOÀN                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Khách quét mã QR SEPay                                        │
│              ↓                                                 │
│  Khách xác nhận thanh toán trên app ngân hàng                  │
│              ↓                                                 │
│  SEPay nhận tiền thành công                                    │
│              ↓                                                 │
│  SEPay gửi webhook đến hệ thống CRM                            │
│              ↓                                                 │
│  Hệ thống TỰ ĐỘNG:                                             │
│     • Xác nhận thanh toán                                      │
│     • Cấp license ngay lập tức                                 │
│     • Gửi email license cho khách                              │
│              ↓                                                 │
│  Đơn hàng: "Hoàn thành"                                        │
│                                                                │
│  ⏱️ Tổng thời gian: Vài giây                                  │
│  👤 Không cần sự can thiệp của nhân viên                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Ưu điểm SEPay:**
- Nhanh chóng, khách nhận license ngay
- Không cần Kế toán xác nhận
- Hoạt động 24/7

#### B. Thanh toán Chuyển khoản / Tiền mặt (Thủ công)

```
┌────────────────────────────────────────────────────────────────┐
│           LUỒNG CHUYỂN KHOẢN / TIỀN MẶT - THỦ CÔNG             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Khách chuyển khoản / thanh toán tiền mặt                      │
│              ↓                                                 │
│  Kế toán kiểm tra sao kê ngân hàng / nhận tiền mặt             │
│              ↓                                                 │
│  Kế toán tìm đơn hàng trên CRM                                 │
│              ↓                                                 │
│  Kế toán nhấn "Xác nhận thanh toán"                            │
│              ↓                                                 │
│  Hệ thống TỰ ĐỘNG:                                             │
│     • Cấp license                                              │
│     • Gửi email license cho khách                              │
│              ↓                                                 │
│  Đơn hàng: "Hoàn thành"                                        │
│                                                                │
│  ⏱️ Thời gian: Phụ thuộc vào Kế toán (trong giờ hành chính)   │
│  👤 Cần Kế toán xác nhận thủ công                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Thời hạn thanh toán

- **Không giới hạn thời gian:** Đơn hàng giữ trạng thái "Chờ thanh toán" cho đến khi được thanh toán hoặc hủy
- **Không tự động khóa license:** Hệ thống không tự động khóa hay hủy đơn quá hạn
- **Nhắc nhở:** Có thể cấu hình gửi email nhắc nhở khách sau X ngày

---

### 2.3 Bước 3: Cấp License

#### License được tạo như thế nào?

| Phương thức TT | Trigger cấp license | Thời gian |
|----------------|---------------------|-----------|
| SEPay | Webhook tự động | Vài giây |
| Chuyển khoản | Kế toán xác nhận | Phụ thuộc Kế toán |
| Tiền mặt | Kế toán xác nhận | Phụ thuộc Kế toán |

```
┌────────────────────────────────────────────────────────────────┐
│                    QUY TRÌNH CẤP LICENSE                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Thanh toán được xác nhận (tự động hoặc thủ công)              │
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

## 3. So sánh Hai Luồng Thanh toán

| Tiêu chí | SEPay (Tự động) | Chuyển khoản/Tiền mặt (Thủ công) |
|----------|-----------------|----------------------------------|
| **Xác nhận thanh toán** | Webhook tự động | Kế toán xác nhận |
| **Cấp license** | Tự động ngay lập tức | Sau khi Kế toán xác nhận |
| **Thời gian nhận license** | Vài giây | Phụ thuộc Kế toán |
| **Hoạt động 24/7** | ✅ Có | ❌ Chỉ trong giờ hành chính |
| **Cần nhân viên** | ❌ Không | ✅ Cần Kế toán |
| **Phù hợp với** | Khách cá nhân, mua online | Doanh nghiệp, thanh toán lớn |

---

## 4. Quy trình Đặc biệt

### 4.1 Đơn hàng Dùng thử (Trial)

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

### 4.2 Đơn hàng Gia hạn

**Điều kiện:** Khách đang có license sắp hết hạn hoặc đã hết hạn.

```
Khách yêu cầu gia hạn
         ↓
Tạo đơn hàng gia hạn
(Liên kết với license hiện tại)
         ↓
Khách thanh toán (SEPay hoặc chuyển khoản)
         ↓
Thanh toán được xác nhận
         ↓
Hệ thống gia hạn license:
   • License cũ: Cập nhật ngày hết hạn
   • HOẶC: Tạo license mới (tùy cấu hình)
```

### 4.3 Đơn hàng Nâng cấp (Upgrade)

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
Thanh toán được xác nhận
         ↓
Thu hồi license cũ + Cấp license mới
```

---

## 5. Trạng thái Đơn hàng

### 5.1 Bảng Trạng thái

| Trạng thái | Ý nghĩa | License | Hành động tiếp theo |
|------------|---------|---------|---------------------|
| Nháp (Draft) | Đơn đang soạn, chưa gửi | ❌ Chưa có | Hoàn tất → Chờ thanh toán |
| Chờ thanh toán | Đợi khách thanh toán | ❌ Chưa có | Thanh toán → Xác nhận |
| Đang dùng thử | Khách đang trial | ✅ Trial | Mua → Chờ thanh toán |
| Trial hết hạn | Hết thời gian trial | ❌ Hết hạn | Mua mới |
| Đã xác nhận | Thanh toán xác nhận | ⏳ Đang tạo | Tự động → Hoàn thành |
| Hoàn thành | Đơn hoàn tất | ✅ Hoạt động | Gia hạn / Nâng cấp |
| Đã chặn | Admin chặn đơn | ❌ Bị khóa | Mở khóa hoặc Hủy |
| Đã hủy | Đơn bị hủy | ❌ Không có | Tạo đơn mới |
| Hoàn tiền | Đã hoàn tiền | ❌ Bị thu hồi | Không thể thay đổi |

> **Lưu ý:** Đơn hàng "Chờ thanh toán" sẽ giữ nguyên trạng thái cho đến khi được thanh toán hoặc hủy. Hệ thống **KHÔNG tự động** chuyển sang quá hạn hay khóa license.

### 5.2 Sơ đồ Luồng Trạng thái

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
     ↓             ↓           ↓             ↓
┌────────┐    ┌────────┐  ┌───────────┐┌───────────────┐
│Đã xác  │    │Đã hủy  │  │Trial hết  ││Chờ thanh toán │
│nhận    │    │        │  │hạn        ││(chuyển đổi)   │
└────┬───┘    └────────┘  └───────────┘└───────────────┘
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

## 6. Xử lý Các Trường hợp Đặc biệt

### 6.1 Đơn hàng Chờ Thanh toán Lâu

**Tình huống:** Khách tạo đơn nhưng chưa thanh toán sau nhiều ngày.

**Xử lý:**
- Đơn vẫn giữ trạng thái "Chờ thanh toán"
- **KHÔNG tự động khóa** hay hủy
- Có thể cấu hình gửi email nhắc nhở
- Admin có thể hủy đơn thủ công nếu cần

### 6.2 Khách Thanh toán Sai Số tiền

**Tình huống:** Khách chuyển thiếu hoặc thừa tiền.

| Trường hợp | Xử lý |
|------------|-------|
| Thiếu tiền | Liên hệ khách chuyển thêm |
| Thừa tiền | Hoàn lại phần thừa hoặc ghi nhận công nợ |

### 6.3 Khách Thanh toán Nhưng Quên Ghi Nội dung

**Xử lý:**
1. Kế toán đối chiếu theo tên/số tiền/thời gian
2. Xác nhận với khách qua điện thoại/email
3. Xác nhận thanh toán thủ công

### 6.4 Lỗi Webhook SEPay

**Tình huống:** Khách thanh toán qua SEPay nhưng webhook không hoạt động.

**Xử lý:**
1. Kiểm tra trạng thái đơn hàng
2. Kiểm tra lịch sử giao dịch SEPay
3. Nếu có thanh toán → Kế toán xác nhận thủ công
4. Báo IT kiểm tra webhook

### 6.5 Lỗi Khi Cấp License

**Tình huống:** Thanh toán xác nhận nhưng license không được tạo.

**Xử lý:**
1. Kiểm tra trạng thái đơn hàng
2. Nếu "Đã xác nhận" nhưng không có license → Báo IT
3. IT kiểm tra kết nối với MKT Server
4. Cấp license thủ công nếu cần

---

## 7. Quy định theo Phòng ban

### 7.1 Phòng Kinh doanh

| Quyền hạn | Có/Không |
|-----------|----------|
| Tạo đơn hàng mới | ✅ |
| Chọn sản phẩm/gói | ✅ |
| Chọn phương thức thanh toán | ✅ |
| Áp dụng khuyến mãi | ✅ |
| Xác nhận thanh toán | ❌ (Cần Kế toán) |
| Hủy đơn hàng | ⚠️ Chỉ đơn chưa thanh toán |

**Lưu ý:**
- Hướng dẫn khách chọn SEPay để nhận license nhanh nhất
- Kiểm tra kỹ thông tin khách trước khi tạo đơn
- Gửi thông tin thanh toán đầy đủ

### 7.2 Phòng Kế toán

| Quyền hạn | Có/Không |
|-----------|----------|
| Xem đơn hàng | ✅ |
| Xác nhận thanh toán (Chuyển khoản/Tiền mặt) | ✅ |
| Xác nhận thanh toán (SEPay) | ❌ (Tự động) |
| Tạo đơn hàng | ❌ |
| Hủy đơn hàng | ❌ (Cần Quản lý) |

**Quy trình xác nhận (Chuyển khoản/Tiền mặt):**
1. Đối chiếu sao kê ngân hàng / nhận tiền mặt
2. Xác nhận các đơn có giao dịch khớp
3. Ghi chú số giao dịch để truy soát
4. Báo cáo các trường hợp bất thường

**Lưu ý SEPay:**
- Đơn thanh toán qua SEPay sẽ tự động xác nhận
- Chỉ cần xác nhận thủ công khi webhook lỗi

### 7.3 Phòng CSKH

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
- Hướng dẫn thanh toán SEPay để nhận license nhanh

### 7.4 Phòng Quản lý

| Quyền hạn | Có/Không |
|-----------|----------|
| Tất cả quyền trên | ✅ |
| Hủy đơn hàng | ✅ |
| Chặn/Mở khóa đơn | ✅ |
| Hoàn tiền | ✅ |
| Xem báo cáo | ✅ |

---

## 8. Câu hỏi Thường gặp (FAQ)

### Q1: Sau khi thanh toán, bao lâu thì nhận được license?
**A:**
- **SEPay:** Ngay lập tức (vài giây sau khi thanh toán)
- **Chuyển khoản/Tiền mặt:** Sau khi Kế toán xác nhận (trong giờ hành chính)

### Q2: Tại sao nên chọn thanh toán qua SEPay?
**A:**
- Nhận license ngay lập tức, không cần chờ
- Hoạt động 24/7, kể cả ngoài giờ hành chính
- Tự động, không cần liên hệ Kế toán

### Q3: Đơn hàng chờ thanh toán có bị tự động hủy không?
**A:** Không. Đơn hàng sẽ giữ trạng thái "Chờ thanh toán" cho đến khi được thanh toán hoặc Admin hủy thủ công.

### Q4: Khách thanh toán ngoài giờ hành chính thì sao?
**A:**
- **SEPay:** License được cấp ngay
- **Chuyển khoản:** Đợi Kế toán xác nhận vào ngày làm việc tiếp theo

### Q5: Khách muốn thay đổi sản phẩm sau khi tạo đơn?
**A:**
- Nếu chưa thanh toán: Hủy đơn cũ, tạo đơn mới
- Nếu đã thanh toán: Hoàn tiền + Tạo đơn mới

### Q6: Có thể tạo nhiều đơn hàng cho 1 khách không?
**A:** Có, mỗi đơn hàng độc lập với nhau.

### Q7: License được gửi qua đâu?
**A:** Qua email đăng ký của khách hàng. Khách cũng có thể xem trong trang quản lý tài khoản.

---

## 9. Liên hệ Hỗ trợ

| Vấn đề | Liên hệ |
|--------|---------|
| Hỗ trợ tạo đơn | Phòng Kinh doanh |
| Xác nhận thanh toán (Chuyển khoản/Tiền mặt) | Phòng Kế toán |
| Tra cứu đơn hàng | Phòng CSKH |
| Lỗi SEPay/Webhook | IT Support |
| Lỗi cấp license | IT Support |
| Phê duyệt đặc biệt | Quản lý |

---

## 10. Phụ lục

### 10.1 Checklist Tạo Đơn hàng

```
☐ Xác nhận thông tin khách hàng (tên, email, SĐT)
☐ Xác nhận sản phẩm khách muốn mua
☐ Xác nhận số lượng license
☐ Xác nhận thời hạn sử dụng
☐ Chọn phương thức thanh toán
☐ Áp dụng mã khuyến mãi (nếu có)
☐ Kiểm tra lại tổng tiền
☐ Tạo đơn hàng
☐ Gửi thông tin thanh toán cho khách
☐ Hướng dẫn khách chọn SEPay nếu muốn nhận license nhanh
```

### 10.2 Checklist Xác nhận Thanh toán (Chuyển khoản/Tiền mặt)

```
☐ Kiểm tra sao kê ngân hàng / nhận tiền mặt
☐ Tìm giao dịch khớp mã đơn
☐ Xác nhận số tiền đúng
☐ Ghi nhận số giao dịch ngân hàng
☐ Xác nhận thanh toán trên CRM
☐ Kiểm tra license đã được cấp
☐ Thông báo cho khách (nếu cần)
```

### 10.3 Xử lý Sự cố SEPay

```
Khách báo đã thanh toán SEPay nhưng chưa nhận license
         ↓
☐ Kiểm tra trạng thái đơn hàng trên CRM
         ↓
☐ Nếu "Chờ thanh toán" → Kiểm tra lịch sử giao dịch SEPay
         ↓
☐ Nếu có giao dịch → Báo IT kiểm tra webhook
         ↓
☐ Trong khi chờ IT → Kế toán xác nhận thủ công
         ↓
☐ License được cấp → Thông báo cho khách
```

---

## Lịch sử Cập nhật

| Phiên bản | Ngày | Người cập nhật | Nội dung thay đổi |
|-----------|------|----------------|-------------------|
| 1.0 | 2024-01-15 | - | Tạo mới tài liệu |
| 1.1 | 2024-01-16 | - | Cập nhật luồng SEPay tự động, bỏ tự động khóa license |

---

*Tài liệu này được quản lý bởi Phòng Vận hành. Mọi góp ý vui lòng gửi về email: [email hỗ trợ]*
