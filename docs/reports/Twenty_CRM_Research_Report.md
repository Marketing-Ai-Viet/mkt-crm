# Báo Cáo Nghiên Cứu: Twenty CRM và Đánh Giá Hệ Thống mkt-core

**Ngày:** Tháng 2/2025 (Cập nhật: 02/02/2026)
**Người soạn:** Phòng Kỹ thuật
**Phân loại:** Tài liệu nội bộ - Phụ lục

> **Kết luận chính:** Hệ thống mkt-core thực tế là **License Sales Management System**, không phải CRM. Việc fork Twenty CRM để xây dựng non-CRM system là không tối ưu. Khuyến nghị migrate sang infrastructure độc lập.  

---

## 1. Giới Thiệu

Tài liệu này cung cấp thông tin chi tiết về Twenty CRM - giải pháp quản lý khách hàng mã nguồn mở mà công ty đã fork và tùy biến thành module **mkt-core**. Nội dung bao gồm thông tin về dự án, định hướng phát triển, điều khoản bản quyền, và **đánh giá thực tế về những gì đã được triển khai**.

> **Lưu ý quan trọng:** Qua quá trình phát triển, mkt-core đã trở thành **Hệ thống Quản lý Kinh doanh License** (License Sales Management System) thay vì CRM theo nghĩa truyền thống. Chi tiết xem tại Section 6.6.

---

## 2. Tổng Quan Về Twenty CRM

### 2.1. Thông tin cơ bản

| Hạng mục | Thông tin |
|----------|-----------|
| **Năm thành lập** | 2022-2023 |
| **Trụ sở** | Pháp |
| **Loại hình** | Công ty khởi nghiệp (Startup) |
| **Mô hình** | Mã nguồn mở + Dịch vụ đám mây trả phí |
| **Phiên bản hiện tại** | v1.11.0 (Tháng 11/2025) |
| **Số phiên bản đã phát hành** | 52 |

### 2.2. Đội ngũ sáng lập

Twenty được thành lập bởi 3 người:

| Tên | Vai trò | Kinh nghiệm |
|-----|---------|-------------|
| Félix Malfait | Đồng sáng lập | Cựu sáng lập Luckey (được Airbnb mua lại) |
| Charles Bochet | Đồng sáng lập, Kỹ thuật | Cựu sáng lập Luckey |
| Thomas des Francs | Đồng sáng lập, Thiết kế | Doanh nhân công nghệ |

**Nhận xét:** Đội ngũ có kinh nghiệm xây dựng và bán startup thành công, điều này tạo độ tin cậy nhất định cho dự án.

### 2.3. Nguồn vốn đầu tư

| Vòng gọi vốn | Số tiền | Nhà đầu tư chính |
|--------------|---------|------------------|
| Seed | 5 triệu USD | Y Combinator, Runa Capital, Automattic |

**Nhà đầu tư cá nhân đáng chú ý:**
- Mathilde Collin (Sáng lập Front)
- Dharmesh Shah (Sáng lập HubSpot)
- Pierre Burgy, Aurélien Georget (Sáng lập Strapi)
- Sergei Anikin (Cựu CEO/CTO Pipedrive)

**Nhận xét:** Việc có các nhà sáng lập của HubSpot, Pipedrive đầu tư cho thấy dự án được đánh giá cao trong giới CRM.

### 2.4. Cộng đồng phát triển

| Chỉ số | Số liệu |
|--------|---------|
| Lượt đánh dấu yêu thích trên GitHub | ~37,000 |
| Số người đóng góp mã nguồn | 545+ |
| Kênh hỗ trợ cộng đồng | Discord, GitHub Discussions |

**Nhận xét:** Đây là dự án CRM mã nguồn mở có cộng đồng lớn nhất hiện nay, vượt qua cả các dự án lâu đời như SugarCRM, Odoo tại thời điểm tương đương.

---

## 3. Định Hướng Phát Triển

### 3.1. Tầm nhìn của Twenty

Theo tuyên bố của đội ngũ sáng lập, Twenty được xây dựng để giải quyết 3 vấn đề:

| Vấn đề | Giải pháp của Twenty |
|--------|----------------------|
| CRM truyền thống quá đắt, dùng dữ liệu để "giam" khách hàng | Mã nguồn mở, tự chủ dữ liệu |
| Giao diện lỗi thời, khó sử dụng | Thiết kế hiện đại theo phong cách Notion, Airtable |
| Khó tùy chỉnh, phụ thuộc nhà cung cấp | Cộng đồng phát triển, hệ sinh thái mở |

### 3.2. Lộ trình phát triển

**Các tính năng đã hoàn thành:**
- Quản lý liên hệ, công ty, cơ hội kinh doanh
- Tùy chỉnh đối tượng và trường dữ liệu
- Giao diện bảng và Kanban
- Đồng bộ email
- Ghi chú và công việc
- Phân quyền và vai trò
- Tự động hóa quy trình cơ bản
- Giao diện lập trình (API)

**Đang phát triển:**
- Khả năng mở rộng bằng plugin
- Chợ ứng dụng (Marketplace)
- Tự động hóa nâng cao

**Kế hoạch tương lai:**
- Tích hợp trí tuệ nhân tạo
- Mở rộng khả năng kết nối

### 3.3. Vấn đề về tốc độ cập nhật công nghệ

Qua khảo sát mã nguồn, chúng tôi nhận thấy Twenty **không cập nhật nhanh** các thành phần công nghệ nền tảng:

| Thành phần | Phiên bản Twenty dùng | Phiên bản mới nhất | Chênh lệch |
|------------|----------------------|-------------------|------------|
| NestJS (Framework backend) | Phiên bản 9 | Phiên bản 11 | 2 phiên bản |
| PostgreSQL (Cơ sở dữ liệu) | Phiên bản 16 | Phiên bản 17 | 1 phiên bản |

**Ảnh hưởng:**
- Thiếu các cải tiến hiệu suất mới
- Hạn chế khả năng tích hợp trí tuệ nhân tạo (PostgreSQL 17 hỗ trợ tốt hơn)
- Có thể gặp vấn đề bảo mật nếu không được cập nhật kịp thời

**Nhận xét:** Điều này cho thấy đội ngũ Twenty đang ưu tiên phát triển tính năng hơn là cập nhật hạ tầng kỹ thuật.

---

## 4. Điều Khoản Bản Quyền (License)

### 4.1. Loại bản quyền: AGPL-3.0

Twenty sử dụng bản quyền **AGPL-3.0** (GNU Affero General Public License version 3). Đây là loại bản quyền mã nguồn mở **có nhiều ràng buộc nhất**.

### 4.2. Quyền được phép

| Quyền | Mô tả | Áp dụng cho MKT |
|-------|-------|-----------------|
| **Sử dụng cho mục đích thương mại** | Được phép dùng để kinh doanh, bán dịch vụ | ✅ Có |
| **Sửa đổi mã nguồn** | Được phép thay đổi theo nhu cầu | ✅ Có |
| **Tự triển khai** | Được phép cài đặt trên máy chủ riêng | ✅ Có |
| **Tạo phiên bản riêng (Fork)** | Được phép tách ra thành dự án độc lập | ✅ Có |

### 4.3. Nghĩa vụ bắt buộc (QUAN TRỌNG)

| Nghĩa vụ | Mô tả | Mức độ ảnh hưởng |
|----------|-------|------------------|
| **Công khai mã nguồn** | Nếu sửa đổi và cung cấp dịch vụ qua mạng, **phải** công khai toàn bộ mã nguồn đã sửa | ⚠️ CAO |
| **Giữ nguyên bản quyền** | Mọi phiên bản sửa đổi phải dùng cùng loại bản quyền AGPL-3.0 | ⚠️ CAO |
| **Ghi nhận nguồn gốc** | Phải giữ thông tin bản quyền gốc của Twenty | Trung bình |
| **Thông báo thay đổi** | Phải ghi rõ những gì đã thay đổi so với bản gốc | Trung bình |

### 4.4. Điểm khác biệt quan trọng của AGPL so với các bản quyền khác

Hầu hết các bản quyền mã nguồn mở chỉ yêu cầu công khai mã nguồn khi **phân phối phần mềm** (cho người khác tải về cài đặt).

**AGPL khác biệt ở chỗ:** Yêu cầu công khai mã nguồn ngay cả khi **cung cấp dịch vụ qua mạng** mà không cần phân phối.

**Ví dụ thực tế:**

| Tình huống | Bản quyền GPL thông thường | Bản quyền AGPL |
|------------|---------------------------|----------------|
| Chỉnh sửa phần mềm, dùng nội bộ | Không cần công khai | Không cần công khai |
| Chỉnh sửa phần mềm, cho khách hàng tải về | Phải công khai | Phải công khai |
| Chỉnh sửa phần mềm, khách hàng dùng qua web | **Không cần công khai** | **Phải công khai** |

### 4.5. Phân tích rủi ro cho MKT System

#### Trường hợp 1: Dùng Twenty nguyên bản, chỉ nội bộ
- **Nghĩa vụ:** Không có
- **Rủi ro:** Thấp

#### Trường hợp 2: Sửa đổi Twenty, chỉ dùng nội bộ (không có người dùng bên ngoài)
- **Nghĩa vụ:** Không có
- **Rủi ro:** Thấp

#### Trường hợp 3: Sửa đổi Twenty, cung cấp cho khách hàng qua web
- **Nghĩa vụ:** **PHẢI công khai toàn bộ mã nguồn đã sửa đổi**
- **Rủi ro:** CAO
- **Hệ quả:** Đối thủ có thể lấy mã nguồn của bạn và sử dụng hợp pháp

#### Trường hợp 4: Tích hợp Twenty vào hệ thống MKT
- **Nghĩa vụ:** Phụ thuộc vào cách tích hợp, ranh giới không rõ ràng
- **Rủi ro:** TRUNG BÌNH đến CAO
- **Khuyến nghị:** Cần tư vấn pháp lý chuyên sâu

### 4.6. Lưu ý về "hiệu ứng lan truyền" bản quyền

AGPL-3.0 có tính chất "lan truyền" - nghĩa là mã nguồn kết hợp với phần mềm AGPL có thể bị yêu cầu cũng phải tuân theo AGPL.

**Ví dụ từ thực tế:**
- Google cấm hoàn toàn việc sử dụng mã nguồn AGPL trong sản phẩm
- Nhiều công ty lớn có chính sách hạn chế hoặc cấm AGPL
- MongoDB đã từ bỏ AGPL vào năm 2018 do lo ngại về tính thương mại

---

## 5. Các Hình Thức Triển Khai

### 5.1. Tự triển khai (Self-Hosted)

| Hạng mục | Chi tiết |
|----------|----------|
| **Chi phí bản quyền** | Miễn phí |
| **Chi phí thực tế** | Máy chủ, nhân sự vận hành, bảo trì |
| **Yêu cầu kỹ thuật** | Docker, PostgreSQL, Redis |
| **Cấu hình tối thiểu** | 2GB RAM |
| **Mức độ kiểm soát** | Hoàn toàn |
| **Hỗ trợ kỹ thuật** | Cộng đồng (Discord, GitHub) |

**Ưu điểm:**
- Không tốn phí bản quyền
- Toàn quyền kiểm soát dữ liệu
- Có thể tùy chỉnh không giới hạn

**Nhược điểm:**
- Cần đội ngũ kỹ thuật để vận hành
- Tự chịu trách nhiệm bảo mật, sao lưu
- Không có hỗ trợ chính thức

### 5.2. Dịch vụ đám mây của Twenty (Twenty Cloud)

| Gói dịch vụ | Giá | Tính năng |
|-------------|-----|-----------|
| **Pro** | ~$9/người dùng/tháng | Tính năng cơ bản, đồng bộ email |
| **Organization** | ~$19/người dùng/tháng | + Đăng nhập một lần (SSO), hỗ trợ ưu tiên |
| **Enterprise** | Liên hệ | + Đăng nhập doanh nghiệp (SAML/OIDC), hỗ trợ chuyên biệt |

**Ưu điểm:**
- Không cần lo vận hành hạ tầng
- Có hỗ trợ kỹ thuật
- Cập nhật tự động

**Nhược điểm:**
- Chi phí theo số người dùng
- Dữ liệu lưu trên máy chủ của Twenty
- Ít khả năng tùy chỉnh sâu

### 5.3. Dịch vụ lưu trữ bên thứ ba

Một số nhà cung cấp như Elestio, CloudStation cung cấp dịch vụ lưu trữ Twenty với giá từ ~$18-50/tháng.

| Dịch vụ | Bao gồm |
|---------|---------|
| Elestio | Cài đặt tự động, sao lưu, cập nhật, giám sát |
| CloudStation | Triển khai nhanh, hỗ trợ cơ bản |

**Nhận xét:** Đây là lựa chọn trung gian giữa tự triển khai và dùng dịch vụ của Twenty.

---

## 6. Phân Tích Chi Tiết Mức Độ Sử Dụng Tính Năng

### 6.1. Tổng quan các tính năng Twenty CRM cung cấp

| Danh mục | Số lượng | Mô tả |
|----------|----------|-------|
| Business Object Modules | 21 | Company, Person, Opportunity, Note, Task, Attachment, View... |
| Engine Core Modules | 58 | Auth, Cache, Email, Messaging, Calendar, Workflow, AI, Search... |
| Frontend Feature Modules | 45+ | Settings, Analytics, Workflow Builder, Search, Navigation... |
| **Tổng cộng** | **~125+ tính năng** | |

### 6.2. Tính năng đang được sử dụng bởi mkt-core

| Tính năng | Mức độ sử dụng | Số lượng imports |
|-----------|----------------|------------------|
| Workspace (multi-tenant) | Cao | 73 imports |
| Message Queue (BullMQ) | Cao | 70 imports |
| Cache Storage (Redis) | Cao | 56 imports |
| View System (filters, sorts) | Cao | 57 imports |
| Workspace Member | Trung bình | 42 imports |
| Auth cơ bản | Trung bình | 25 imports |
| Timeline/Activity | Trung bình | 20 imports |
| Email sending | Thấp | 8 imports |
| Cron scheduling | Thấp | 8 imports |
| User management | Thấp | 9 imports |
| **Tổng: ~12-15 tính năng** | | |

### 6.3. Tính năng KHÔNG sử dụng (phần lớn Twenty CRM)

| Tính năng | Mô tả | Lý do không dùng |
|-----------|-------|------------------|
| **Messaging/Email Sync** | Đồng bộ Gmail, Outlook, IMAP/SMTP | Không phù hợp nghiệp vụ |
| **Calendar Sync** | Đồng bộ Google Calendar, Microsoft | Không cần thiết |
| **Workflow/Automation** | Drag-drop automation builder | Tự build logic riêng |
| **AI Features** | LLM integration, summaries | Chưa triển khai |
| **Search** | Full-text search, vector embeddings | Chưa tích hợp |
| **SSO** | SAML, OIDC integration | Chưa cần |
| **2FA (Twenty)** | OTP của Twenty | Tự build riêng trong mkt-core |
| **Notes, Tasks, Opportunities** | Business objects CRM chuẩn | Thay bằng entities riêng |
| **Webhook System** | Outbound event webhooks | Chưa sử dụng |
| **Audit Logging** | Ghi log truy cập, thay đổi | Chưa bật |
| **File Storage** | S3, GCS abstraction | Dùng cơ bản |
| **Feature Flags** | Quản lý tính năng | Không dùng |
| **Billing** | Stripe integration | Tự build MktPayment |
| **OAuth2 Connected Accounts** | Kết nối tài khoản bên ngoài | Không dùng |
| **Serverless Functions** | Custom code execution | Không dùng |
| **Company, Person, Opportunity** | Entities CRM chuẩn | Thay bằng MktCustomer, MktOrder |
| **Favorites System** | Bookmark records | Không dùng |
| **Contact Auto-creation** | Tự tạo contact từ email | Không dùng |
| **Spreadsheet Import** | Bulk import | Chưa dùng |

### 6.4. Những gì mkt-core đã tự phát triển thay thế

| Module tự phát triển | Số entities | Thay thế tính năng nào của Twenty |
|---------------------|-------------|-----------------------------------|
| **MktCustomer** | 5 entities | Company + Person |
| **MktOrder** | 4 entities | Opportunity (một phần) |
| **MktInvoice** | 2 entities | Không có trong Twenty |
| **MktPayment** | 6 entities | Billing (khác hoàn toàn) |
| **MktLicense** | 3+ entities | Không có trong Twenty |
| **MktDepartment** | 4 entities | Không có trong Twenty |
| **MktRBAC Enterprise** | 14 entities | Phân quyền cơ bản của Twenty |
| **MktProduct Integration** | 5+ entities | Không có trong Twenty |
| **Mkt2FA** | 2 entities | 2FA của Twenty |
| **MktKPI** | 3+ entities | Không có trong Twenty |
| **MktReseller** | 3+ entities | Không có trong Twenty |
| **Tổng cộng** | **62 entities** | vs 21 entities gốc của Twenty |

### 6.5. Kết luận phân tích

| Chỉ số | Giá trị | Ghi chú |
|--------|---------|---------|
| Tổng tính năng Twenty | ~125 | Đầy đủ CRM + integrations |
| Tính năng đang dùng | ~12-15 | Chủ yếu infrastructure |
| **Tỷ lệ sử dụng thực tế** | **10-15%** | Thấp hơn ước tính ban đầu 20-30% |
| Custom entities đã build | 62 | Gấp 3 lần Twenty base |
| Custom services | 126+ | Độc lập với Twenty modules |

**Nhận xét:** MKT System sử dụng Twenty CRM chủ yếu như một **infrastructure layer** (workspace, queue, cache, GraphQL engine) chứ không phải như một CRM platform. Gần như toàn bộ business logic đã được viết lại trong mkt-core.

### 6.6. Đánh giá thực tế: mkt-core là CRM hay Phần mềm nội bộ?

#### 6.6.1. Phân loại Entities đã triển khai

| Nhóm | Entities | Tỷ lệ |
|------|----------|-------|
| **RBAC/Permissions** | 16+ entities (Casbin, Policy, Template, Audit...) | 27% |
| **HR/Organization** | 10 entities (Department, OrganizationLevel, KPI, Employment...) | 17% |
| **Finance/Invoice** | 9 entities (Invoice, S-Invoice VN integration) | 15% |
| **Order/Payment** | 9 entities (Order, Payment, VirtualAccount, Webhook...) | 15% |
| **Marketing** | 5 entities (Promotion, Coupon, PromotionUsage...) | 8% |
| **Customer** | 5 entities (Customer, Note, Tag, Tier...) | **8%** ← CRM |
| **Contract/Other** | 6 entities | 10% |

**Chỉ ~8% là tính năng CRM thực sự.**

#### 6.6.2. So sánh với CRM tiêu chuẩn

| Tính năng CRM Core | Twenty CRM | mkt-core | Đánh giá |
|--------------------|------------|----------|----------|
| **Opportunity/Deal** | ✅ | ❌ Không có | Thiếu hoàn toàn |
| **Sales Pipeline** | ✅ Kanban stages | ❌ Không có | Thiếu hoàn toàn |
| **Lead Management** | ✅ | ❌ Không có entity Lead | Thiếu hoàn toàn |
| **Activity Tracking** | ✅ Call, Email, Meeting logs | ❌ Chỉ có CustomerNote | Rất hạn chế |
| **Sales Forecasting** | ✅ | ❌ | Thiếu hoàn toàn |
| **Quote/Proposal** | ✅ | ❌ (chỉ có Order) | Thiếu |
| **Contact/Account** | ✅ Tách riêng | ⚠️ Gộp chung Customer | Khác biệt |
| **Email Campaign** | ✅ Integration | ⚠️ Chỉ template | Hạn chế |

#### 6.6.3. mkt-core thực tế là gì?

```
mkt-core ≠ CRM (Customer Relationship Management)

mkt-core = License Sales Management System
           + Order Processing & Payment Integration
           + Invoice System (S-Invoice VN)
           + HR/Department Management
           + Enterprise RBAC
           + Product Integration (MKT Server)
```

**Định nghĩa chính xác:**

> **mkt-core** là **Hệ thống Quản lý Kinh doanh License** (License Sales Management System) được xây dựng trên infrastructure của Twenty CRM. Hệ thống tập trung vào:
> - Xử lý đơn hàng và thanh toán (SEPay, BIDV)
> - Quản lý license và subscription
> - Tích hợp hóa đơn điện tử (S-Invoice)
> - Phân cấp tổ chức và RBAC enterprise
> - Tích hợp với MKT Server (OAuth2, product sync)
>
> **Đây không phải CRM theo nghĩa truyền thống** vì thiếu các tính năng core: sales pipeline, opportunities, leads, activities tracking.

#### 6.6.4. Biểu đồ phân bổ chức năng

```
┌─────────────────────────────────────────────────────────┐
│                    mkt-core (~60 entities)              │
├─────────────────────────────────────────────────────────┤
│  ████████████████████████████  RBAC/Permissions (27%)   │
│  ██████████████████            HR/Organization (17%)    │
│  ██████████████████            Finance/Invoice (15%)    │
│  ████████████████              Order/Payment (15%)      │
│  ██████████                    Marketing (8%)           │
│  ████████                      Customer (8%)  ← CRM     │
│  ██████                        Other (10%)              │
└─────────────────────────────────────────────────────────┘
```

#### 6.6.5. Hệ quả của nhận định này

| Câu hỏi | Trả lời |
|---------|---------|
| Có phải đang làm CRM không? | **KHÔNG** - đang làm License Sales Management |
| Có cần đổi tên dự án không? | Nên xem xét để tránh nhầm lẫn |
| Việc fork Twenty CRM có đúng không? | **Không tối ưu** - fork CRM để làm non-CRM |
| Cần Twenty CRM features không? | Chỉ cần infrastructure (10-15%), không cần CRM features |

#### 6.6.6. Khuyến nghị

1. **Đổi định nghĩa dự án:** Từ "CRM được fork từ Twenty" thành "License Sales Management System xây dựng trên infrastructure của Twenty"

2. **Khi migrate:** Không cần giữ lại các CRM entities của Twenty (Company, Person, Opportunity) vì không sử dụng

3. **Nếu cần CRM thực sự trong tương lai:** Cần bổ sung các module:
   - Lead Management
   - Opportunity/Deal tracking
   - Sales Pipeline với stages
   - Activity logging (calls, emails, meetings)
   - Sales forecasting

---

## 7. Phân Tích Chi Phí (TCO Analysis)

### 7.1. Chi phí duy trì Fork/Custom trên Open Source

Theo nghiên cứu từ nhiều nguồn, chi phí thực tế của việc fork và customize open source thường bị đánh giá thấp:

| Hạng mục chi phí | Tỷ lệ/Số liệu | Nguồn |
|------------------|---------------|-------|
| Chi phí bảo trì hàng năm | 15-20% chi phí phát triển ban đầu | [SoftwareSeni](https://www.softwareseni.com/build-vs-buy-software-decisions-and-total-cost-of-ownership-analysis/) |
| Chi phí thực tế vượt dự toán | 30-40% | [Qt Blog](https://www.qt.io/blog/is-open-source-really-free) |
| Soft costs (khó đo lường) | 20-40% tổng TCO | Quandary Peak Research |
| Chi phí maintain kernel patch (Linux Foundation) | ~$250,000/năm | [LWN.net](https://lwn.net/Articles/659241/) |
| TCO 5 năm cho 1 major OSS component | ~$135,498 | [Quandary Peak](https://quandarypeak.com/2025/12/unseen-costs-and-latent-risks-of-oss/) |

### 7.2. Ước tính TCO cho MKT System (3-5 năm)

#### Phương án A: Tiếp tục với Twenty CRM + mkt-core

| Hạng mục | Năm 1 | Năm 2-3 | Năm 4-5 | Tổng 5 năm |
|----------|-------|---------|---------|------------|
| **Chi phí nhân sự maintain** | | | | |
| - Sync upstream changes | 2 man-months | 4 man-months | 4 man-months | 10 man-months |
| - Debug conflicts | 1 man-month | 2 man-months | 3 man-months | 6 man-months |
| - Security patches | 1 man-month | 2 man-months | 2 man-months | 5 man-months |
| **Chi phí học tập** | | | | |
| - Onboard dev mới (học Twenty) | 2 man-months | 2 man-months | 2 man-months | 6 man-months |
| **Chi phí cơ hội** | | | | |
| - Feature bị block bởi Twenty | Khó định lượng | - | - | Cao |
| **Rủi ro pháp lý AGPL** | Tiềm ẩn | - | - | Không xác định |
| **Tổng ước tính** | 6 man-months | 10 man-months | 11 man-months | **27 man-months** |

#### Phương án B: Migrate sang custom solution

| Hạng mục | Năm 1 | Năm 2-3 | Năm 4-5 | Tổng 5 năm |
|----------|-------|---------|---------|------------|
| **Chi phí migration** | | | | |
| - Phase 1-5 (xem Section 10.4) | 20-26 man-months | 0 | 0 | 20-26 man-months |
| **Chi phí maintain sau migrate** | | | | |
| - Maintain custom code | 0 | 4 man-months | 4 man-months | 8 man-months |
| **Chi phí học tập** | | | | |
| - Onboard dev mới | 1 man-month | 2 man-months | 2 man-months | 5 man-months |
| **Tổng ước tính** | 21-27 man-months | 6 man-months | 6 man-months | **33-39 man-months** |

### 7.3. So sánh TCO

| Tiêu chí | Phương án A (Giữ Twenty) | Phương án B (Migrate) |
|----------|--------------------------|----------------------|
| **Tổng 5 năm** | ~27 man-months + rủi ro | ~33-39 man-months |
| **Chi phí năm 1** | Thấp | Cao (migration) |
| **Chi phí năm 3-5** | Tăng dần | Giảm dần |
| **Rủi ro pháp lý** | Có (AGPL) | Không |
| **Flexibility** | Thấp | Cao |
| **Technical debt** | Tăng theo thời gian | Giảm sau migrate |

**Nhận xét:**
- **Ngắn hạn (1-2 năm)**: Giữ Twenty có chi phí thấp hơn
- **Dài hạn (3-5 năm)**: Migrate có lợi thế về flexibility và không có rủi ro pháp lý
- **Break-even point**: Khoảng năm thứ 3-4

### 7.4. Chi phí ẩn cần lưu ý

| Chi phí ẩn | Mô tả | Ảnh hưởng |
|------------|-------|-----------|
| **Không có SLA** | Open source không đảm bảo support | Tự fix bug, chờ merge upstream |
| **Maintainer burnout** | Nếu Twenty team giảm hoạt động | Phải fork hoàn toàn hoặc migrate |
| **Breaking changes** | Twenty có thể thay đổi architecture | Rewrite lớn không lường trước |
| **Hiring khó hơn** | Ít dev quen Twenty + custom mkt-core | Thời gian onboard dài hơn |

---

## 8. Case Studies và Bài Học Thực Tế

### 8.1. Các công ty cấm sử dụng AGPL

| Công ty | Chính sách | Lý do |
|---------|------------|-------|
| **Google** | [Cấm hoàn toàn AGPL](https://opensource.google/documentation/reference/using/agpl-policy) | "Extremely difficult to comply with network service restrictions" |
| **Apple** | Hạn chế nghiêm ngặt | Tương tự Google |
| **Nhiều Fortune 500** | Stop category (cần approval) | Rủi ro viral licensing |

**Trích dẫn từ Google:**
> "Code licensed under the GNU Affero General Public License (AGPL) MUST NOT be used at Google. The license places restrictions on software used over a network which are extremely difficult for Google to comply with."
> — [Google Open Source Policy](https://opensource.google/documentation/reference/using/agpl-policy)

**Lý do chi tiết:**
- Google's core products là network services (Search, Gmail, Maps)
- Rủi ro "virality" - code integrate với AGPL có thể phải release toàn bộ
- Tiết kiệm engineering time để không phải audit compliance
- Không được phép cài AGPL software trên workstation/laptop công ty

### 8.2. Case Study: MongoDB và SSPL

| Thời điểm | Sự kiện |
|-----------|---------|
| 2018 | MongoDB chuyển từ AGPL sang SSPL (Server Side Public License) |
| Sau 2018 | AWS tạo Amazon DocumentDB - compatible với MongoDB API nhưng không dùng MongoDB code |
| Kết quả | MongoDB vẫn thành công, nhưng cloud providers tìm workaround |

**Bài học:** Ngay cả AGPL/SSPL cũng không ngăn được big tech tạo alternatives.

### 8.3. Case Study: Grafana Labs (2021)

| Trước | Sau |
|-------|-----|
| Apache License 2.0 | AGPLv3 |

**Lý do chuyển đổi:**
- Ngăn cloud providers "strip-mining" - lấy code mà không contribute back
- Giữ được OSI-approved license (khác với MongoDB's SSPL)

**Phản ứng từ users:**
- Nhiều công ty có policy cấm AGPL phải re-evaluate
- Một số chọn ở lại version cũ (Apache licensed)
- Một số chuyển sang Grafana Cloud (paid service)

**Nguồn:** [Grafana Labs Blog](https://grafana.com/blog/2021/04/20/grafana-loki-tempo-relicensing-to-agplv3/), [InfoQ](https://www.infoq.com/news/2021/04/grafana-licence-agpl/)

### 8.4. Case Study: CRM Migration - CloudMetrics (2025)

Một startup SaaS 12 người đã migrate từ Salesforce sang CRM khác:

| Chỉ số | Trước | Sau | Cải thiện |
|--------|-------|-----|-----------|
| Chi phí CRM/tháng | $2,340 | $647 | -73% |
| Thời gian admin/ngày | 3-4 giờ | 30 phút | -85% |
| Revenue growth | - | +156% | 6 tháng |
| Thời gian migrate | Dự kiến 3 tháng | Thực tế 4 tuần | Nhanh hơn |

**Bài học:** Migration CRM có thể nhanh hơn dự kiến nếu có kế hoạch tốt.

**Nguồn:** [Revenue Velocity Lab](https://optif.ai/media/articles/saas-startup-crm-migration-case-study/)

### 8.5. Bài học cho MKT System

| Bài học | Áp dụng cho MKT |
|---------|-----------------|
| AGPL là "non-starter" cho nhiều công ty lớn | Cân nhắc nếu muốn bán/license cho enterprise |
| Chi phí maintain fork tăng theo thời gian | Đã thấy với mkt-core conflicts |
| Migration có thể nhanh hơn dự kiến | Với kế hoạch tốt, 9-13 tháng là khả thi |
| Cloud providers sẽ tìm workaround | Không phụ thuộc vào 1 platform |

---

## 9. So Sánh Với Phương Án Tự Phát Triển

> **Lưu ý:** So sánh này dựa trên thực tế mkt-core là **License Sales Management System**, không phải CRM.

| Tiêu chí | Giữ Twenty Infrastructure | Tự phát triển Infrastructure |
|----------|---------------------------|------------------------------|
| **Rủi ro bản quyền** | Có (AGPL-3.0) | Không có |
| **Kiểm soát công nghệ** | Bị ràng buộc theo Twenty | Hoàn toàn tự chủ |
| **Phù hợp với nhu cầu** | 10-15% (chỉ dùng infra) | 100% theo yêu cầu |
| **CRM features** | Có nhưng không dùng | Không cần |
| **Khả năng tích hợp AI** | Hạn chế | Tối ưu |
| **Thời gian ban đầu** | Nhanh hơn | Chậm hơn |
| **Thời gian dài hạn** | Chậm (phải theo Twenty) | Nhanh (tự kiểm soát) |
| **Chi phí bảo trì** | Cao (maintain CRM không dùng) | Thấp (chỉ maintain cần thiết) |
| **Kích thước codebase** | ~500K+ lines (chỉ dùng 10-15%) | Chỉ những gì cần thiết |
| **Khả năng upgrade** | Khó (conflict với custom code) | Dễ dàng |

**Thực tế cần migrate:**
- ORM layer (replace Twenty ORM với TypeORM thuần)
- Multi-tenant/Workspace (có thể đơn giản hóa nếu chỉ 1 tenant)
- GraphQL engine (hoặc chuyển REST)
- Cache abstraction (Redis adapter)
- Message Queue (BullMQ adapter)

**Không cần migrate (vì không dùng):**
- Twenty CRM entities (Company, Person, Opportunity...)
- Email sync, Calendar sync
- Workflow builder
- SSO, 2FA của Twenty (đã tự build)

---

## 10. Kết Luận Và Khuyến Nghị

### 10.1. Twenty phù hợp khi:

- Doanh nghiệp cần CRM hoàn chỉnh, sử dụng 70% tính năng trở lên
- Không có đội ngũ kỹ thuật mạnh để tự phát triển
- Chấp nhận các nghĩa vụ của bản quyền AGPL-3.0
- Không cần tùy chỉnh sâu theo nghiệp vụ riêng
- Sẵn sàng công khai mã nguồn nếu cung cấp dịch vụ cho bên ngoài

### 10.2. Twenty KHÔNG phù hợp khi (trường hợp của MKT):

- **Không phải làm CRM** - thực tế đang xây dựng License Sales Management System (xem Section 6.6)
- Chỉ sử dụng **10-15% tính năng** - chủ yếu là infrastructure, không dùng CRM features
- Đã tự phát triển **62 custom entities** thay thế gần như toàn bộ business logic
- Cần tích hợp sâu với hệ thống nội bộ có sẵn (MKT Server, SEPay, BIDV, S-Invoice)
- Muốn sử dụng công nghệ mới nhất cho tích hợp AI
- Lo ngại về nghĩa vụ bản quyền AGPL-3.0
- Nghiệp vụ kinh doanh thay đổi liên tục
- Các tính năng CRM của Twenty (Opportunity, Pipeline, Lead) **không sử dụng**
- Các tính năng quan trọng nhất đã phải tự phát triển:
  - Phân quyền enterprise-grade (16+ entities)
  - Thanh toán SEPay/BIDV (6 entities)
  - License management + Product Integration (8+ entities)
  - Order/Invoice processing + S-Invoice VN (15 entities)
  - HR/Department hierarchy (10 entities)

### 10.3. Khuyến nghị cuối cùng

Dựa trên phân tích trên, chúng tôi **không khuyến nghị** tiếp tục sử dụng Twenty CRM infrastructure cho hệ thống MKT vì:

1. **Sai mục đích:** Fork CRM để làm License Sales Management - không tối ưu
2. **Rủi ro pháp lý:** Bản quyền AGPL-3.0 có thể buộc công khai mã nguồn
3. **Lãng phí nguồn lực:** Maintain ~500K+ lines CRM code nhưng chỉ dùng infrastructure (10-15%)
4. **Technical debt cao:** Custom code (mkt-core) conflict với Twenty CRM architecture
5. **Hạn chế kỹ thuật:** Công nghệ không được cập nhật (NestJS 9 vs 11, PostgreSQL 16 vs 17)
6. **Không linh hoạt:** Bị ràng buộc bởi CRM architecture khi không cần CRM
7. **Chi phí ẩn:** Debug, học codebase Twenty, sync với upstream changes

**Đề xuất thay thế:**

1. **Migrate infrastructure layer** - giữ lại những gì đang dùng (ORM adapter, Cache, Queue), bỏ CRM layer
2. **Đổi định nghĩa dự án** - từ "CRM" thành "License Sales Management System"
3. **Nếu cần CRM thực sự trong tương lai** - xây dựng module CRM riêng với đầy đủ: Pipeline, Opportunities, Leads, Activities (xem tài liệu chiến lược)

### 10.4. Lộ trình khuyến nghị nếu quyết định migrate

#### 10.4.1. Phân tích Velocity phát triển hiện tại

Dựa trên lịch sử commit của mkt-core (07/08/2025 - 02/02/2026):

| Chỉ số | Giá trị |
|--------|---------|
| Thời gian phát triển | 179 ngày (~6 tháng) |
| Tổng commits | 697 |
| Feature commits | 303 (43%) |
| Commits/tháng | ~118 |
| Commits/tuần | ~27 |
| Current LOC | ~213,000 lines |
| LOC/tháng | ~36,000 lines |
| Team size | 2 main devs (effective ~1.5-2 FTE) |

#### 10.4.2. Phân tích Dependencies cần migrate

| Dependency Type | Số lượng | Độ khó |
|-----------------|----------|--------|
| Files có Twenty imports | 486/1,315 (37%) | - |
| ORM layer imports | 726 | Cao |
| Workspace/multi-tenant imports | 673 | Cao |
| Cache imports | 220 | Thấp (dùng adapter) |
| Message Queue imports | 29 | Thấp (dùng adapter) |
| GraphQL resolvers | 46 files | Trung bình |

#### 10.4.3. Lộ trình chi tiết theo Velocity thực tế

| Phase | Công việc | Commits | LOC | Thời gian |
|-------|-----------|---------|-----|-----------|
| **Phase 1** | Audit & Document dependencies | ~50 | ~3,000 | 2-3 tuần |
| **Phase 2** | Build Infrastructure Abstraction (ORM, Workspace, Cache) | ~150 | ~15,000 | 5-6 tuần |
| **Phase 3** | Build Standalone GraphQL Layer (NestJS + TypeGraphQL) | ~100 | ~12,000 | 4-5 tuần |
| **Phase 4** | Migrate Entity Layer (replace @WorkspaceEntity) | ~200 | ~25,000 | 7-8 tuần |
| **Phase 5** | Data Migration & E2E Testing | ~80 | ~10,000 | 4-5 tuần |
| **Phase 6** | Cleanup & Documentation | ~30 | ~5,000 | 2 tuần |
| **Tổng** | | **~610** | **~70,000** | **24-29 tuần** |

#### 10.4.4. Ước tính thời gian theo các kịch bản team

**Phân tích velocity thực tế từ git history:**

| Contributor | Commits | Net LOC | Commits/tháng | LOC/tháng |
|-------------|---------|---------|---------------|-----------|
| phuth (lead dev) | 415 (60%) | 232,838 (77%) | 83 | 46,500 |
| Team average | 697 | 302,808 | 118 | 36,000 |

**Nhận xét:** Lead developer đóng góp 77% code với 60% commits → mỗi commit có impact lớn hơn trung bình.

**Ước tính thời gian theo các kịch bản team:**

| Kịch bản | 1 Dev (như lead) | Team hiện tại (2 devs) | 2 Devs mạnh |
|----------|------------------|------------------------|-------------|
| Velocity (commits/tháng) | 83 | 118 | 166 |
| Velocity (LOC/tháng) | 46,500 | 36,000 | 93,000 |
| **Optimistic** | 7-8 tháng | 5-6 tháng | 4-5 tháng |
| **Realistic** | 9-10 tháng | 7-8 tháng | 5-6 tháng |
| **Pessimistic** | 12-14 tháng | 10-12 tháng | 7-8 tháng |
| **Completion (realistic)** | Sep-Oct 2026 | Aug-Sep 2026 | Jul-Aug 2026 |

**Chi tiết overhead khi có 2+ devs:**
- Coordination overhead: +20% thời gian
- Code review & merge conflicts: +15% thời gian
- Không thể parallelize 100% (một số phase phụ thuộc nhau)

#### 10.4.4b. Yếu tố ảnh hưởng: GraphQL vs RESTful API

**Vấn đề thực tế:** Team chưa quen sử dụng GraphQL ở cả backend và frontend, làm chậm tốc độ phát triển.

**Hiện trạng GraphQL trong mkt-core:**

| Thành phần | Số lượng |
|------------|----------|
| Resolvers | 36 files |
| Queries | 118 endpoints |
| Mutations | 103 endpoints |
| Input types | 103 DTOs |
| Object types | 194 response types |
| **Tổng endpoints** | **221** |

**So sánh GraphQL vs RESTful API:**

| Tiêu chí | GraphQL (hiện tại) | RESTful API |
|----------|-------------------|-------------|
| Learning curve | Cao (team chưa quen) | Thấp (phổ biến) |
| Frontend integration | Phức tạp (Apollo/codegen) | Đơn giản (fetch/axios) |
| Debugging | Khó | Dễ (Postman, curl) |
| Team familiarity | ~30% | ~90%+ |
| Tooling | GraphQL Playground, codegen | Swagger/OpenAPI |

**Ước tính timeline theo lựa chọn API:**

| Option | Mô tả | Timeline (2 devs mạnh) | Ghi chú |
|--------|-------|------------------------|---------|
| **A: Giữ GraphQL** | Migrate + học GraphQL | 7-9 tháng | +2-3 tháng learning curve |
| **B: Chuyển REST** | Migrate + convert 221 endpoints | **5-6 tháng** | Team quen, velocity +30-40% |
| **C: Hybrid** | REST mới + giữ GraphQL cũ | 6-7 tháng | Phức tạp maintain |

**Khuyến nghị: Option B - Chuyển sang RESTful API**

Lý do:
1. Team quen thuộc → velocity tăng 30-40%
2. Debugging/testing dễ hơn → ít bug
3. Frontend integration đơn giản (không cần Apollo, codegen)
4. Hiring dễ hơn (nhiều dev biết REST)
5. Tooling phổ biến (Swagger auto-generate docs)

Trade-off cần chấp nhận:
- Mất flexibility của GraphQL (client tự chọn fields)
- Có thể over-fetching (giải quyết bằng sparse fieldsets)
- Cần versioning API (/api/v1, /api/v2)

#### 10.4.4c. Yếu tố tăng tốc: AI-Assisted Development (Claude Code)

**Thực tế sử dụng AI trong dự án:**

Qua quá trình phát triển mkt-core, việc sử dụng AI (Claude Code) cho thấy:

| Chỉ số | Giá trị | Ghi chú |
|--------|---------|---------|
| Tỷ lệ code AI generate sử dụng được | **90-95%** | Với prompt rõ ràng |
| Tốc độ tăng so với code thủ công | 2-3x | Đặc biệt với boilerplate |
| Giảm thời gian debug | 40-50% | AI phát hiện lỗi nhanh |
| Giảm thời gian viết tests | 60-70% | AI generate test cases |

**Điều kiện để AI hoạt động hiệu quả:**

| Điều kiện | Quan trọng | Hiện trạng |
|-----------|------------|------------|
| Tài liệu thiết kế rõ ràng | ⭐⭐⭐ | Cần cải thiện |
| Coding conventions documented | ⭐⭐⭐ | Có (CLAUDE.md) |
| Architecture patterns defined | ⭐⭐ | Có một phần |
| Example code/templates | ⭐⭐ | Có |
| Clear acceptance criteria | ⭐⭐⭐ | Cần bổ sung |

**Ước tính impact của AI lên timeline:**

| Scenario | Không AI | Có AI (điều kiện tốt) | Tăng tốc |
|----------|----------|----------------------|----------|
| 1 Dev solo | 9-10 tháng | 6-7 tháng | ~30% |
| 2 Devs average | 7-8 tháng | 5-6 tháng | ~25% |
| 2 Devs mạnh | 5-6 tháng | **3-4 tháng** | ~35% |

**Điều kiện để đạt tốc độ tối ưu với AI:**

1. **Tài liệu thiết kế chi tiết:**
   - Architecture Decision Records (ADRs)
   - Entity Relationship Diagrams
   - API specifications (OpenAPI/Swagger)
   - Sequence diagrams cho flows phức tạp

2. **Coding standards rõ ràng:**
   - File structure conventions
   - Naming conventions
   - Error handling patterns
   - Testing requirements

3. **Task breakdown cụ thể:**
   - User stories với acceptance criteria
   - Technical tasks với expected output
   - Definition of Done rõ ràng

**Timeline tối ưu với AI + REST + 2 Devs mạnh + Tài liệu tốt:**

```
2026 Feb:      Phase 1 - Audit + Design docs (3 tuần)
2026 Mar:      Phase 2 - Infrastructure (3 tuần)
2026 Apr:      Phase 3 - REST Controllers (4 tuần)
2026 May:      Phase 4 - Entity Migration (4 tuần)
2026 Jun:      Phase 5+6 - Testing + Go-live (2 tuần)

→ Hoàn thành: Jun 2026 (4 tháng) - BEST CASE
```

**Tổng hợp tất cả scenarios:**

| Scenario | API | AI | Timeline | Completion |
|----------|-----|-----|----------|------------|
| 1 Dev, GraphQL, no AI | GraphQL | ❌ | 12-14 tháng | Q4 2026 |
| 1 Dev, REST, with AI | REST | ✅ | 6-7 tháng | Aug 2026 |
| 2 Devs avg, GraphQL, no AI | GraphQL | ❌ | 9-10 tháng | Nov 2026 |
| 2 Devs avg, REST, with AI | REST | ✅ | 5-6 tháng | Jul 2026 |
| 2 Devs mạnh, REST, no AI | REST | ❌ | 5-6 tháng | Jul 2026 |
| **2 Devs mạnh, REST, with AI + docs** | REST | ✅✅ | **3-4 tháng** | **May-Jun 2026** |

#### 10.4.5. Khuyến nghị timeline theo kịch bản team

**Kịch bản A: 1 Developer (solo) - Realistic 9-10 tháng**
```
2026 Q1 (Feb-Apr):   Phase 1+2 - Audit + Infrastructure (10 tuần)
2026 Q2 (May-Jul):   Phase 3+4 - GraphQL + Entity (15 tuần)
2026 Q3 (Aug-Sep):   Phase 5+6 - Testing + Cleanup (7 tuần)
2026 Q4 (Oct):       Buffer + Go-live
```

**Kịch bản B: Team hiện tại (2 devs) - Realistic 7-8 tháng**
```
2026 Q1 (Feb-Mar):   Phase 1 - Audit (3 tuần)
2026 Q2 (Apr-Jun):   Phase 2+3 - Infrastructure + GraphQL (10 tuần)
2026 Q3 (Jul-Aug):   Phase 4+5 - Entity Migration + Testing (12 tuần)
2026 Q3 (Sep):       Phase 6 - Cleanup, Go-live
```

**Kịch bản C: 2 Devs mạnh - Realistic 5-6 tháng (Khuyến nghị)**
```
2026 Feb-Mar:        Phase 1+2 - Audit + Infrastructure (6 tuần)
2026 Apr-May:        Phase 3+4 - GraphQL + Entity (8 tuần)
2026 Jun-Jul:        Phase 5+6 - Testing + Cleanup + Go-live (4 tuần)
```

**Milestone quan trọng (theo Kịch bản C):**

| Milestone | Tuần | Nội dung | Deliverable |
|-----------|------|----------|-------------|
| **M1** | 2 | Dependency map hoàn thành | Tài liệu dependencies |
| **M2** | 6 | Infrastructure layer independent | ORM, Cache, Queue adapters |
| **M3** | 10 | GraphQL layer standalone | API hoạt động độc lập |
| **M4** | 16 | All entities migrated | 486 files updated |
| **M5** | 20 | Testing complete | E2E tests pass |
| **M6** | 22 | Production ready | Go-live |

---

## 11. Phụ Lục

### 11.1. Nguồn tham khảo

| Nguồn | Địa chỉ |
|-------|---------|
| Website chính thức | https://twenty.com |
| Mã nguồn | https://github.com/twentyhq/twenty |
| Tài liệu kỹ thuật | https://docs.twenty.com |
| Lộ trình phát triển | https://github.com/orgs/twentyhq/projects/1 |
| Bản quyền AGPL-3.0 | https://www.gnu.org/licenses/agpl-3.0.html |

### 11.2. Thuật ngữ

| Thuật ngữ | Giải thích |
|-----------|------------|
| **Mã nguồn mở (Open Source)** | Phần mềm có mã nguồn công khai, ai cũng có thể xem và sử dụng |
| **Self-Hosted** | Tự cài đặt và vận hành trên máy chủ của mình |
| **Fork** | Tạo một phiên bản riêng từ mã nguồn gốc |
| **AGPL** | Loại bản quyền mã nguồn mở có nhiều ràng buộc |
| **Copyleft** | Nguyên tắc yêu cầu các phiên bản sửa đổi cũng phải mã nguồn mở |
| **SaaS** | Phần mềm cung cấp qua internet dưới dạng dịch vụ |
| **API** | Giao diện cho phép các phần mềm giao tiếp với nhau |

### 11.3. Lịch sử cập nhật tài liệu

| Ngày | Nội dung cập nhật | Người cập nhật |
|------|-------------------|----------------|
| 02/2025 | Phiên bản đầu tiên | Phòng Kỹ thuật |
| 02/02/2026 | Cập nhật phân tích chi tiết mức độ sử dụng (Section 6), sửa tỷ lệ từ 20-30% thành 10-15% dựa trên audit codebase thực tế, bổ sung lộ trình migrate | Phòng Kỹ thuật |
| 02/02/2026 | Bổ sung Section 7 (Phân tích chi phí TCO) và Section 8 (Case Studies) với nguồn tham khảo từ Google, Grafana Labs, Linux Foundation | Phòng Kỹ thuật |
| 02/02/2026 | Cập nhật Section 10.4: phân tích velocity, 3 kịch bản team, GraphQL vs REST, yếu tố AI (Claude Code 90-95% usable) - timeline tối ưu 3-4 tháng với đầy đủ điều kiện | Phòng Kỹ thuật |
| 02/02/2026 | **Bổ sung Section 6.6:** Đánh giá thực tế mkt-core - kết luận đây là **License Sales Management System** không phải CRM. Chỉ 8% entities liên quan đến CRM, thiếu hoàn toàn: Pipeline, Opportunities, Leads, Activities. Cập nhật Section 9, 10 phản ánh thực tế này. | Phòng Kỹ thuật |

---

**Người soạn:** Phòng Kỹ thuật  
**Ngày:** ___/02/2025  
**Xác nhận:** _________________
