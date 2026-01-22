# Chính sách Cộng dồn Khuyến mãi (Discount Stacking Policy)

> **Phiên bản**: 1.2
> **Ngày hiệu lực**: 2026-01-19
> **Phòng ban liên quan**: Sales, Marketing, Finance, Customer Service, IT
> **Trạng thái**: Draft - Chờ phê duyệt

---

## 1. Mục đích tài liệu

Tài liệu này nhằm:
- Thống nhất cách hiểu về việc áp dụng nhiều khuyến mãi cùng lúc
- Định nghĩa rõ ràng công thức tính toán giảm giá
- Làm cơ sở cho việc giải thích cho khách hàng
- Đảm bảo tính nhất quán giữa các phòng ban

---

## 2. Thuật ngữ

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| **Subtotal** | Tổng giá trị đơn hàng trước khi áp dụng khuyến mãi |
| **Discount Stacking** | Việc áp dụng nhiều chương trình khuyến mãi cùng lúc cho một đơn hàng |
| **Tier Discount** | Giảm giá theo hạng thành viên (Bạc, Vàng, Kim Cương) |
| **Coupon** | Mã giảm giá do khách hàng nhập |
| **Promotion** | Chương trình khuyến mãi tự động áp dụng |
| **Sales Discount** | Giảm giá do Saler nhập trực tiếp khi tạo đơn hàng (Manual Discount) |

---

## 3. Ba phương pháp tính Discount Stacking

### 3.1. Phương pháp 1: Cộng dồn theo phần trăm (Additive)

#### Mô tả
Tất cả các khuyến mãi đều được tính trên **giá trị đơn hàng gốc (subtotal)**, sau đó cộng tổng số tiền giảm.

#### Công thức
```
Tổng giảm giá = (Subtotal × %KM1) + (Subtotal × %KM2) + ...
```

#### Ví dụ minh họa

| Thông tin đơn hàng | Giá trị |
|--------------------|---------|
| Giá trị đơn hàng (Subtotal) | 1,000,000 VND |
| Giảm giá Tier Vàng | 10% |
| Mã giảm giá (Coupon) | 5% |

**Cách tính:**
```
Giảm giá Tier  = 1,000,000 × 10% = 100,000 VND
Giảm giá Coupon = 1,000,000 × 5%  = 50,000 VND
────────────────────────────────────────────────
Tổng giảm giá  = 100,000 + 50,000 = 150,000 VND (15%)
Khách thanh toán = 1,000,000 - 150,000 = 850,000 VND
```

#### Ưu điểm
- ✅ Dễ hiểu, dễ giải thích cho khách hàng
- ✅ Khách hàng cảm nhận được hưởng đầy đủ cả hai ưu đãi

#### Nhược điểm
- ❌ **Rủi ro vượt 100%**: Nếu có nhiều khuyến mãi (50% + 50% + 20% = 120%)
- ❌ Tổn thất doanh thu cao hơn
- ❌ Cần giới hạn số lượng khuyến mãi được phép cộng dồn

#### Phù hợp với
- Chương trình loyalty đơn giản
- Khi chỉ cho phép tối đa 2 khuyến mãi
- Doanh nghiệp ưu tiên trải nghiệm khách hàng

---

### 3.2. Phương pháp 2: Cộng dồn lũy tiến (Multiplicative) ⭐ KHUYẾN NGHỊ

#### Mô tả
Khuyến mãi đầu tiên tính trên **giá trị gốc**, các khuyến mãi tiếp theo tính trên **giá trị còn lại** sau khi đã trừ khuyến mãi trước đó.

#### Công thức
```
Giảm giá 1 = Subtotal × %KM1
Còn lại 1  = Subtotal - Giảm giá 1

Giảm giá 2 = Còn lại 1 × %KM2
Còn lại 2  = Còn lại 1 - Giảm giá 2

... và tiếp tục
```

#### Ví dụ minh họa

| Thông tin đơn hàng | Giá trị |
|--------------------|---------|
| Giá trị đơn hàng (Subtotal) | 1,000,000 VND |
| Giảm giá Tier Vàng (ưu tiên cao) | 10% |
| Mã giảm giá Coupon (ưu tiên thấp) | 5% |

**Cách tính theo thứ tự ưu tiên:**

| Bước | Mô tả | Tính toán | Kết quả |
|------|-------|-----------|---------|
| 1 | Áp dụng Tier 10% | 1,000,000 × 10% | Giảm 100,000 VND |
| 2 | Còn lại sau Tier | 1,000,000 - 100,000 | 900,000 VND |
| 3 | Áp dụng Coupon 5% | 900,000 × 5% | Giảm 45,000 VND |
| 4 | **Tổng giảm giá** | 100,000 + 45,000 | **145,000 VND (14.5%)** |
| 5 | **Khách thanh toán** | 1,000,000 - 145,000 | **855,000 VND** |

#### So sánh với Additive

| Phương pháp | Tổng giảm | % Thực tế | Khách thanh toán |
|-------------|-----------|-----------|------------------|
| Additive | 150,000 | 15.0% | 850,000 |
| **Multiplicative** | 145,000 | 14.5% | 855,000 |
| Chênh lệch | 5,000 | 0.5% | +5,000 |

#### Ưu điểm
- ✅ **Không bao giờ vượt 100%** - An toàn về mặt tài chính
- ✅ Phổ biến trong ngành (Amazon, Shopee, Lazada, Tiki)
- ✅ Công bằng: Khuyến mãi sau không được "miễn phí" trên phần đã giảm
- ✅ Có thể áp dụng nhiều khuyến mãi mà không lo vượt giới hạn

#### Nhược điểm
- ❌ Khó giải thích hơn cho khách hàng
- ❌ Khách hàng có thể cảm thấy không được hưởng "đầy đủ" 5%

#### Phù hợp với
- **E-commerce** (khuyến nghị)
- Hệ thống có nhiều loại khuyến mãi
- Doanh nghiệp cần kiểm soát margin

---

### 3.3. Phương pháp 3: Chọn ưu đãi tốt nhất (Best Price / Exclusive)

#### Mô tả
Hệ thống tự động chọn **một khuyến mãi có giá trị cao nhất** để áp dụng, các khuyến mãi khác không được sử dụng.

#### Công thức
```
Giảm giá = Subtotal × MAX(%KM1, %KM2, %KM3, ...)
```

#### Ví dụ minh họa

| Thông tin đơn hàng | Giá trị |
|--------------------|---------|
| Giá trị đơn hàng (Subtotal) | 1,000,000 VND |
| Giảm giá Tier Vàng | 10% |
| Mã giảm giá Coupon | 5% |

**Cách tính:**
```
So sánh: 10% vs 5% → Chọn 10%

Giảm giá = 1,000,000 × 10% = 100,000 VND
Khách thanh toán = 1,000,000 - 100,000 = 900,000 VND

(Coupon 5% KHÔNG được áp dụng)
```

#### Ưu điểm
- ✅ Đơn giản nhất
- ✅ Kiểm soát chi phí khuyến mãi tốt nhất
- ✅ Dễ giải thích: "Hệ thống tự động chọn ưu đãi tốt nhất cho bạn"

#### Nhược điểm
- ❌ Khách hàng có thể thất vọng khi coupon không được dùng
- ❌ Giảm giá trị cảm nhận của chương trình loyalty
- ❌ Không khuyến khích khách hàng sưu tầm coupon

#### Phù hợp với
- Flash sales, khuyến mãi độc quyền
- Khi muốn đẩy một chương trình cụ thể
- Doanh nghiệp cần kiểm soát margin chặt chẽ

---

## 4. Bảng so sánh tổng hợp

### 4.1. So sánh kết quả (Subtotal = 1,000,000, Tier 10% + Coupon 5%)

| Phương pháp | Công thức | Tổng giảm | % Thực tế | Thanh toán |
|-------------|-----------|-----------|-----------|------------|
| Additive | 10% + 5% | 150,000 | 15.0% | 850,000 |
| **Multiplicative** | 10% + 5%(của 90%) | 145,000 | 14.5% | 855,000 |
| Best Price | max(10%, 5%) | 100,000 | 10.0% | 900,000 |

### 4.2. So sánh đặc điểm

| Tiêu chí | Additive | Multiplicative | Best Price |
|----------|----------|----------------|------------|
| Độ phức tạp | Thấp | Trung bình | Thấp |
| Rủi ro vượt 100% | ⚠️ Có | ✅ Không | ✅ Không |
| Hài lòng khách hàng | Cao | Trung bình | Thấp |
| Kiểm soát margin | Khó | Tốt | Rất tốt |
| Phổ biến trong ngành | Ít | **Rất phổ biến** | Trung bình |
| Phù hợp với | Loyalty đơn giản | E-commerce | Flash sale |

---

## 5. Chính sách áp dụng tại [Tên Công ty]

### 5.1. Phương pháp được chọn

> **Quyết định: Áp dụng phương pháp MULTIPLICATIVE (Cộng dồn lũy tiến)**

### 5.2. Lý do lựa chọn

1. **An toàn tài chính**: Không bao giờ vượt quá 100% giảm giá
2. **Chuẩn ngành**: Phù hợp với thông lệ e-commerce quốc tế
3. **Linh hoạt**: Cho phép áp dụng nhiều loại khuyến mãi
4. **Công bằng**: Khuyến mãi sau tính trên giá trị thực còn lại

### 5.3. Thứ tự ưu tiên áp dụng khuyến mãi

| Thứ tự | Loại khuyến mãi | Ưu tiên | Ghi chú |
|--------|-----------------|---------|---------|
| 1 | Giảm giá theo Tier | 100 | Áp dụng đầu tiên (tự động) |
| 2 | Khuyến mãi tự động (Promotion) | 80 | Áp dụng thứ hai |
| 3 | Mã giảm giá (Coupon) | 50 | Áp dụng thứ ba |
| 4 | **Giảm giá Sales (Sales Discount)** | 30 | Áp dụng cuối cùng (do Saler nhập) |

### 5.4. Quy tắc loại trừ

| Quy tắc | Mô tả |
|---------|-------|
| Tier exclusivity | Mỗi khách hàng chỉ được áp dụng **1 mức tier** (không áp cả Vàng + Bạc) |
| Coupon exclusivity | Mỗi đơn hàng chỉ được sử dụng **1 mã coupon** |
| Stackable flag | Một số khuyến mãi có thể được đánh dấu "không cộng dồn" |
| Sales Discount stackable | Sales Discount **có thể cộng dồn** với các khuyến mãi khác |

### 5.5. Giới hạn giảm giá

| Loại giới hạn | Giá trị | Áp dụng cho |
|---------------|---------|-------------|
| Giảm tối đa mỗi khuyến mãi | Tùy cấu hình | Từng promotion |
| Tổng giảm tối đa | Không vượt subtotal | Toàn bộ đơn hàng |
| Giá trị đơn hàng tối thiểu | Tùy cấu hình | Từng promotion |

---

## 6. Giảm giá do Sales nhập (Sales Discount)

### 6.1. Định nghĩa

**Sales Discount** là khoản giảm giá do nhân viên Sales nhập trực tiếp vào đơn hàng khi tạo đơn. Đây là công cụ linh hoạt để Sales có thể:
- Thương lượng giá với khách hàng
- Xử lý các trường hợp đặc biệt
- Chốt deal nhanh chóng

### 6.2. Cách nhập Sales Discount

Khi tạo đơn hàng, Sales có thể nhập **một trong hai** cách:

| Cách nhập | Mô tả | Ví dụ |
|-----------|-------|-------|
| **Phần trăm (%)** | Nhập % giảm giá trên giá trị còn lại | 5% → Giảm 5% trên giá sau các KM khác |
| **Số tiền cố định (VND)** | Nhập số tiền giảm cụ thể | 100,000 VND → Giảm đúng 100,000 |

### 6.3. Thứ tự áp dụng

```
┌─────────────────────────────────────────────────────────────────┐
│                    THỨ TỰ ÁP DỤNG GIẢM GIÁ                       │
└─────────────────────────────────────────────────────────────────┘

  Subtotal (Giá gốc)
       │
       ▼
  ① Tier Discount (Tự động theo hạng thành viên)
       │
       ▼
  ② Promotion (Khuyến mãi tự động)
       │
       ▼
  ③ Coupon (Mã giảm giá khách nhập)
       │
       ▼
  ④ Sales Discount (Saler nhập) ← CUỐI CÙNG
       │
       ▼
  Giá thanh toán cuối cùng
```

### 6.4. Quy định về quyền hạn

| Vai trò | Quyền hạn | Giới hạn % tối đa | Cần phê duyệt |
|---------|-----------|-------------------|---------------|
| Sales Staff | Nhập Sales Discount | 5% | Không |
| Sales Senior | Nhập Sales Discount | 10% | Không |
| Sales Manager | Nhập Sales Discount | 15% | Không |
| Sales Director | Nhập Sales Discount | 20% | Không |
| Trên 20% | Cần phê duyệt đặc biệt | >20% | ✅ Cần phê duyệt BGĐ |

### 6.5. Ví dụ tính toán với Sales Discount

#### Ví dụ 1: Sales nhập % giảm giá

| Thông tin | Giá trị |
|-----------|---------|
| Giá gốc (Subtotal) | 10,000,000 VND |
| Hạng thành viên | Vàng (10%) |
| Coupon | SALE5 (5%) |
| **Sales Discount** | **3%** |

**Cách tính (Multiplicative):**

| Bước | Mô tả | Tính toán | Kết quả |
|------|-------|-----------|---------|
| 1 | Áp dụng Tier 10% | 10,000,000 × 10% | Giảm 1,000,000 |
| 2 | Còn lại sau Tier | 10,000,000 - 1,000,000 | 9,000,000 |
| 3 | Áp dụng Coupon 5% | 9,000,000 × 5% | Giảm 450,000 |
| 4 | Còn lại sau Coupon | 9,000,000 - 450,000 | 8,550,000 |
| 5 | **Áp dụng Sales 3%** | **8,550,000 × 3%** | **Giảm 256,500** |
| 6 | **Tổng giảm giá** | 1,000,000 + 450,000 + 256,500 | **1,706,500** |
| 7 | **Khách thanh toán** | 10,000,000 - 1,706,500 | **8,293,500** |

**% Giảm thực tế**: 17.065% (không phải 10% + 5% + 3% = 18%)

#### Ví dụ 2: Sales nhập số tiền cố định

| Thông tin | Giá trị |
|-----------|---------|
| Giá gốc (Subtotal) | 5,000,000 VND |
| Hạng thành viên | Bạc (5%) |
| Coupon | Không có |
| **Sales Discount** | **200,000 VND** |

**Cách tính:**

| Bước | Mô tả | Tính toán | Kết quả |
|------|-------|-----------|---------|
| 1 | Áp dụng Tier 5% | 5,000,000 × 5% | Giảm 250,000 |
| 2 | Còn lại sau Tier | 5,000,000 - 250,000 | 4,750,000 |
| 3 | **Áp dụng Sales (cố định)** | **Giảm 200,000** | **Giảm 200,000** |
| 4 | **Tổng giảm giá** | 250,000 + 200,000 | **450,000** |
| 5 | **Khách thanh toán** | 5,000,000 - 450,000 | **4,550,000** |

### 6.6. Quy tắc quan trọng

| # | Quy tắc | Mô tả |
|---|---------|-------|
| 1 | **Không vượt giới hạn** | Sales không được nhập vượt % giới hạn theo cấp bậc |
| 2 | **Không âm tiền** | Tổng giảm giá không được vượt quá giá trị đơn hàng |
| 3 | **Ghi lý do** | Sales **bắt buộc** phải ghi lý do khi áp dụng Sales Discount |
| 4 | **Audit trail** | Hệ thống lưu lại: ai nhập, bao nhiêu, lý do, thời gian |
| 5 | **Không chỉnh sửa** | Sau khi đơn hàng được xác nhận, không được chỉnh sửa Sales Discount |

### 6.7. Lý do hợp lệ cho Sales Discount

| Lý do | Mô tả | Ví dụ |
|-------|-------|-------|
| Khách hàng lớn | Đơn hàng giá trị cao, cần ưu đãi đặc biệt | Đơn > 50 triệu |
| Khách hàng tiềm năng | Khách mới có tiềm năng mua lại | Công ty lớn lần đầu mua |
| Cạnh tranh | Match giá đối thủ | Khách có báo giá đối thủ thấp hơn |
| Thanh toán nhanh | Khách thanh toán trước/ngay | Thanh toán 100% upfront |
| Mua số lượng lớn | Số lượng license/sản phẩm nhiều | Mua > 50 license |
| Gia hạn dài hạn | Khách gia hạn nhiều năm | Gia hạn 3-5 năm |
| Khác | Lý do khác (cần phê duyệt Manager) | Ghi rõ chi tiết |

### 6.8. Hướng dẫn cho Sales

#### Khi nào NÊN dùng Sales Discount

✅ Khi cần chốt deal nhanh với khách hàng tiềm năng
✅ Khi khách hàng có báo giá cạnh tranh từ đối thủ
✅ Khi khách hàng cam kết thanh toán nhanh
✅ Khi khách hàng mua số lượng lớn hoặc gia hạn dài hạn

#### Khi nào KHÔNG NÊN dùng Sales Discount

❌ Khi khách hàng đã có đủ ưu đãi từ Tier + Coupon
❌ Khi không có lý do hợp lệ
❌ Khi vượt quá quyền hạn mà chưa có phê duyệt
❌ Khi margin đơn hàng đã quá thấp

#### Script gợi ý cho Sales

```
TÌNH HUỐNG: Khách hàng yêu cầu giảm giá thêm

"Dạ, em hiểu mong muốn của anh/chị. Hiện tại anh/chị đang được hưởng:
- Ưu đãi thành viên Vàng: 10%
- Mã khuyến mãi: 5%

Em có thể hỗ trợ thêm [X]% nữa với điều kiện [thanh toán nhanh/mua thêm/ký hợp đồng dài hạn].
Như vậy tổng giảm giá sẽ là khoảng [Y]%, anh/chị thấy phù hợp không ạ?"
```

---

## 7. Cách tính thuế (Tax Calculation)

### 7.1. Nguyên tắc chung

> **Quy tắc: Thuế được tính SAU khi áp dụng tất cả các khoản giảm giá**

Điều này có nghĩa là thuế được tính trên **giá trị còn lại** sau khi đã trừ hết các loại khuyến mãi, không phải trên giá gốc.

### 7.2. Thứ tự tính toán đầy đủ

```
┌─────────────────────────────────────────────────────────────────┐
│              THỨ TỰ TÍNH TOÁN ĐƠN HÀNG ĐẦY ĐỦ                    │
└─────────────────────────────────────────────────────────────────┘

  ① Subtotal (Giá gốc = Σ đơn giá × số lượng)
       │
       ▼
  ② Áp dụng Discount (theo thứ tự ưu tiên)
       │  ├─ Tier Discount
       │  ├─ Promotion
       │  ├─ Coupon
       │  └─ Sales Discount
       │
       ▼
  ③ Giá sau giảm (Discounted Amount)
       │
       ▼
  ④ Tính thuế (Tax) = Giá sau giảm × % Thuế
       │
       ▼
  ⑤ Cộng phí (nếu có): Phí vận chuyển, phí dịch vụ...
       │
       ▼
  ⑥ TỔNG THANH TOÁN = Giá sau giảm + Thuế + Phí
```

### 7.3. Công thức tính

```
Subtotal           = Σ (Đơn giá × Số lượng)
Total Discount     = Tier + Promotion + Coupon + Sales Discount (multiplicative)
Discounted Amount  = Subtotal - Total Discount
Tax Amount         = Discounted Amount × Tax Rate
Total              = Discounted Amount + Tax Amount + Fees
```

### 7.4. Các loại thuế phổ biến

| Loại thuế | Tỷ lệ | Áp dụng cho | Ghi chú |
|-----------|-------|-------------|---------|
| VAT (Thuế GTGT) | 10% | Hàng hóa, dịch vụ thông thường | Phổ biến nhất |
| VAT giảm | 8% | Một số mặt hàng theo quy định | Áp dụng theo chính sách |
| VAT 0% | 0% | Xuất khẩu, dịch vụ quốc tế | Có hóa đơn đặc biệt |
| Miễn thuế | 0% | Sản phẩm miễn VAT | Phần mềm nội địa (tùy trường hợp) |

### 7.5. Ví dụ tính thuế đầy đủ

#### Ví dụ 1: Đơn hàng có VAT 10%

| Thông tin | Giá trị |
|-----------|---------|
| Giá gốc (Subtotal) | 10,000,000 VND |
| Tier Vàng | 10% |
| Coupon | 5% |
| Sales Discount | 3% |
| **Thuế VAT** | **10%** |

**Cách tính:**

| Bước | Mô tả | Tính toán | Kết quả |
|------|-------|-----------|---------|
| 1 | Subtotal | - | 10,000,000 |
| 2 | Áp dụng Tier 10% | 10,000,000 × 10% | Giảm 1,000,000 |
| 3 | Còn lại | 10,000,000 - 1,000,000 | 9,000,000 |
| 4 | Áp dụng Coupon 5% | 9,000,000 × 5% | Giảm 450,000 |
| 5 | Còn lại | 9,000,000 - 450,000 | 8,550,000 |
| 6 | Áp dụng Sales 3% | 8,550,000 × 3% | Giảm 256,500 |
| 7 | **Giá sau giảm** | 8,550,000 - 256,500 | **8,293,500** |
| 8 | **Tính VAT 10%** | **8,293,500 × 10%** | **829,350** |
| 9 | **TỔNG THANH TOÁN** | 8,293,500 + 829,350 | **9,122,850** |

**Tóm tắt hóa đơn:**
```
┌────────────────────────────────────────────┐
│              HÓA ĐƠN BÁN HÀNG              │
├────────────────────────────────────────────┤
│ Giá gốc (Subtotal):         10,000,000 VND │
│ ─────────────────────────────────────────  │
│ Giảm giá Tier Vàng (10%):   -1,000,000 VND │
│ Giảm giá Coupon (5%):         -450,000 VND │
│ Giảm giá Sales (3%):          -256,500 VND │
│ ─────────────────────────────────────────  │
│ Tổng giảm giá:              -1,706,500 VND │
│ ─────────────────────────────────────────  │
│ Giá sau giảm:                8,293,500 VND │
│ VAT (10%):                     829,350 VND │
│ ═══════════════════════════════════════════│
│ TỔNG THANH TOÁN:             9,122,850 VND │
└────────────────────────────────────────────┘
```

#### Ví dụ 2: So sánh thuế tính trên giá gốc vs giá sau giảm

| Cách tính | Công thức | Thuế VAT | Tổng thanh toán |
|-----------|-----------|----------|-----------------|
| ❌ SAI: Thuế trên giá gốc | 10,000,000 × 10% | 1,000,000 | 9,293,500 |
| ✅ ĐÚNG: Thuế trên giá sau giảm | 8,293,500 × 10% | 829,350 | 9,122,850 |
| **Chênh lệch** | | **170,650** | **170,650** |

> **Lưu ý**: Tính thuế trên giá sau giảm giúp khách hàng tiết kiệm được khoản thuế tương ứng với phần giảm giá.

### 7.6. Quy tắc hiển thị trên hóa đơn

| # | Quy tắc | Mô tả |
|---|---------|-------|
| 1 | **Tách biệt giảm giá và thuế** | Hiển thị rõ từng khoản giảm giá, sau đó mới hiển thị thuế |
| 2 | **Ghi rõ cơ sở tính thuế** | Ghi "VAT 10% (trên 8,293,500)" để khách hiểu |
| 3 | **Làm tròn theo quy định** | Thuế được làm tròn theo quy định kế toán |
| 4 | **Tuân thủ pháp luật** | Hóa đơn đỏ phải tuân thủ quy định của Tổng cục Thuế |

### 7.7. Bảng tra cứu nhanh - Thuế VAT 10%

| Giá sau giảm | VAT 10% | Tổng thanh toán |
|--------------|---------|-----------------|
| 500,000 | 50,000 | 550,000 |
| 1,000,000 | 100,000 | 1,100,000 |
| 2,000,000 | 200,000 | 2,200,000 |
| 5,000,000 | 500,000 | 5,500,000 |
| 8,293,500 | 829,350 | 9,122,850 |
| 10,000,000 | 1,000,000 | 11,000,000 |

---

## 8. Hướng dẫn giải thích cho khách hàng

### 8.1. Câu hỏi thường gặp

#### Q: "Tại sao 10% + 5% không bằng 15%?"

**Trả lời:**
> "Dạ, hệ thống của chúng tôi áp dụng giảm giá theo thứ tự ưu tiên. Giảm giá thành viên Vàng 10% được áp dụng trước, sau đó mã giảm giá 5% được tính trên số tiền còn lại. Cách tính này giúp anh/chị luôn được hưởng ưu đãi thành viên trước, rồi mới áp dụng thêm coupon."

#### Q: "Sao giảm giá của tôi ít hơn dự kiến?"

**Trả lời:**
> "Dạ, để em giải thích chi tiết ạ:
> - Đơn hàng của anh/chị là 1,000,000đ
> - Giảm giá Vàng 10%: 100,000đ → còn 900,000đ
> - Mã giảm giá 5%: 45,000đ (tính trên 900,000đ)
> - Tổng giảm: 145,000đ
>
> Đây là cách tính chuẩn được áp dụng bởi các sàn thương mại điện tử lớn như Shopee, Lazada ạ."

#### Q: "Tôi muốn được giảm đúng 15% thì sao?"

**Trả lời:**
> "Dạ, với cách tính hiện tại, anh/chị đang được giảm 14.5%. Nếu anh/chị muốn tối ưu hơn, em có thể gợi ý:
> - Nâng hạng lên Kim Cương (15%) để được giảm nhiều hơn
> - Hoặc sử dụng mã giảm giá có giá trị cao hơn trong các đợt khuyến mãi đặc biệt ạ."

### 7.2. Script cho Customer Service

```
BƯỚC 1: Xác nhận thông tin đơn hàng
"Em xin xác nhận lại đơn hàng của anh/chị:
- Giá trị đơn hàng: [X] VND
- Hạng thành viên: [Tier]
- Mã giảm giá: [Coupon code]"

BƯỚC 2: Giải thích cách tính
"Với thông tin trên, hệ thống tính như sau:
- Giảm giá [Tier] [X]%: [Y] VND
- Giá sau giảm Tier: [Z] VND
- Giảm giá Coupon [A]%: [B] VND (tính trên [Z] VND)
- Tổng giảm: [Y + B] VND"

BƯỚC 3: Giải thích lý do
"Cách tính này đảm bảo anh/chị luôn được hưởng quyền lợi thành viên
trước tiên, sau đó mới áp dụng thêm các ưu đãi khác. Đây cũng là
cách tính tiêu chuẩn được các sàn thương mại điện tử lớn áp dụng ạ."
```

---

## 9. Ví dụ thực tế

### 9.1. Ví dụ 1: Khách hàng Vàng dùng coupon

| Thông tin | Giá trị |
|-----------|---------|
| Sản phẩm | Gói phần mềm Premium |
| Giá gốc | 2,000,000 VND |
| Hạng thành viên | Vàng (10%) |
| Mã coupon | SALE5 (5%) |

**Tính toán:**
```
Bước 1: Áp dụng Tier Vàng 10%
  Giảm = 2,000,000 × 10% = 200,000 VND
  Còn lại = 2,000,000 - 200,000 = 1,800,000 VND

Bước 2: Áp dụng Coupon 5%
  Giảm = 1,800,000 × 5% = 90,000 VND
  Còn lại = 1,800,000 - 90,000 = 1,710,000 VND

Kết quả:
  Tổng giảm = 200,000 + 90,000 = 290,000 VND (14.5%)
  Khách thanh toán = 1,710,000 VND
```

### 9.2. Ví dụ 2: Khách hàng Kim Cương dùng coupon lớn

| Thông tin | Giá trị |
|-----------|---------|
| Sản phẩm | Gói Enterprise |
| Giá gốc | 10,000,000 VND |
| Hạng thành viên | Kim Cương (15%) |
| Mã coupon | VIP20 (20%) |

**Tính toán:**
```
Bước 1: Áp dụng Tier Kim Cương 15%
  Giảm = 10,000,000 × 15% = 1,500,000 VND
  Còn lại = 10,000,000 - 1,500,000 = 8,500,000 VND

Bước 2: Áp dụng Coupon 20%
  Giảm = 8,500,000 × 20% = 1,700,000 VND
  Còn lại = 8,500,000 - 1,700,000 = 6,800,000 VND

Kết quả:
  Tổng giảm = 1,500,000 + 1,700,000 = 3,200,000 VND (32%)
  Khách thanh toán = 6,800,000 VND

So sánh với Additive:
  Additive = 15% + 20% = 35% = 3,500,000 VND
  Multiplicative = 32% = 3,200,000 VND
  Chênh lệch = 300,000 VND
```

### 9.3. Ví dụ 3: Chứng minh không vượt 100%

| Thông tin | Giá trị |
|-----------|---------|
| Giá gốc | 1,000,000 VND |
| Khuyến mãi 1 | 50% |
| Khuyến mãi 2 | 50% |
| Khuyến mãi 3 | 50% |

**So sánh:**
```
ADDITIVE (Nguy hiểm):
  50% + 50% + 50% = 150% → ÂM TIỀN! ❌

MULTIPLICATIVE (An toàn):
  Sau KM1: 1,000,000 × 50% = 500,000 còn lại
  Sau KM2: 500,000 × 50% = 250,000 còn lại
  Sau KM3: 250,000 × 50% = 125,000 còn lại

  Tổng giảm = 875,000 VND (87.5%)
  Khách thanh toán = 125,000 VND ✅
```

---

## 10. Phụ lục

### 10.1. Bảng tra cứu nhanh - Tier 10% + Coupon

| Giá trị đơn | Giảm Tier 10% | Còn lại | Giảm Coupon 5% | Tổng giảm | Thanh toán |
|-------------|---------------|---------|----------------|-----------|------------|
| 500,000 | 50,000 | 450,000 | 22,500 | 72,500 | 427,500 |
| 1,000,000 | 100,000 | 900,000 | 45,000 | 145,000 | 855,000 |
| 2,000,000 | 200,000 | 1,800,000 | 90,000 | 290,000 | 1,710,000 |
| 5,000,000 | 500,000 | 4,500,000 | 225,000 | 725,000 | 4,275,000 |
| 10,000,000 | 1,000,000 | 9,000,000 | 450,000 | 1,450,000 | 8,550,000 |

### 10.2. Bảng tra cứu nhanh - Tier 15% + Coupon

| Giá trị đơn | Giảm Tier 15% | Còn lại | Giảm Coupon 5% | Tổng giảm | Thanh toán |
|-------------|---------------|---------|----------------|-----------|------------|
| 500,000 | 75,000 | 425,000 | 21,250 | 96,250 | 403,750 |
| 1,000,000 | 150,000 | 850,000 | 42,500 | 192,500 | 807,500 |
| 2,000,000 | 300,000 | 1,700,000 | 85,000 | 385,000 | 1,615,000 |
| 5,000,000 | 750,000 | 4,250,000 | 212,500 | 962,500 | 4,037,500 |
| 10,000,000 | 1,500,000 | 8,500,000 | 425,000 | 1,925,000 | 8,075,000 |

### 10.3. Bảng tra cứu nhanh - Tier 10% + Coupon 5% + Sales Discount

| Giá trị đơn | Sau Tier 10% | Sau Coupon 5% | Sales 3% | Tổng giảm | Thanh toán |
|-------------|--------------|---------------|----------|-----------|------------|
| 1,000,000 | 900,000 | 855,000 | 25,650 | 170,650 | 829,350 |
| 2,000,000 | 1,800,000 | 1,710,000 | 51,300 | 341,300 | 1,658,700 |
| 5,000,000 | 4,500,000 | 4,275,000 | 128,250 | 853,250 | 4,146,750 |
| 10,000,000 | 9,000,000 | 8,550,000 | 256,500 | 1,706,500 | 8,293,500 |
| 20,000,000 | 18,000,000 | 17,100,000 | 513,000 | 3,413,000 | 16,587,000 |

### 10.4. Bảng tra cứu nhanh - Sales Discount cố định

| Giá trị đơn | Tier 10% | Còn lại | Sales (cố định) | Tổng giảm | Thanh toán |
|-------------|----------|---------|-----------------|-----------|------------|
| 2,000,000 | 200,000 | 1,800,000 | 100,000 | 300,000 | 1,700,000 |
| 5,000,000 | 500,000 | 4,500,000 | 200,000 | 700,000 | 4,300,000 |
| 10,000,000 | 1,000,000 | 9,000,000 | 500,000 | 1,500,000 | 8,500,000 |
| 20,000,000 | 2,000,000 | 18,000,000 | 1,000,000 | 3,000,000 | 17,000,000 |

---

## 11. Lịch sử thay đổi

| Phiên bản | Ngày | Người thay đổi | Nội dung |
|-----------|------|----------------|----------|
| 1.0 | 2026-01-19 | [Tên] | Tạo mới tài liệu |
| 1.1 | 2026-01-19 | [Tên] | Thêm Section 6: Sales Discount - giảm giá do Sales nhập khi tạo đơn |
| 1.2 | 2026-01-19 | [Tên] | Thêm Section 7: Cách tính thuế (Tax Calculation) - công thức, ví dụ, bảng tra cứu |

---

## 12. Phê duyệt

| Phòng ban | Người phê duyệt | Chữ ký | Ngày |
|-----------|-----------------|--------|------|
| Marketing | | | |
| Sales | | | |
| Finance | | | |
| Customer Service | | | |
| IT | | | |
| Ban Giám đốc | | | |

---

*Tài liệu này là tài sản nội bộ của công ty. Vui lòng không chia sẻ ra bên ngoài.*
