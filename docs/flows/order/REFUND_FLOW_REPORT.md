# Quy trình Hoàn tiền (Refund) - Hướng dẫn Nghiệp vụ

## Giới thiệu

Tài liệu này mô tả quy trình hoàn tiền cho đơn hàng trong hệ thống CRM, dành cho các phòng ban: Chăm sóc Khách hàng, Kế toán, Kinh doanh và Quản lý.

---

## 1. Tổng quan quy trình Hoàn tiền

### 1.1 Khi nào có thể hoàn tiền?

| Trạng thái đơn hàng | Có thể hoàn tiền? | Ghi chú |
|---------------------|-------------------|---------|
| Đã xác nhận (Confirmed) | ✅ Có | Đơn đã thanh toán, đang chờ cấp license |
| Hoàn thành (Completed) | ✅ Có | Đơn đã có license, khách đang sử dụng |
| Chờ thanh toán | ❌ Không | Chưa thanh toán → Hủy đơn thay vì hoàn tiền |
| Đã hủy | ❌ Không | Đơn đã kết thúc |
| Đã hoàn tiền | ❌ Không | Đã xử lý rồi |

### 1.2 Loại hoàn tiền

| Loại | Mô tả | Ví dụ |
|------|-------|-------|
| **Hoàn tiền toàn bộ** | Hoàn 100% giá trị đơn hàng | Khách không hài lòng, yêu cầu hoàn toàn bộ |
| **Hoàn tiền một phần** | Hoàn một phần giá trị | Khách muốn giữ 1 license, hoàn lại các license khác |

---

## 2. Quy trình Hoàn tiền Chi tiết

### 2.1 Các bước thực hiện

```
Bước 1: Tiếp nhận yêu cầu
         ↓
Bước 2: Xác minh thông tin
         ↓
Bước 3: Xác nhận với khách hàng
         ↓
Bước 4: Thực hiện hoàn tiền trên hệ thống
         ↓
Bước 5: License tự động bị thu hồi
         ↓
Bước 6: Thông báo kết quả cho khách
```

### 2.2 Chi tiết từng bước

#### Bước 1: Tiếp nhận yêu cầu
- **Ai thực hiện:** Nhân viên Chăm sóc Khách hàng (CSKH)
- **Nội dung:**
  - Ghi nhận yêu cầu hoàn tiền từ khách hàng
  - Thu thập thông tin: Mã đơn hàng, lý do hoàn tiền
  - Kiểm tra trạng thái đơn hàng

#### Bước 2: Xác minh thông tin
- **Ai thực hiện:** CSKH hoặc Quản lý
- **Nội dung:**
  - Kiểm tra đơn hàng có đủ điều kiện hoàn tiền không
  - Xác minh thông tin khách hàng
  - Kiểm tra lịch sử thanh toán

#### Bước 3: Xác nhận với khách hàng
- **Ai thực hiện:** CSKH
- **Nội dung quan trọng cần thông báo:**
  - Số tiền được hoàn
  - Số license sẽ bị thu hồi
  - **Sau khi hoàn tiền, khách hàng sẽ không thể sử dụng phần mềm nữa**
  - Thời gian hoàn tiền về tài khoản (tùy ngân hàng)

#### Bước 4: Thực hiện hoàn tiền
- **Ai thực hiện:** Người có quyền hoàn tiền (Quản lý hoặc CSKH cấp cao)
- **Thao tác trên hệ thống:**
  1. Mở chi tiết đơn hàng
  2. Chọn "Hoàn tiền"
  3. Nhập lý do hoàn tiền (bắt buộc)
  4. Xác nhận thực hiện

#### Bước 5: License tự động bị thu hồi
- **Hệ thống tự động:**
  - Thu hồi tất cả license liên quan đến đơn hàng
  - Khách hàng không thể sử dụng phần mềm ngay sau khi hoàn tiền
  - Ghi nhận lịch sử thao tác

#### Bước 6: Thông báo kết quả
- **Ai thực hiện:** CSKH
- **Nội dung:**
  - Xác nhận hoàn tiền thành công
  - Thông báo thời gian tiền về tài khoản
  - Hướng dẫn nếu khách muốn mua lại trong tương lai

---

## 3. Lưu ý Quan trọng

### 3.1 Hoàn tiền là KHÔNG THỂ HOÀN TÁC

> ⚠️ **CẢNH BÁO:** Sau khi hoàn tiền, đơn hàng sẽ chuyển sang trạng thái "Đã hoàn tiền" và **KHÔNG THỂ thay đổi được nữa**.

**Hậu quả:**
- License bị thu hồi vĩnh viễn
- Không thể "hủy hoàn tiền"
- Nếu muốn khách sử dụng lại, phải tạo đơn hàng mới

### 3.2 Trường hợp hoàn tiền nhầm

Nếu nhân viên hoàn tiền nhầm (ví dụ: hoàn sai đơn, khách không yêu cầu hoàn):

| Giải pháp | Mô tả | Khi nào dùng |
|-----------|-------|--------------|
| **Tạo đơn bù** | Tạo đơn hàng mới với cùng sản phẩm, không thu tiền | Khách muốn tiếp tục sử dụng |
| **Liên hệ khách** | Xin lỗi và hướng dẫn khách mua lại | Cần thu tiền lại |

**Quy trình tạo đơn bù:**
1. Báo cáo sai sót cho Quản lý
2. Quản lý tạo đơn hàng mới (Đơn bù)
3. Đánh dấu đơn bù liên kết với đơn gốc
4. Xác nhận đơn mà không cần thanh toán
5. Cấp license mới cho khách

---

## 4. Quy định theo Phòng ban

### 4.1 Phòng Chăm sóc Khách hàng

| Nhiệm vụ | Quyền hạn |
|----------|-----------|
| Tiếp nhận yêu cầu hoàn tiền | ✅ |
| Xác minh thông tin | ✅ |
| Xem trước thông tin hoàn tiền | ✅ |
| Thực hiện hoàn tiền | ⚠️ Tùy cấp bậc |
| Tạo đơn bù | ❌ (Cần Quản lý) |

**Lưu ý cho CSKH:**
- Luôn xác nhận lại với khách trước khi hoàn tiền
- Ghi rõ lý do hoàn tiền
- Lưu trữ bằng chứng (email, chat, cuộc gọi)

### 4.2 Phòng Kế toán

| Nhiệm vụ | Ghi chú |
|----------|---------|
| Theo dõi giao dịch hoàn tiền | Báo cáo hàng ngày/tuần |
| Đối soát với ngân hàng | Xác nhận tiền đã chuyển |
| Ghi nhận doanh thu âm | Theo quy định kế toán |

**Thông tin cần theo dõi:**
- Mã đơn hàng gốc
- Số tiền hoàn
- Ngày hoàn tiền
- Lý do hoàn tiền
- Người thực hiện

### 4.3 Phòng Kinh doanh

| Thông tin | Ý nghĩa |
|-----------|---------|
| Tỷ lệ hoàn tiền | Đánh giá chất lượng sản phẩm/dịch vụ |
| Lý do hoàn tiền phổ biến | Cải thiện sản phẩm/quy trình |
| Khách hàng hoàn tiền | Theo dõi khách hàng có vấn đề |

---

## 5. Các trường hợp Thường gặp

### 5.1 Khách yêu cầu hoàn tiền vì không hài lòng

**Quy trình:**
1. Tìm hiểu lý do không hài lòng
2. Cố gắng hỗ trợ giải quyết vấn đề trước
3. Nếu không giải quyết được → Tiến hành hoàn tiền
4. Ghi nhận feedback để cải thiện

### 5.2 Khách mua nhầm sản phẩm

**Quy trình:**
1. Xác nhận sản phẩm khách muốn
2. **Nếu chưa sử dụng license:** Hoàn tiền đơn cũ → Tạo đơn mới
3. **Nếu đã sử dụng:** Thỏa thuận với khách về giải pháp

### 5.3 Khách muốn hoàn một phần (giữ lại một số license)

**Quy trình:**
1. Xác nhận license nào khách muốn giữ
2. Thực hiện "Hoàn tiền một phần"
3. Chỉ thu hồi license được hoàn tiền
4. License còn lại vẫn hoạt động bình thường

### 5.4 Phát hiện gian lận (fake chứng từ thanh toán)

**Quy trình:**
1. Chặn đơn hàng ngay lập tức
2. Thu hồi license (nếu có)
3. Báo cáo cho Quản lý
4. Không hoàn tiền (vì không có thanh toán thật)

---

## 6. Mẫu Thông báo

### 6.1 Thông báo xác nhận trước khi hoàn tiền

```
Kính gửi Quý khách [Tên khách hàng],

Chúng tôi xác nhận yêu cầu hoàn tiền của Quý khách:

- Mã đơn hàng: [Mã đơn]
- Số tiền hoàn: [Số tiền] VND
- Số license bị thu hồi: [Số lượng] license

LƯU Ý QUAN TRỌNG:
Sau khi hoàn tiền, các license liên quan sẽ bị thu hồi và
Quý khách sẽ không thể tiếp tục sử dụng phần mềm.

Quý khách vui lòng xác nhận để chúng tôi tiến hành hoàn tiền.

Trân trọng,
[Tên nhân viên]
```

### 6.2 Thông báo hoàn tiền thành công

```
Kính gửi Quý khách [Tên khách hàng],

Đơn hàng [Mã đơn] đã được hoàn tiền thành công.

- Số tiền hoàn: [Số tiền] VND
- Thời gian: [Ngày giờ]
- Phương thức: Chuyển khoản ngân hàng

Tiền sẽ về tài khoản của Quý khách trong vòng 1-3 ngày làm việc,
tùy thuộc vào ngân hàng.

Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hotline: [Số điện thoại]

Cảm ơn Quý khách đã sử dụng dịch vụ của chúng tôi.

Trân trọng,
[Tên nhân viên]
```

---

## 7. Câu hỏi Thường gặp (FAQ)

### Q1: Hoàn tiền mất bao lâu?
**A:** Xử lý trên hệ thống: ngay lập tức. Tiền về tài khoản: 1-3 ngày làm việc (tùy ngân hàng).

### Q2: Có thể hủy yêu cầu hoàn tiền không?
**A:**
- Trước khi thực hiện: Có
- Sau khi đã hoàn tiền: Không thể hủy, chỉ có thể tạo đơn mới

### Q3: Khách có thể mua lại sau khi hoàn tiền không?
**A:** Có, khách có thể mua đơn hàng mới bình thường.

### Q4: Hoàn tiền có ảnh hưởng đến các đơn hàng khác không?
**A:** Không, hoàn tiền chỉ ảnh hưởng đến đơn hàng được chọn.

### Q5: Ai có quyền phê duyệt hoàn tiền?
**A:** Tùy theo quy định nội bộ, thường là Quản lý hoặc nhân viên được phân quyền.

---

## 8. Liên hệ Hỗ trợ

| Vấn đề | Liên hệ |
|--------|---------|
| Hỗ trợ kỹ thuật hệ thống | IT Support |
| Thắc mắc về quy trình | Quản lý trực tiếp |
| Báo cáo sai sót | Quản lý + IT |

---

## Lịch sử Cập nhật

| Phiên bản | Ngày | Người cập nhật | Nội dung thay đổi |
|-----------|------|----------------|-------------------|
| 1.0 | 2024-01-15 | - | Tạo mới tài liệu |
| 1.1 | - | - | Chuyển sang định dạng business document |

---

*Tài liệu này được quản lý bởi Phòng Vận hành. Mọi góp ý vui lòng gửi về email: [email hỗ trợ]*
