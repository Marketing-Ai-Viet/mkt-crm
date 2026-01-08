# Hướng dẫn sử dụng Combo và Khuyến mãi

> **Tài liệu dành cho:** Phòng Kinh doanh, Marketing, Kế toán, CSKH  
> **Cập nhật:** Tháng 1/2026

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [COMBO - Gói sản phẩm](#2-combo---gói-sản-phẩm)
3. [KHUYẾN MÃI - Promotion](#3-khuyến-mãi---promotion)
4. [So sánh Combo vs Khuyến mãi](#4-so-sánh-combo-vs-khuyến-mãi)
5. [Hướng dẫn theo phòng ban](#5-hướng-dẫn-theo-phòng-ban)
6. [Các tình huống thường gặp](#6-các-tình-huống-thường-gặp)
7. [Câu hỏi thường gặp (FAQ)](#7-câu-hỏi-thường-gặp-faq)

---

## 1. Giới thiệu

Hệ thống CRM hỗ trợ **2 cơ chế ưu đãi** chính:

| Cơ chế | Mục đích | Ví dụ |
|--------|----------|-------|
| **COMBO** | Bán nhiều sản phẩm/dịch vụ cùng nhau với giá ưu đãi | "Gói Office Suite" bao gồm Word + Excel + PowerPoint |
| **KHUYẾN MÃI** | Giảm giá cho đơn hàng dựa trên điều kiện | "Giảm 20% cho đơn từ 1 triệu" |

### Khi nào dùng gì?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BẠN MUỐN LÀM GÌ?                                     │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│ Bán nhiều sản phẩm    │       │ Giảm giá cho          │
│ thành 1 gói?          │       │ đơn hàng?             │
└───────────┬───────────┘       └───────────┬───────────┘
            │                               │
            ▼                               ▼
      ╔═══════════╗                  ╔═══════════════╗
      ║   COMBO   ║                  ║  KHUYẾN MÃI   ║
      ╚═══════════╝                  ╚═══════════════╝
```

---

## 2. COMBO - Gói sản phẩm

### 2.1 Combo là gì?

**Combo** là một gói bao gồm nhiều sản phẩm/dịch vụ được bán cùng nhau. Khách hàng mua cả gói thay vì mua từng sản phẩm riêng lẻ.

### 2.2 Thông tin cơ bản của Combo

| Thông tin | Bắt buộc | Mô tả | Ví dụ |
|-----------|----------|-------|-------|
| **Mã Combo** | ✅ | Mã duy nhất để quản lý | `OFFICE-SUITE-2024` |
| **Tên Combo** | ✅ | Tên hiển thị cho khách | `Gói Office Suite Pro` |
| **Mô tả** | ❌ | Chi tiết nội dung combo | `Bao gồm Word, Excel, PowerPoint...` |
| **Loại giá** | ✅ | Cách tính giá combo | Xem bên dưới |
| **Trạng thái** | ✅ | Đang hoạt động hay không | Bật/Tắt |
| **Thời hạn** | ❌ | Khoảng thời gian hiệu lực | 01/01/2024 - 31/12/2024 |

### 2.3 Ba cách tính giá Combo

#### 🔵 Giá cố định (FIXED)

> **Bán combo với một mức giá cố định, không phụ thuộc giá từng sản phẩm**

**Cách thiết lập:**
- Chọn loại giá: `Giá cố định`
- Nhập giá bán: `1.500.000đ`

**Ví dụ:**

| Sản phẩm trong combo | Giá lẻ |
|---------------------|--------|
| Phần mềm A | 800.000đ |
| Phần mềm B | 500.000đ |
| Dịch vụ hỗ trợ | 300.000đ |
| **Tổng giá lẻ** | **1.600.000đ** |
| **Giá combo (cố định)** | **1.500.000đ** |
| **Khách tiết kiệm** | **100.000đ (6.25%)** |

**Khi nào dùng?**
- Muốn có giá bán "tròn", dễ nhớ
- Không muốn giá combo thay đổi khi giá sản phẩm thay đổi
- Muốn kiểm soát margin cố định

---

#### 🟠 Giảm theo phần trăm (DISCOUNT)

> **Tổng giá các sản phẩm, sau đó giảm theo %**

**Cách thiết lập:**
- Chọn loại giá: `Giảm theo %`
- Nhập % giảm: `20%`

**Ví dụ:**

| Sản phẩm trong combo | Giá lẻ |
|---------------------|--------|
| Phần mềm A | 800.000đ |
| Phần mềm B | 500.000đ |
| Dịch vụ hỗ trợ | 300.000đ |
| **Tổng giá lẻ** | **1.600.000đ** |
| **Giảm 20%** | **-320.000đ** |
| **Giá combo** | **1.280.000đ** |

**Khi nào dùng?**
- Muốn % tiết kiệm rõ ràng để marketing
- Giá combo tự động cập nhật khi giá sản phẩm thay đổi
- Phù hợp cho các chương trình "Mua combo tiết kiệm X%"

---

#### 🟢 Tổng giá (SUM)

> **Không giảm giá, chỉ gộp sản phẩm lại để tiện mua**

**Cách thiết lập:**
- Chọn loại giá: `Tổng giá`
- Không cần nhập thêm

**Ví dụ:**

| Sản phẩm trong combo | Giá lẻ |
|---------------------|--------|
| Phần mềm A | 800.000đ |
| Phần mềm B | 500.000đ |
| Dịch vụ hỗ trợ | 300.000đ |
| **Giá combo = Tổng giá lẻ** | **1.600.000đ** |

**Khi nào dùng?**
- Chỉ muốn gộp sản phẩm để khách dễ mua
- Combo "gợi ý" các sản phẩm hay mua cùng nhau
- Không có ưu đãi về giá

---

### 2.4 Các loại sản phẩm trong Combo

Combo có thể chứa các loại sau:

| Loại | Mô tả | Ví dụ |
|------|-------|-------|
| 📦 **Sản phẩm số** | License phần mềm từ hệ thống | MKT Auto, MKT Data |
| 🔧 **Dịch vụ** | Dịch vụ đi kèm | Cài đặt, Hỗ trợ kỹ thuật, Training |
| 📝 **Tùy chỉnh** | Item đặc biệt | Quà tặng, Voucher |

### 2.5 Thời hạn hiệu lực Combo

| Trường hợp | Kết quả |
|------------|---------|
| Không đặt ngày bắt đầu/kết thúc | Combo có hiệu lực vĩnh viễn |
| Đặt ngày bắt đầu | Combo chỉ hiệu lực từ ngày đó |
| Đặt ngày kết thúc | Combo tự động ngừng bán sau ngày đó |
| Tắt trạng thái "Hoạt động" | Combo không hiển thị cho khách |

### 2.6 Ví dụ thực tế

#### Combo "Gói khởi nghiệp 2024"

```
┌─────────────────────────────────────────────────────────────────┐
│  🎁 GÓI KHỞI NGHIỆP 2024                                        │
│     Mã: STARTUP-PACK-2024                                        │
├─────────────────────────────────────────────────────────────────┤
│  Sản phẩm bao gồm:                                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📦 MKT Auto Pro (1 năm)              800.000đ               │ │
│  │ 📦 MKT Data Basic (1 năm)            500.000đ               │ │
│  │ 🔧 Cài đặt & Hướng dẫn               200.000đ               │ │
│  │ 🔧 Hỗ trợ kỹ thuật ưu tiên (1 năm)   300.000đ               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Tổng giá lẻ:                          1.800.000đ               │
│  ─────────────────────────────────────────────────              │
│  💰 GIÁ COMBO:                         1.500.000đ               │
│  ✨ TIẾT KIỆM:                           300.000đ (17%)         │
│                                                                   │
│  📅 Hiệu lực: 01/01/2024 - 30/06/2024                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. KHUYẾN MÃI - Promotion

### 3.1 Khuyến mãi là gì?

**Khuyến mãi (Promotion)** là chương trình giảm giá áp dụng cho đơn hàng khi thỏa mãn các điều kiện nhất định.

### 3.2 Thông tin cơ bản của Khuyến mãi

| Thông tin | Bắt buộc | Mô tả |
|-----------|----------|-------|
| **Tên** | ✅ | Tên chương trình khuyến mãi |
| **Mã** | ✅ | Mã duy nhất (dùng để quản lý, không phải mã coupon) |
| **Loại giảm** | ✅ | Giảm %, giảm tiền, mua X tặng Y... |
| **Giá trị giảm** | ✅ | 20% hoặc 100.000đ... |
| **Giảm tối đa** | ❌ | Giới hạn số tiền giảm (cho giảm %) |
| **Đơn tối thiểu** | ❌ | Giá trị đơn hàng tối thiểu |
| **Thời gian** | ✅ | Ngày bắt đầu - kết thúc |
| **Số lượt dùng** | ❌ | Giới hạn tổng số lần sử dụng |
| **Lượt/khách** | ❌ | Giới hạn mỗi khách dùng bao nhiêu lần |

### 3.3 Bốn loại Khuyến mãi

#### 🔵 Giảm theo % (PERCENTAGE)

> **Giảm X% trên giá trị đơn hàng**

**Thiết lập:**
- Loại: `Giảm theo %`
- Giá trị: `20` (tức 20%)
- Giảm tối đa: `100.000đ` (không bắt buộc)
- Đơn tối thiểu: `200.000đ` (không bắt buộc)

**Cách tính:**

| Giá trị đơn | Tính toán | Thực giảm |
|-------------|-----------|-----------|
| 300.000đ | 300.000 × 20% = 60.000đ | 60.000đ |
| 500.000đ | 500.000 × 20% = 100.000đ | 100.000đ |
| 800.000đ | 800.000 × 20% = 160.000đ | 100.000đ *(chạm giảm tối đa)* |
| 150.000đ | Đơn < 200.000đ | **Không đủ điều kiện** |

---

#### 🟢 Giảm số tiền cố định (FIXED_AMOUNT)

> **Giảm trực tiếp một số tiền cố định**

**Thiết lập:**
- Loại: `Giảm tiền cố định`
- Giá trị: `50.000` (tức giảm 50.000đ)
- Đơn tối thiểu: `300.000đ`

**Cách tính:**

| Giá trị đơn | Thực giảm |
|-------------|-----------|
| 500.000đ | 50.000đ |
| 300.000đ | 50.000đ |
| 250.000đ | **Không đủ điều kiện** (đơn < 300k) |

---

#### 🟠 Mua X tặng Y (BUY_X_GET_Y)

> **Mua đủ số lượng sản phẩm A, được tặng/giảm giá sản phẩm B**

**Thiết lập:**
- Loại: `Mua X tặng Y`
- Mua: `2` sản phẩm A
- Tặng: `1` sản phẩm B
- Giảm giá sản phẩm tặng: `100%` (miễn phí) hoặc `50%` (giảm nửa giá)

**Ví dụ: Mua 2 MKT Auto, tặng 1 MKT Data**

| Giỏ hàng | Kết quả |
|----------|---------|
| 2 MKT Auto + 1 MKT Data | MKT Data miễn phí |
| 1 MKT Auto + 1 MKT Data | **Không đủ điều kiện** (chưa đủ 2 MKT Auto) |
| 4 MKT Auto + 2 MKT Data | 2 MKT Data miễn phí *(áp dụng 2 lần)* |

---

#### 🟣 Miễn phí vận chuyển (FREE_SHIPPING)

> **Miễn phí phí ship cho đơn hàng**

**Thiết lập:**
- Loại: `Miễn phí ship`
- Đơn tối thiểu: `500.000đ`

*Lưu ý: Loại này chỉ miễn phí ship, không giảm giá sản phẩm*

---

### 3.4 Điều kiện áp dụng (Rules)

Khuyến mãi có thể đặt nhiều điều kiện:

| Điều kiện | Mô tả | Ví dụ |
|-----------|-------|-------|
| **Sản phẩm** | Chỉ áp dụng cho sản phẩm cụ thể | Chỉ MKT Auto Pro |
| **Danh mục** | Chỉ áp dụng cho danh mục | Chỉ phần mềm Marketing |
| **Giá trị đơn** | Đơn hàng phải đạt giá trị | Đơn từ 1 triệu |
| **Tag khách** | Chỉ khách hàng có tag | Khách VIP, Khách thân thiết |
| **Đơn đầu tiên** | Chỉ cho đơn hàng đầu tiên | Khách mới lần đầu mua |
| **Số lượng** | Mua đủ số lượng | Mua từ 3 sản phẩm |

**Ví dụ kết hợp điều kiện:**
```
Khuyến mãi "VIP tháng 1":
├── Điều kiện 1: Khách có tag "VIP" (BẮT BUỘC)
├── Điều kiện 2: Đơn hàng từ 1.000.000đ (BẮT BUỘC)
└── Điều kiện 3: Sản phẩm thuộc danh mục "Phần mềm" (BẮT BUỘC)

→ Chỉ khi thỏa MÃN TẤT CẢ 3 điều kiện mới được giảm
```

### 3.5 Mã Coupon

**Coupon** là mã khách hàng nhập để sử dụng khuyến mãi.

| Loại Coupon | Mô tả | Ví dụ |
|-------------|-------|-------|
| **Coupon chung** | Ai cũng dùng được | `SUMMER2024` |
| **Coupon riêng** | Gán cho 1 khách cụ thể | `VIP-NGUYEN123` |
| **Coupon 1 lần** | Dùng 1 lần rồi hết | `GIFT-A1B2C3` |
| **Coupon nhiều lần** | Dùng được nhiều lần | `DISCOUNT10` (giới hạn 1000 lượt) |

**Vòng đời Coupon:**

```
   [ACTIVE]  ──────┬──────► [USED]      (đã dùng hết lượt)
      │            │
      │            └──────► [EXPIRED]   (hết hạn)
      │
      └───────────────────► [DISABLED]  (bị vô hiệu hóa)
```

### 3.6 Tự động áp dụng vs Cần nhập mã

| Chế độ | Hoạt động | Khi nào dùng |
|--------|-----------|--------------|
| **Tự động** | Hệ thống tự áp dụng nếu đủ điều kiện | Khuyến mãi mùa, flash sale |
| **Cần mã** | Khách phải nhập mã coupon | Khuyến mãi VIP, referral |

### 3.7 Kết hợp nhiều khuyến mãi (Stacking)

Một số khuyến mãi có thể **kết hợp** với nhau:

| KM A | KM B | Kết quả |
|------|------|---------|
| Kết hợp được ✅ | Kết hợp được ✅ | Cả 2 áp dụng |
| Kết hợp được ✅ | Không kết hợp ❌ | Chỉ 1 (ưu tiên cao hơn) |
| Không kết hợp ❌ | Không kết hợp ❌ | Chỉ 1 (ưu tiên cao nhất) |

**Thứ tự ưu tiên:**
- Khuyến mãi có độ ưu tiên cao → áp dụng trước
- Khuyến mãi "không kết hợp được" → chặn các KM sau

---

## 4. So sánh Combo vs Khuyến mãi

| Tiêu chí | COMBO | KHUYẾN MÃI |
|----------|-------|------------|
| **Mục đích** | Bán gói sản phẩm | Giảm giá đơn hàng |
| **Áp dụng khi** | Khách chọn mua combo | Đủ điều kiện + nhập mã (nếu cần) |
| **Giảm giá** | Tính vào giá combo | Tính trên tổng đơn |
| **Sản phẩm** | Cố định trong combo | Linh hoạt theo điều kiện |
| **Kết hợp** | Có thể dùng chung với KM | Có thể dùng chung với Combo |
| **Quản lý** | Marketing/Sales | Marketing |

### Kết hợp Combo + Khuyến mãi

```
Ví dụ: Khách mua Combo "Gói khởi nghiệp" + có mã giảm "VIP10"

Combo "Gói khởi nghiệp":
├── Giá lẻ: 1.800.000đ
└── Giá combo: 1.500.000đ (giảm 300k)

Khuyến mãi "VIP10": Giảm 10%, tối đa 200k

Tính toán:
├── Subtotal = 1.500.000đ (giá combo)
├── KM VIP10 = 1.500.000 × 10% = 150.000đ
└── TỔNG THANH TOÁN = 1.350.000đ

Khách tiết kiệm:
├── Từ Combo: 300.000đ
├── Từ KM:    150.000đ
└── TỔNG:     450.000đ (25% so với giá lẻ)
```

---

## 5. Hướng dẫn theo phòng ban

### 5.1 Phòng Kinh doanh (Sales)

#### Khi tư vấn khách hàng:

✅ **Nên làm:**
- Giới thiệu Combo phù hợp nhu cầu khách
- Kiểm tra khách có đủ điều kiện KM không (VIP, đơn đầu...)
- Thông báo thời hạn KM để khách quyết định nhanh

❌ **Không nên:**
- Hứa giảm giá khi chưa kiểm tra hệ thống
- Tạo mã coupon tùy tiện (cần qua Marketing)

#### Quy trình bán hàng với Combo:

```
1. Xác định nhu cầu khách
        ↓
2. Tìm Combo phù hợp trong hệ thống
        ↓
3. Giải thích ưu đãi (tiết kiệm bao nhiêu)
        ↓
4. Kiểm tra KM áp dụng thêm được không
        ↓
5. Tạo đơn hàng với Combo + KM (nếu có)
        ↓
6. Xác nhận tổng tiền với khách
```

---

### 5.2 Phòng Marketing

#### Tạo Combo mới:

1. **Xác định mục tiêu**: Tăng doanh số? Xả hàng? Ra mắt SP mới?
2. **Chọn sản phẩm**: Sản phẩm nào nên gộp cùng nhau?
3. **Chọn loại giá**: FIXED / DISCOUNT / SUM
4. **Đặt thời hạn**: Chạy trong bao lâu?
5. **Phối hợp Sales**: Thông báo về combo mới

#### Tạo Khuyến mãi mới:

1. **Xác định đối tượng**: Ai được hưởng? (tất cả, VIP, khách mới...)
2. **Chọn loại giảm**: % / Tiền / Mua X tặng Y
3. **Đặt điều kiện**: Đơn tối thiểu? Sản phẩm áp dụng?
4. **Tạo coupon**: Cần mã hay tự động áp dụng?
5. **Đặt giới hạn**: Tổng lượt? Mỗi khách bao nhiêu lượt?

#### Báo cáo cần theo dõi:

| Báo cáo | Mô tả |
|---------|-------|
| Combo bán chạy | Top combo theo doanh số |
| Hiệu quả KM | Số lần dùng, tổng giảm giá |
| Coupon usage | Mã nào được dùng nhiều |

---

### 5.3 Phòng Kế toán

#### Ghi nhận doanh thu:

| Mục | Giá trị | Ghi chú |
|-----|---------|---------|
| Doanh thu gộp | Giá gốc sản phẩm | Trước mọi giảm giá |
| Giảm giá Combo | Chênh lệch giá combo | Ghi nhận riêng |
| Giảm giá KM | Số tiền KM giảm | Ghi nhận riêng |
| Doanh thu thuần | Khách thực trả | Sau tất cả giảm giá |

#### Ví dụ hạch toán:

```
Đơn hàng #12345:
├── Combo "Gói khởi nghiệp": 1.500.000đ (giá lẻ 1.800.000đ)
├── KM "VIP10": -150.000đ
└── Khách thanh toán: 1.350.000đ

Hạch toán:
├── Doanh thu gộp:      1.800.000đ
├── Chiết khấu Combo:    -300.000đ
├── Chiết khấu KM:       -150.000đ
└── Doanh thu thuần:    1.350.000đ
```

#### Đối chiếu cuối kỳ:

- Tổng giảm giá Combo = Σ (Giá lẻ - Giá combo) × Số lượng bán
- Tổng giảm giá KM = Σ Giá trị KM đã áp dụng
- Kiểm tra với báo cáo MktPromotionUsage

---

### 5.4 Phòng Chăm sóc Khách hàng (CSKH)

#### Xử lý thắc mắc về giá:

**Khách hỏi: "Sao giá khác với trên web?"**

Kiểm tra:
1. Khách có chọn đúng Combo không?
2. Combo có đang trong thời hạn hiệu lực không?
3. Có KM nào đang áp dụng thêm không?

**Khách hỏi: "Mã giảm giá không hoạt động"**

Kiểm tra:
1. Mã có đúng chính tả không?
2. Mã còn trong thời hạn không?
3. Mã đã hết lượt sử dụng chưa?
4. Đơn hàng có đủ điều kiện không? (giá trị tối thiểu, sản phẩm áp dụng...)
5. Mã có gán cho khách này không? (coupon riêng)

#### Xử lý hoàn tiền khi có KM:

```
Đơn hàng gốc:
├── Subtotal: 1.000.000đ
├── KM giảm:   -100.000đ
└── Đã trả:     900.000đ

Hoàn tiền:
├── Hoàn theo giá đã trả: 900.000đ
└── KM đã dùng: ghi nhận để không dùng lại (nếu coupon 1 lần)
```

---

## 6. Các tình huống thường gặp

### Tình huống 1: Khách muốn thay đổi sản phẩm trong Combo

> **Câu hỏi:** Khách mua Combo nhưng muốn đổi 1 sản phẩm trong đó

**Trả lời:** Combo là gói cố định, không thể thay đổi sản phẩm. Khách có thể:
- Mua Combo + mua thêm sản phẩm khác riêng
- Mua từng sản phẩm riêng lẻ (không được giá combo)

---

### Tình huống 2: Combo hết hạn giữa chừng

> **Câu hỏi:** Khách đang tạo đơn thì Combo hết hạn

**Trả lời:** 
- Nếu đơn hàng đã được xác nhận → giữ nguyên giá combo
- Nếu đơn hàng chưa xác nhận → không còn được giá combo

---

### Tình huống 3: Dùng nhiều mã coupon

> **Câu hỏi:** Khách muốn dùng 2 mã coupon cho 1 đơn

**Trả lời:** Tùy thuộc vào cấu hình:
- Nếu cả 2 KM đều "Kết hợp được" → áp dụng cả 2
- Nếu 1 trong 2 "Không kết hợp được" → chỉ dùng được 1 mã (ưu tiên cao hơn)

---

### Tình huống 4: Khách VIP không được giảm giá

> **Câu hỏi:** Khách nói mình là VIP nhưng không nhận được KM VIP

**Kiểm tra:**
1. Khách có tag "VIP" trong hệ thống chưa?
2. KM VIP có đang ACTIVE không?
3. Đơn hàng có đủ điều kiện khác không? (giá trị tối thiểu...)

---

## 7. Câu hỏi thường gặp (FAQ)

### Về Combo

**Q: Combo có thể chứa combo khác không?**  
A: Không. Combo chỉ chứa sản phẩm/dịch vụ đơn lẻ.

**Q: Giá combo có tự động thay đổi khi giá sản phẩm thay đổi không?**  
A: Tùy loại giá:
- FIXED: Không thay đổi
- DISCOUNT/SUM: Tự động cập nhật

**Q: Khách mua 2 combo giống nhau có được giảm thêm không?**  
A: Mỗi combo tính riêng. Có thể áp dụng thêm KM nếu đủ điều kiện.

---

### Về Khuyến mãi

**Q: KM tự động có cần nhập mã không?**  
A: Không. Hệ thống tự áp dụng nếu đủ điều kiện.

**Q: Có thể tạm dừng KM không?**  
A: Có. Chuyển trạng thái sang PAUSED, sau đó có thể ACTIVE lại.

**Q: Mã coupon hết lượt có dùng lại được không?**  
A: Không, trừ khi admin tăng giới hạn lượt.

---

### Về kết hợp Combo + KM

**Q: Combo đã giảm giá, có áp dụng KM thêm được không?**  
A: Có, nếu KM cho phép. KM sẽ tính trên giá combo (đã giảm).

**Q: Nếu có nhiều KM áp dụng được, dùng cái nào?**  
A: Dùng theo thứ tự ưu tiên (priority). KM ưu tiên cao áp dụng trước.

---

## Phụ lục: Thuật ngữ

| Thuật ngữ | Giải thích |
|-----------|------------|
| **Combo** | Gói nhiều sản phẩm bán cùng nhau |
| **Promotion** | Chương trình khuyến mãi |
| **Coupon** | Mã giảm giá khách nhập |
| **Stackable** | Có thể kết hợp với KM khác |
| **Auto-apply** | Tự động áp dụng không cần mã |
| **Usage limit** | Giới hạn số lần sử dụng |
| **Min order** | Giá trị đơn hàng tối thiểu |
| **Max discount** | Số tiền giảm tối đa |

---

*Tài liệu được tạo bởi Phòng IT - Cập nhật: Tháng 1/2026*  
*Liên hệ hỗ trợ: it-support@company.com*
