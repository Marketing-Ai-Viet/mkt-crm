# Quy trình Khóa License - Hướng dẫn Nghiệp vụ

## Giới thiệu

Tài liệu này mô tả các trường hợp cần khóa (thu hồi) license của khách hàng trong hệ thống CRM. Dành cho các phòng ban: Chăm sóc Khách hàng, Kế toán, Kinh doanh và Quản lý.

**License là gì?**
License là giấy phép sử dụng phần mềm. Khi license bị khóa, khách hàng sẽ không thể sử dụng phần mềm cho đến khi license được kích hoạt lại.

---

## 1. Tổng quan

### 1.1 Phân chia Trách nhiệm

| Phòng ban/Hệ thống | Quản lý |
|--------------------|---------|
| **CRM (Chúng ta)** | Khóa license theo nghiệp vụ kinh doanh: thanh toán, hoàn tiền, vi phạm chính sách |
| **MKT Server (Hệ thống kỹ thuật)** | Khóa license theo lý do kỹ thuật: hết hạn tự động, thiết bị vượt giới hạn, phát hiện gian lận |

### 1.2 Khi nào License bị Khóa?

```
┌────────────────────────────────────────────────────────────┐
│              CÁC TRƯỜNG HỢP KHÓA LICENSE                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  💰 Thanh toán                                             │
│     • Đơn hàng quá hạn thanh toán                         │
│     • Hoàn tiền (toàn bộ hoặc một phần)                   │
│                                                            │
│  📋 Quản lý đơn hàng                                       │
│     • Admin chặn đơn hàng (nghi ngờ gian lận)             │
│     • Hủy đơn hàng                                         │
│                                                            │
│  🎁 Dùng thử (Trial)                                       │
│     • Trial hết hạn không chuyển đổi                      │
│                                                            │
│  👤 Yêu cầu từ khách hàng                                  │
│     • Khách yêu cầu ngừng sử dụng                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Các Trường hợp Chi tiết

### 2.1 Thanh toán

#### Trường hợp 1: Đơn hàng Quá hạn Thanh toán

**Mô tả:** Khách hàng đã tạo đơn nhưng không thanh toán trong thời gian quy định.

| Thông tin | Chi tiết |
|-----------|----------|
| Điều kiện | Đơn hàng "Chờ thanh toán" quá 24 giờ (hoặc theo cấu hình) |
| Hành động | License tự động bị khóa |
| Ai thực hiện | Hệ thống tự động |
| Khách hàng | Không thể sử dụng phần mềm |

**Quy trình:**
```
Đơn hàng "Chờ thanh toán"
         ↓
Quá 24 giờ không thanh toán
         ↓
Hệ thống chuyển sang "Quá hạn"
         ↓
License tự động bị khóa
         ↓
(Tùy chọn) Gửi email nhắc nhở khách
```

**Cách khắc phục:**
- Khách thanh toán → Admin xác nhận → License được kích hoạt lại
- Hoặc: Admin mở khóa thủ công nếu có lý do chính đáng

---

#### Trường hợp 2: Hoàn tiền Toàn bộ

**Mô tả:** Admin thực hiện hoàn tiền 100% giá trị đơn hàng.

| Thông tin | Chi tiết |
|-----------|----------|
| Điều kiện | Admin xác nhận hoàn tiền toàn bộ |
| Hành động | TẤT CẢ license của đơn bị khóa |
| Ai thực hiện | Admin/Quản lý |
| Khách hàng | Không thể sử dụng phần mềm |

**Lưu ý quan trọng:**
> ⚠️ Sau khi hoàn tiền, license bị khóa VĨNH VIỄN. Không thể kích hoạt lại license cũ. Nếu khách muốn sử dụng, phải mua đơn mới.

---

#### Trường hợp 3: Hoàn tiền Một phần

**Mô tả:** Admin hoàn tiền một số sản phẩm trong đơn, giữ lại các sản phẩm khác.

| Thông tin | Chi tiết |
|-----------|----------|
| Điều kiện | Admin xác nhận hoàn tiền một phần |
| Hành động | CHỈ các license được hoàn tiền bị khóa |
| Ai thực hiện | Admin/Quản lý |
| Khách hàng | Vẫn sử dụng được license còn lại |

**Ví dụ:**
- Đơn hàng có 3 license: A, B, C
- Hoàn tiền license B
- Kết quả: License B bị khóa, A và C vẫn hoạt động

---

### 2.2 Quản lý Đơn hàng

#### Trường hợp 4: Chặn Đơn hàng (Block)

**Mô tả:** Admin chủ động chặn đơn hàng vì lý do nghiệp vụ.

| Thông tin | Chi tiết |
|-----------|----------|
| Điều kiện | Admin quyết định chặn đơn |
| Lý do thường gặp | Nghi ngờ gian lận, chứng từ giả, vi phạm chính sách |
| Hành động | License bị khóa ngay lập tức |
| Ai thực hiện | Admin/Quản lý |

**Khi nào nên chặn đơn:**
- Phát hiện chứng từ thanh toán giả mạo
- Khách hàng vi phạm điều khoản sử dụng
- Nghi ngờ hành vi lừa đảo
- Yêu cầu từ bộ phận pháp lý

**Quy trình chặn:**
```
Admin phát hiện vấn đề
         ↓
Xác minh thông tin
         ↓
Chọn đơn hàng → "Chặn đơn"
         ↓
Nhập lý do chặn (bắt buộc)
         ↓
License bị khóa
         ↓
Ghi nhận lịch sử
```

---

#### Trường hợp 5: Mở khóa Đơn hàng (Unblock)

**Mô tả:** Admin mở khóa đơn hàng đã bị chặn trước đó.

| Thông tin | Chi tiết |
|-----------|----------|
| Điều kiện | Đơn hàng đang ở trạng thái "Đã chặn" |
| Hành động | Đơn chuyển về "Chờ thanh toán", license được kích hoạt lại |
| Ai thực hiện | Admin/Quản lý (cần quyền) |

**Khi nào mở khóa:**
- Xác minh khách hàng không gian lận
- Vấn đề đã được giải quyết
- Chặn nhầm

**Quy trình mở khóa:**
```
Admin xác nhận đủ điều kiện mở khóa
         ↓
Chọn đơn hàng → "Mở khóa"
         ↓
Nhập lý do mở khóa (bắt buộc)
         ↓
Đơn hàng về "Chờ thanh toán"
         ↓
License được kích hoạt lại
         ↓
Thông báo cho khách
```

---

#### Trường hợp 6: Hủy Đơn hàng

**Mô tả:** Đơn hàng bị hủy trước khi hoàn thành.

| Thông tin | Chi tiết |
|-----------|----------|
| Điều kiện | Đơn ở trạng thái "Chờ thanh toán" hoặc "Dùng thử" |
| Hành động | Đơn hàng bị hủy |
| Ai thực hiện | Admin hoặc Khách hàng |
| License | Không ảnh hưởng (vì chưa có license) |

**Lưu ý:** Chỉ có thể hủy đơn khi chưa thanh toán hoặc chưa cấp license.

---

### 2.3 Dùng thử (Trial)

#### Trường hợp 7: Trial Hết hạn

**Mô tả:** Khách hàng dùng thử nhưng không mua sau khi hết thời gian trial.

| Thông tin | Chi tiết |
|-----------|----------|
| Điều kiện | Hết thời gian dùng thử (thường 7-14 ngày) |
| Hành động | Đơn chuyển sang "Trial hết hạn" |
| Ai thực hiện | Hệ thống tự động |
| License | Ngừng hoạt động |

**Quy trình:**
```
Khách đăng ký dùng thử
         ↓
License trial được cấp (7-14 ngày)
         ↓
Hết thời gian trial
         ↓
Hệ thống chuyển "Trial hết hạn"
         ↓
License ngừng hoạt động
         ↓
Gửi email mời mua
```

**Cách chuyển đổi thành khách hàng:**
- Khách thanh toán → Đơn hàng mới → License chính thức

---

### 2.4 Yêu cầu từ Khách hàng

#### Trường hợp 8: Khách yêu cầu Ngừng Sử dụng

**Mô tả:** Khách hàng chủ động yêu cầu khóa license.

| Thông tin | Chi tiết |
|-----------|----------|
| Điều kiện | Khách gửi yêu cầu qua kênh hỗ trợ |
| Hành động | Admin chặn đơn theo yêu cầu |
| Ai thực hiện | Admin (theo yêu cầu khách) |
| Hoàn tiền | Tùy theo chính sách |

**Lưu ý:**
- Cần xác minh danh tính khách hàng
- Ghi nhận lý do yêu cầu
- Hướng dẫn nếu khách muốn sử dụng lại

---

## 3. Các Trường hợp KHÔNG do CRM Quản lý

Các trường hợp sau do **hệ thống MKT Server** xử lý tự động:

| Trường hợp | Mô tả | Liên hệ |
|------------|-------|---------|
| License hết hạn | License hết thời hạn sử dụng | MKT Server tự động |
| Vượt quá số thiết bị | Sử dụng trên nhiều thiết bị hơn cho phép | MKT Server |
| Chia sẻ tài khoản | Phát hiện nhiều người dùng 1 tài khoản | MKT Server |
| Gian lận kỹ thuật | Phát hiện hành vi gian lận | MKT Server |
| Vi phạm nội dung | Sử dụng cho mục đích bất hợp pháp | MKT Server |

**Nếu khách hỏi về các trường hợp trên:**
- Ghi nhận thông tin
- Chuyển sang bộ phận Kỹ thuật để xử lý

---

## 4. Quy định theo Phòng ban

### 4.1 Phòng Chăm sóc Khách hàng

| Quyền hạn | Có/Không |
|-----------|----------|
| Xem trạng thái license | ✅ Có |
| Chặn đơn hàng | ⚠️ Tùy cấp bậc |
| Mở khóa đơn hàng | ❌ Cần Quản lý |
| Hoàn tiền | ⚠️ Tùy cấp bậc |

**Hướng dẫn xử lý khiếu nại license bị khóa:**
1. Xác định lý do khóa (xem trong hệ thống)
2. Giải thích cho khách hàng
3. Nếu cần mở khóa → Báo cáo Quản lý
4. Ghi nhận vào ticket

### 4.2 Phòng Quản lý

| Quyền hạn | Có/Không |
|-----------|----------|
| Chặn đơn hàng | ✅ Có |
| Mở khóa đơn hàng | ✅ Có |
| Hoàn tiền | ✅ Có |
| Xem báo cáo khóa license | ✅ Có |

### 4.3 Phòng Kế toán

**Thông tin cần theo dõi:**
- Đơn hàng bị khóa do quá hạn thanh toán
- Đơn hàng hoàn tiền
- Doanh thu bị ảnh hưởng

---

## 5. Bảng Tổng hợp Trạng thái

| Trạng thái đơn hàng | License | Có thể khôi phục? |
|---------------------|---------|-------------------|
| Hoàn thành | ✅ Hoạt động | - |
| Chờ thanh toán | ⏳ Chưa có | - |
| Quá hạn | ❌ Bị khóa | ✅ Có (thanh toán) |
| Đã chặn | ❌ Bị khóa | ✅ Có (mở khóa) |
| Đã hủy | ❌ Không có | ❌ Không |
| Hoàn tiền | ❌ Bị khóa | ❌ Không (tạo đơn mới) |
| Trial hết hạn | ❌ Ngừng | ✅ Có (mua mới) |

---

## 6. Các Trường hợp Thường gặp

### 6.1 Khách báo license bị khóa không rõ lý do

**Xử lý:**
1. Tra cứu mã đơn hàng/email khách
2. Kiểm tra trạng thái đơn hàng
3. Xác định lý do:
   - Quá hạn thanh toán?
   - Bị chặn bởi admin?
   - Trial hết hạn?
4. Giải thích và hướng dẫn khách

### 6.2 Khách yêu cầu mở khóa license

**Xử lý:**
1. Xác định lý do bị khóa
2. Kiểm tra điều kiện mở khóa:
   - Quá hạn → Khách cần thanh toán trước
   - Bị chặn → Cần xét duyệt của Quản lý
   - Hoàn tiền → Không thể mở khóa, cần mua mới
3. Thực hiện hoặc từ chối với lý do

### 6.3 Phát hiện khách dùng chứng từ giả

**Xử lý:**
1. Thu thập bằng chứng
2. Báo cáo Quản lý ngay
3. Quản lý quyết định chặn đơn
4. Ghi nhận lý do chi tiết
5. Lưu trữ hồ sơ (có thể cần cho pháp lý)

---

## 7. Mẫu Thông báo

### 7.1 Thông báo License bị Khóa (Quá hạn)

```
Kính gửi Quý khách [Tên],

Đơn hàng [Mã đơn] của Quý khách đã quá hạn thanh toán.

Do đó, license liên quan đã tạm thời bị khóa.

Để tiếp tục sử dụng phần mềm, vui lòng:
1. Thanh toán đơn hàng theo hướng dẫn
2. Liên hệ CSKH để được hỗ trợ kích hoạt lại

Thông tin thanh toán:
- Số tiền: [Số tiền] VND
- Hạn thanh toán: [Ngày]

Hotline hỗ trợ: [Số điện thoại]

Trân trọng,
[Tên nhân viên]
```

### 7.2 Thông báo License bị Khóa (Vi phạm)

```
Kính gửi Quý khách [Tên],

Chúng tôi phát hiện đơn hàng [Mã đơn] có vấn đề cần xác minh.

License liên quan đã tạm thời bị khóa để bảo vệ quyền lợi các bên.

Lý do: [Lý do ngắn gọn]

Để giải quyết, vui lòng liên hệ:
- Email: [Email hỗ trợ]
- Hotline: [Số điện thoại]

Vui lòng cung cấp thêm thông tin để chúng tôi xác minh.

Trân trọng,
[Tên nhân viên]
```

### 7.3 Thông báo Mở khóa Thành công

```
Kính gửi Quý khách [Tên],

Đơn hàng [Mã đơn] đã được mở khóa thành công.

License của Quý khách đã được kích hoạt lại và có thể
sử dụng bình thường.

Nếu gặp bất kỳ vấn đề nào, vui lòng liên hệ:
- Hotline: [Số điện thoại]
- Email: [Email hỗ trợ]

Cảm ơn Quý khách đã sử dụng dịch vụ của chúng tôi.

Trân trọng,
[Tên nhân viên]
```

---

## 8. Câu hỏi Thường gặp (FAQ)

### Q1: License bị khóa có mất dữ liệu không?
**A:** Không. Dữ liệu vẫn được lưu trữ. Khi license được kích hoạt lại, khách có thể tiếp tục sử dụng bình thường.

### Q2: Sau khi hoàn tiền, có thể kích hoạt lại license cũ không?
**A:** Không. Sau khi hoàn tiền, license bị khóa vĩnh viễn. Khách cần mua đơn hàng mới.

### Q3: Khách thanh toán trễ, license có tự động mở không?
**A:** Không tự động. Admin cần xác nhận thanh toán và mở khóa thủ công.

### Q4: Ai có quyền mở khóa license?
**A:** Quản lý hoặc nhân viên được phân quyền (tùy theo quy định nội bộ).

### Q5: License trial hết hạn có thể gia hạn không?
**A:** Thông thường không. Khách cần mua license chính thức.

---

## 9. Liên hệ Hỗ trợ

| Vấn đề | Liên hệ |
|--------|---------|
| Khiếu nại license bị khóa | Phòng CSKH |
| Yêu cầu mở khóa | Quản lý |
| Vấn đề kỹ thuật | IT Support |
| Vấn đề pháp lý | Ban Giám đốc |

---

## Lịch sử Cập nhật

| Phiên bản | Ngày | Người cập nhật | Nội dung thay đổi |
|-----------|------|----------------|-------------------|
| 1.0 | 2024-01-15 | - | Tạo mới tài liệu |
| 1.1 | - | - | Chuyển sang định dạng business document |

---

*Tài liệu này được quản lý bởi Phòng Vận hành. Mọi góp ý vui lòng gửi về email: [email hỗ trợ]*
