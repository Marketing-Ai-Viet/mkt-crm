# Đề Xuất Chiến Lược CRM Cho Hệ Thống MKT

**Ngày:** Tháng 2/2025  
**Người soạn:** Phòng Kỹ thuật  
**Phân loại:** Tài liệu nội bộ  

---

## 1. Tóm Tắt Điều Hành (Executive Summary)

Tài liệu này đề xuất **chuyển đổi từ việc sử dụng Twenty CRM sang xây dựng module CRM nội bộ** tích hợp trực tiếp vào hệ thống MKT Software Management.

### Lý do chính:
- Mức độ sử dụng thực tế của Twenty CRM chỉ đạt **20-30%** tính năng
- Các tính năng quan trọng nhất (phân quyền, thanh toán) phải **tự phát triển hoàn toàn**
- Công nghệ của Twenty **không cập nhật**, ảnh hưởng đến khả năng tích hợp AI
- Chi phí bảo trì và vận hành **cao hơn lợi ích** thu được

### Đề xuất:
Phát triển module CRM nội bộ với thời gian ước tính **2-3 tuần**, đảm bảo kiểm soát hoàn toàn và phù hợp với định hướng phát triển sản phẩm.

---

## 2. Bối Cảnh

### 2.1. Tình hình hiện tại

Hệ thống MKT Software Management đang phục vụ **6,000+ người dùng đồng thời**, với yêu cầu:
- Phát triển MVP nhanh để đáp ứng thị trường
- Nghiệp vụ kinh doanh thay đổi liên tục
- Tích hợp sâu các giải pháp AI (chatbot, phân tích dữ liệu)
- Tích hợp thanh toán (SePay) và hóa đơn điện tử (S-Invoice)

### 2.2. Giải pháp ban đầu

Twenty CRM được lựa chọn vì:
- Mã nguồn mở, không tốn phí license
- Công nghệ tương tự hệ thống MKT (NestJS, PostgreSQL)
- Tự chủ dữ liệu (self-hosted)

---

## 3. Vấn Đề Phát Sinh

### 3.1. Mức độ sử dụng thấp

| Hạng mục | Tình trạng |
|----------|------------|
| Tổng tính năng Twenty cung cấp | ~100% |
| Tính năng thực tế sử dụng | **20-30%** |
| Tính năng phải tự phát triển | Phân quyền, Thanh toán, Báo cáo tùy chỉnh |

**Nhận xét:** Chúng ta đang bảo trì một hệ thống lớn nhưng chỉ sử dụng một phần nhỏ, gây lãng phí nguồn lực.

### 3.2. Rào cản kỹ thuật

| Vấn đề | Ảnh hưởng |
|--------|-----------|
| Twenty sử dụng GraphQL | Đội ngũ Frontend không quen, cần thời gian học hoặc phải viết thêm lớp chuyển đổi |
| NestJS phiên bản 9 (hiện tại là 11) | Thiếu các cải tiến hiệu năng và bảo mật mới |
| PostgreSQL 16 (hiện tại là 17) | Hạn chế khả năng tích hợp AI và tối ưu hiệu suất |

### 3.3. Công nghệ không đồng bộ với định hướng AI

PostgreSQL 17 cung cấp nhiều cải tiến quan trọng cho việc tích hợp AI:
- Hỗ trợ tốt hơn cho vector search (pgvector)
- Tối ưu hóa truy vấn JSON
- Hiệu suất xử lý dữ liệu lớn được cải thiện

Twenty vẫn sử dụng PostgreSQL 16, **không tương thích** với lộ trình AI của công ty.

### 3.4. Chi phí ẩn

| Hạng mục chi phí | Mô tả |
|------------------|-------|
| Thời gian tìm hiểu | Đội ngũ phải đọc và hiểu mã nguồn Twenty trước khi sửa đổi |
| Xung đột khi cập nhật | Mỗi lần Twenty phát hành phiên bản mới, cần thời gian giải quyết xung đột với mã tùy chỉnh |
| Chuyển đổi ngữ cảnh | Lập trình viên phải làm việc với 2 codebase khác nhau |
| Hạn chế linh hoạt | Thay đổi nghiệp vụ đòi hỏi hiểu cả logic của Twenty lẫn hệ thống MKT |

---

## 4. Phân Tích Các Phương Án

### 4.1. Phương án A: Tiếp tục sử dụng Twenty CRM

**Ưu điểm:**
- Không cần thay đổi ngay lập tức
- Đã có sẵn một số tích hợp

**Nhược điểm:**
- Tiếp tục gánh chịu các chi phí ẩn
- Hạn chế khả năng tích hợp AI
- Tốc độ phát triển tính năng mới chậm
- Phụ thuộc vào lộ trình phát triển của Twenty

**Đánh giá:** Không khuyến nghị

---

### 4.2. Phương án B: Sử dụng CRM thương mại (Salesforce, HubSpot, Dynamics 365)

**Ưu điểm:**
- Tính năng đầy đủ, trưởng thành
- Hỗ trợ kỹ thuật chuyên nghiệp
- Ecosystem phong phú

**Nhược điểm:**
- Chi phí license rất cao (ước tính 500-2,000 USD/tháng cho quy mô hiện tại)
- Vendor lock-in (phụ thuộc nhà cung cấp)
- Dữ liệu lưu trữ ở nước ngoài, có thể gặp vấn đề compliance
- Tích hợp với hệ thống nội bộ phức tạp và tốn kém
- Vẫn phải tùy chỉnh nhiều cho nghiệp vụ đặc thù

**Chi phí ước tính:**

| Giải pháp | Chi phí/tháng | Chi phí/năm |
|-----------|---------------|-------------|
| Salesforce Essentials | ~$25/user | ~$18,000 (60 users) |
| HubSpot Professional | ~$800/tháng | ~$9,600 |
| Dynamics 365 Sales | ~$65/user | ~$46,800 (60 users) |

**Đánh giá:** Không phù hợp với bối cảnh hiện tại

---

### 4.3. Phương án C: Xây dựng module CRM nội bộ (Đề xuất)

**Ưu điểm:**
- Kiểm soát hoàn toàn mã nguồn và dữ liệu
- Sử dụng đúng công nghệ mới nhất (NestJS 11, PostgreSQL 17)
- Tích hợp liền mạch với hệ thống MKT hiện có
- Linh hoạt thay đổi theo nghiệp vụ
- Sẵn sàng cho tích hợp AI
- Không tốn phí license

**Nhược điểm:**
- Cần đầu tư thời gian phát triển ban đầu
- Đội ngũ tự chịu trách nhiệm bảo trì

**Đánh giá:** Khuyến nghị thực hiện

---

## 5. Đề Xuất Chi Tiết

### 5.1. Phạm vi module CRM nội bộ

| Tính năng | Mô tả | Độ ưu tiên |
|-----------|-------|------------|
| Quản lý Liên hệ | Thông tin khách hàng, lịch sử tương tác | Cao |
| Quản lý Công ty | Thông tin doanh nghiệp, mối quan hệ | Cao |
| Quản lý Cơ hội | Pipeline bán hàng, theo dõi deal | Cao |
| Theo dõi Hoạt động | Ghi chú, cuộc gọi, email, lịch hẹn | Trung bình |
| Tìm kiếm & Lọc | Tìm kiếm nâng cao, bộ lọc tùy chỉnh | Trung bình |
| Báo cáo cơ bản | Dashboard, thống kê | Trung bình |
| Tích hợp AI | Chatbot, gợi ý thông minh | Giai đoạn 2 |

### 5.2. Lợi thế kỹ thuật

**Tái sử dụng từ hệ thống MKT hiện có:**
- Hệ thống phân quyền (RBAC + ABAC)
- Module thanh toán tích hợp SePay
- Hệ thống thông báo
- Cơ sở hạ tầng monitoring và logging
- Caching layer (Redis)

### 5.3. Thời gian thực hiện

| Giai đoạn | Nội dung | Thời gian |
|-----------|----------|-----------|
| Giai đoạn 1 | Thiết kế database, API cơ bản | 1 tuần |
| Giai đoạn 2 | CRUD Contact, Company, Deal | 1 tuần |
| Giai đoạn 3 | Activity tracking, Search, Filter | 1 tuần |
| Giai đoạn 4 | Testing, tối ưu, triển khai | 1 tuần |

**Tổng thời gian:** 3-4 tuần

### 5.4. Nguồn lực cần thiết

| Vai trò | Số lượng | Ghi chú |
|---------|----------|---------|
| Backend Developer | 1-2 | Phát triển API, logic nghiệp vụ |
| Frontend Developer | 1 | Giao diện người dùng |
| QA/Tester | 1 | Kiểm thử |
| Product Owner | 1 | Định hướng, nghiệm thu |

---

## 6. So Sánh Chi Phí - Lợi Ích

### 6.1. Chi phí

| Hạng mục | Twenty CRM | CRM Thương mại | Tự phát triển |
|----------|------------|----------------|---------------|
| License/năm | 0 | 120-560 triệu VND | 0 |
| Thời gian tích hợp | Đã bỏ ra ~4 tuần | 8-12 tuần | 3-4 tuần |
| Chi phí bảo trì/năm | Cao (complexity) | Trung bình | Thấp (in-house) |
| Training | Cần học GraphQL | Cần học platform | Không cần |

### 6.2. Lợi ích dài hạn

| Tiêu chí | Twenty CRM | Tự phát triển |
|----------|------------|---------------|
| Tốc độ phát triển tính năng | Chậm | Nhanh |
| Khả năng tích hợp AI | Hạn chế | Tối ưu |
| Linh hoạt theo nghiệp vụ | Thấp | Cao |
| Kiểm soát dữ liệu | Có | Có |
| Phù hợp tech stack | Một phần | Hoàn toàn |

---

## 7. Rủi Ro và Biện Pháp Giảm Thiểu

| Rủi ro | Mức độ | Biện pháp giảm thiểu |
|--------|--------|---------------------|
| Chậm tiến độ phát triển | Trung bình | Phạm vi MVP rõ ràng, ưu tiên tính năng core |
| Thiếu tính năng so với CRM chuyên nghiệp | Thấp | Chỉ cần 20-30% tính năng CRM chuẩn |
| Gián đoạn vận hành | Thấp | Chạy song song với Twenty trong giai đoạn chuyển đổi |
| Phát sinh yêu cầu mới | Trung bình | Thiết kế kiến trúc mở rộng được |

---

## 8. Lộ Trình Đề Xuất

```
Tuần 1-2     Tuần 3-4     Tuần 5-6     Tuần 7-8
   │            │            │            │
   ▼            ▼            ▼            ▼
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│Thiết │    │ Phát │    │ Test │    │Chuyển│
│ kế   │───▶│ triển│───▶│  &   │───▶│ đổi  │
│      │    │ MVP  │    │Tối ưu│    │      │
└──────┘    └──────┘    └──────┘    └──────┘
                                        │
                                        ▼
                                   ┌──────┐
                                   │Sunset│
                                   │Twenty│
                                   └──────┘
```

**Chi tiết:**
- **Tuần 1-2:** Thiết kế kiến trúc, data model, phê duyệt
- **Tuần 3-4:** Phát triển các tính năng core
- **Tuần 5-6:** Testing, tối ưu hiệu năng, UAT
- **Tuần 7-8:** Chuyển đổi dữ liệu, ngừng sử dụng Twenty

---

## 9. Kết Luận

### Khuyến nghị

Dựa trên phân tích trên, phòng Kỹ thuật **khuyến nghị thực hiện Phương án C** - xây dựng module CRM nội bộ với các lý do:

1. **Phù hợp với thực tế sử dụng**: Chỉ cần 20-30% tính năng CRM
2. **Tối ưu chi phí**: Không tốn phí license, tận dụng hạ tầng có sẵn
3. **Sẵn sàng cho AI**: Sử dụng công nghệ mới nhất
4. **Linh hoạt**: Đáp ứng nhanh các thay đổi nghiệp vụ
5. **Kiểm soát**: Toàn quyền với mã nguồn và dữ liệu

### Bước tiếp theo

Đề nghị Ban Giám đốc và các phòng ban liên quan:

1. Xem xét và phê duyệt đề xuất
2. Phân bổ nguồn lực theo kế hoạch
3. Xác định timeline cụ thể
4. Thành lập team dự án

---

## Phụ Lục

### A. Thuật ngữ

| Thuật ngữ | Giải thích |
|-----------|------------|
| CRM | Customer Relationship Management - Quản lý quan hệ khách hàng |
| MVP | Minimum Viable Product - Sản phẩm khả dụng tối thiểu |
| API | Application Programming Interface - Giao diện lập trình ứng dụng |
| GraphQL | Ngôn ngữ truy vấn API do Facebook phát triển |
| Self-hosted | Tự triển khai và vận hành trên hạ tầng của mình |
| Vendor lock-in | Tình trạng phụ thuộc vào một nhà cung cấp |
| RBAC | Role-Based Access Control - Phân quyền theo vai trò |

### B. Tham khảo

- Twenty CRM: https://twenty.com
- So sánh CRM: Salesforce, HubSpot, Dynamics 365, Zoho
- Báo cáo nội bộ: Kiến trúc hệ thống MKT

---

**Người soạn:** Phòng Kỹ thuật  
**Ngày:** ___/02/2025  
**Phê duyệt:** _________________
