# Quy Trình Kiểm Tra Quyền trong RBAC Guard

## Tổng Quan

Tài liệu này mô tả quy trình kiểm tra quyền toàn diện cần được triển khai trong RBAC (Role-Based Access Control) guards để đảm bảo ủy quyền phù hợp cho các hành động trong hệ thống.

## Luồng Kiểm Tra Quyền

### 1. Kiểm Tra Cơ Bản (Pre-validation)

**Mục đích**: Xác thực các điều kiện tiên quyết cơ bản trước khi tiến hành logic quyền phức tạp.

**Các bước kiểm tra**:
- ✅ Kiểm tra context thực thi có hợp lệ không
- ✅ Xác minh người dùng đã xác thực
- ✅ Xác thực workspace context tồn tại
- ✅ Xác nhận hành động được yêu cầu hợp lệ/được hỗ trợ
- ✅ Kiểm tra request chứa các tham số bắt buộc

**Điều Kiện Thoát**:
- Trả về `DENY` nếu bất kỳ xác thực cơ bản nào thất bại
- Tiến tới bước tiếp theo nếu tất cả xác thực đều thành công

---

### 2. Phân Giải Ngữ Cảnh Người Dùng (User Context Resolution)

**Mục đích**: Trích xuất và xác thực thông tin người dùng từ ngữ cảnh yêu cầu.

**Các bước kiểm tra**:
- ✅ Trích xuất workspaceMemberId từ context
- ✅ Trích xuất workspaceId từ context
- ✅ Xác minh người dùng thuộc về workspace
- ✅ Lấy cấp bậc hierarchy của người dùng
- ✅ Lấy thông tin phòng ban của người dùng
- ✅ Tải trạng thái hoạt động của người dùng

**Dữ Liệu Quan Trọng**:
- `workspaceMemberId`: Định danh duy nhất cho thành viên workspace
- `workspaceId`: Ngữ cảnh workspace hiện tại
- `hierarchyLevel`: Vị trí của người dùng trong hierarchy tổ chức (1-11)
- `departmentId`: Phân công phòng ban của người dùng

---

### 3. Nhận Diện Tài Nguyên (Resource Identification)

**Mục đích**: Nhận diện và xác thực tài nguyên đích cho hành động được yêu cầu.

**Các bước kiểm tra**:
- ✅ Xác định loại tài nguyên (tên object)
- ✅ Trích xuất ID tài nguyên (nếu có)
- ✅ Xác minh tài nguyên tồn tại trong hệ thống
- ✅ Nhận diện chủ sở hữu/người tạo tài nguyên
- ✅ Lấy metadata và thuộc tính tài nguyên

**Các Loại Tài Nguyên**:
- Dữ liệu kinh doanh: `customers`, `orders`, `products`
- Quản lý người dùng: `users`, `departments`, `organizationLevels`
- Tài chính: `financialData`, `salaryData`, `budgetData`
- Hệ thống: `settings`, `workflows`, `permissions`

---

### 4. Kiểm Tra Template Quyền (Permission Template Check)

**Mục đích**: Phân giải các template quyền áp dụng dựa trên vai trò và hierarchy của người dùng.

**Các bước kiểm tra**:
- ✅ Lấy các template quyền được gán cho người dùng
- ✅ Xác minh template đang hoạt động và chưa hết hạn
- ✅ Phân giải template dựa trên cấp độ hierarchy
- ✅ Xử lý xung đột ưu tiên template
- ✅ Kiểm tra khả năng tương thích phiên bản template

**Logic Phân Giải Template**:
1. Phân công trực tiếp cho người dùng (ưu tiên cao nhất)
2. Template cấp độ hierarchy
3. Template toàn phòng ban
4. Template mặc định tổ chức

---

### 5. Xác Thực Quyền Hành Động (Action Permission Validation)

**Mục đích**: Xác thực người dùng có quyền thực hiện hành động cụ thể hay không.

**Các bước kiểm tra**:
- ✅ Kiểm tra hành động có được định nghĩa trong template người dùng
- ✅ Xác thực mức độ rủi ro hành động so với quyền người dùng
- ✅ Xác minh danh mục hành động phù hợp với vai trò người dùng
- ✅ Kiểm tra hành động có yêu cầu quy trình phê duyệt không
- ✅ Xác thực các ràng buộc cụ thể của hành động

**Danh Mục Hành Động**:
- `BASIC_CRUD`: Đọc, Tạo, Cập nhật, Xóa
- `ADVANCED`: Xuất, Nhập, Chia sẻ, Xuất bản
- `APPROVAL`: Phê duyệt, Từ chối, Leo thang
- `SYSTEM`: Cấu hình, Giám sát, Kiểm toán
- `BULK_OPERATIONS`: Tạo/Cập nhật/Xóa hàng loạt
- `TEAM_MANAGEMENT`: Quản lý nhóm, Gán nhiệm vụ
- `FINANCIAL`: Truy cập dữ liệu lương, Phê duyệt giao dịch

**Mức Độ Rủi Ro**:
- `LOW`: Các hành động thường có thể truy cập
- `MEDIUM`: Yêu cầu ủy quyền cơ bản
- `HIGH`: Yêu cầu quyền nâng cao
- `CRITICAL`: Yêu cầu ủy quyền cấp cao nhất

---

### 6. Kiểm Tra Quyền Tài Nguyên (Resource Permission Check)

**Mục đích**: Xác minh người dùng có quyền phù hợp trên loại tài nguyên cụ thể.

**Các bước kiểm tra**:
- ✅ Kiểm tra quyền người dùng trên loại tài nguyên
- ✅ Xác thực quy tắc truy cập cụ thể tài nguyên
- ✅ Xác minh quyền danh mục tài nguyên
- ✅ Áp dụng các hạn chế cấp độ tài nguyên
- ✅ Kiểm tra phụ thuộc giữa các tài nguyên

**Cấp Độ Quyền**:
- `READ`: Xem dữ liệu tài nguyên
- `WRITE`: Chỉnh sửa dữ liệu tài nguyên
- `DELETE`: Xóa tài nguyên
- `ADMIN`: Kiểm soát hoàn toàn tài nguyên

---

### 7. Xác Thực Dựa Trên Hierarchy (Hierarchy-based Validation)

**Mục đích**: Áp dụng quy tắc hierarchy tổ chức cho kế thừa và hạn chế quyền.

**Các bước kiểm tra**:
- ✅ Xác minh yêu cầu cấp độ hierarchy tối thiểu
- ✅ Kiểm tra hạn chế cấp độ hierarchy tối đa
- ✅ Xác thực quy tắc truy cập cross-hierarchy
- ✅ Áp dụng lọc dữ liệu dựa trên hierarchy
- ✅ Kiểm tra mối quan hệ cấp dưới/cấp trên

**Cấp Độ Hierarchy** (1-11):
- Cấp 1: CEO (quyền truy cập cao nhất)
- Cấp 2: C-Level Executives
- Cấp 3: VPs
- Cấp 4: Senior Directors
- ...
- Cấp 11: Thực tập sinh/Cấp nhập môn (quyền truy cập thấp nhất)

---

### 8. Kiểm Tra Chính Sách Truy Cập Dữ Liệu (Data Access Policy Check)

**Mục đích**: Áp dụng chính sách truy cập dữ liệu động và quy tắc lọc.

**Các bước kiểm tra**:
- ✅ Lấy các chính sách truy cập dữ liệu áp dụng
- ✅ Đánh giá điều kiện lọc JSON
- ✅ Áp dụng chính sách cụ thể phòng ban
- ✅ Kiểm tra hạn chế cấp độ tổ chức
- ✅ Xử lý quy tắc lọc động

**Thành Phần Chính Sách**:
- `filterConditions`: Quy tắc lọc dựa trên JSON
- `priority`: Thứ tự ưu tiên chính sách
- `isActive`: Trạng thái chính sách
- `applicableToLevels`: Cấp độ hierarchy đích

---

### 9. Quyền Đặc Biệt (Special Permissions)

**Mục đích**: Xử lý các trường hợp quyền đặc biệt và ghi đè.

**Các bước kiểm tra**:
- ✅ Kiểm tra ghi đè quyền người dùng
- ✅ Xác thực quyền hành động hệ thống
- ✅ Xác minh quyền thao tác hàng loạt
- ✅ Kiểm tra quyền truy cập dữ liệu nhạy cảm
- ✅ Áp dụng quy tắc truy cập khẩn cấp

**Loại Quyền Đặc Biệt**:
- Ghi đè cụ thể người dùng
- Quyền truy cập khẩn cấp
- Quyền bảo trì hệ thống
- Quyền truy cập audit trail

---

### 10. Kiểm Tra Dữ Liệu Tài Chính/Nhạy Cảm (Financial/Sensitive Data Checks)

**Mục đích**: Áp dụng bảo mật bổ sung cho việc truy cập dữ liệu tài chính và nhạy cảm.

**Các bước kiểm tra**:
- ✅ Kiểm tra quyền truy cập dữ liệu lương
- ✅ Xác thực quyền giao dịch tài chính
- ✅ Xác minh quyền truy cập thông tin bí mật
- ✅ Kiểm tra quyền truy cập audit log
- ✅ Áp dụng quy tắc phân loại dữ liệu

**Danh Mục Dữ Liệu Nhạy Cảm**:
- `SALARY_DATA`: Thông tin bồi thường nhân viên
- `FINANCIAL_DATA`: Hồ sơ tài chính doanh nghiệp
- `CONFIDENTIAL_INFO`: Thông tin kinh doanh được phân loại
- `AUDIT_LOGS`: Nhật ký bảo mật hệ thống

---

### 11. Hạn Chế Phòng Ban & Nhóm (Department & Team Restrictions)

**Mục đích**: Áp dụng kiểm soát truy cập dựa trên phòng ban và nhóm.

**Các bước kiểm tra**:
- ✅ Kiểm tra quy tắc truy cập dựa trên phòng ban
- ✅ Xác thực quyền quản lý nhóm
- ✅ Áp dụng hạn chế cross-department
- ✅ Kiểm tra quyền truy cập dữ liệu cụ thể nhóm
- ✅ Xác minh quyền mối quan hệ báo cáo

**Quy Tắc Phòng Ban**:
- Cùng phòng ban: Quyền truy cập đầy đủ (dựa trên hierarchy)
- Cross-department: Quyền truy cập hạn chế
- Mối quan hệ báo cáo: Quyền truy cập phân cấp

---

### 12. Điều Kiện Động (Dynamic Conditions)

**Mục đích**: Đánh giá điều kiện cụ thể ngữ cảnh và dựa trên thời gian.

**Các bước kiểm tra**:
- ✅ Áp dụng hạn chế dựa trên thời gian (giờ làm việc)
- ✅ Kiểm tra quy tắc dựa trên IP/vị trí
- ✅ Đánh giá điều kiện cụ thể ngữ cảnh
- ✅ Xác thực điều kiện quy tắc kinh doanh
- ✅ Kiểm tra trạng thái quy trình phê duyệt

**Điều Kiện Động**:
- Cửa sổ thời gian
- Hạn chế địa lý
- Truy cập dựa trên thiết bị
- Quy tắc dựa trên mạng

---

### 13. Kiểm Tra Cache & Hiệu Suất (Cache Check & Performance)

**Mục đích**: Tối ưu hóa hiệu suất thông qua caching thông minh.

**Các bước kiểm tra**:
- ✅ Kiểm tra cache quyền cho kết quả hiện có
- ✅ Áp dụng kết quả đã cache nếu vẫn hợp lệ
- ✅ Cập nhật cache với kết quả quyền mới
- ✅ Triển khai logic vô hiệu hóa cache
- ✅ Giám sát tỷ lệ cache hit

**Chiến Lược Cache**:
- Thời gian cache: Dựa trên tính biến động của quyền
- Cache keys: Tổ hợp User + Resource + Action
- Trigger vô hiệu hóa: Thay đổi quyền, cập nhật người dùng

---

### 14. Kiểm Toán & Ghi Nhật Ký (Audit & Logging)

**Mục đích**: Duy trì audit trail toàn diện cho bảo mật và tuân thủ.

**Các bước kiểm tra**:
- ✅ Ghi nhật ký tất cả nỗ lực kiểm tra quyền
- ✅ Ghi lại nỗ lực truy cập bị từ chối với lý do
- ✅ Theo dõi nỗ lực leo thang đặc quyền
- ✅ Ghi nhật ký sự kiện truy cập dữ liệu nhạy cảm
- ✅ Giám sát mẫu truy cập bất thường

**Thông Tin Kiểm Toán**:
- Định danh người dùng và ngữ cảnh
- Hành động và tài nguyên được yêu cầu
- Kết quả kiểm tra quyền
- Timestamp và thông tin session
- Lý do thất bại (nếu bị từ chối)

---

### 15. Quyết Định Cuối Cùng & Phản Hồi (Final Decision & Response)

**Mục đích**: Kết hợp tất cả kiểm tra và trả về quyết định ủy quyền cuối cùng.

**Các bước kiểm tra**:
- ✅ Kết hợp tất cả kết quả kiểm tra quyền
- ✅ Áp dụng quy tắc giải quyết xung đột
- ✅ Tạo quyết định quyền cuối cùng
- ✅ Cung cấp lý do từ chối chi tiết (nếu có)
- ✅ Trả về phản hồi có cấu trúc

**Định Dạng Phản Hồi**:
```typescript
{
  result: 'GRANTED' | 'DENIED' | 'REQUIRES_APPROVAL',
  reason?: string,
  approvalRequired?: boolean,
  restrictions?: object,
  metadata?: {
    checkDuration: number,
    cacheHit: boolean,
    policiesApplied: string[]
  }
}
```

## Thứ Tự Ưu Tiên Cho Hiệu Suất

### Ưu Tiên Cao (Kiểm Tra Trước)
1. **Kiểm Tra Cache** - Phản hồi nhanh nhất cho yêu cầu lặp lại
2. **Xác Thực Cơ Bản** - Tránh xử lý không cần thiết
3. **Xác Thực Người Dùng** - Điều kiện tiên quyết bảo mật

### Ưu Tiên Trung Bình (Logic Cốt Lõi)
4. **Quyền Dựa Trên Template** - Bao phủ phần lớn trường hợp
5. **Kiểm Tra Hierarchy** - Logic kinh doanh cốt lõi
6. **Quyền Tài Nguyên** - Quy tắc cụ thể object

### Ưu Tiên Thấp (Đánh Giá Phức Tạp)
7. **Chính Sách Truy Cập Dữ Liệu** - Đánh giá JSON phức tạp
8. **Quyền Đặc Biệt** - Trường hợp edge và ghi đè
9. **Điều Kiện Động** - Quy tắc cụ thể ngữ cảnh

## Chiến Lược Xử Lý Lỗi

### Phương Pháp Security-First
- **Mặc định DENY** nếu có lỗi xảy ra trong kiểm tra quyền
- **Ghi nhật ký tất cả lỗi** để debug và giám sát bảo mật
- **Cung cấp thông báo lỗi có ý nghĩa** cho vấn đề truy cập hợp pháp
- **Triển khai cơ chế fallback** cho các hoạt động hệ thống quan trọng

### Danh Mục Lỗi
- `AUTHENTICATION_ERROR`: Vấn đề xác thực người dùng
- `AUTHORIZATION_ERROR`: Quyền bị từ chối
- `SYSTEM_ERROR`: Lỗi kỹ thuật
- `VALIDATION_ERROR`: Tham số yêu cầu không hợp lệ

### Cơ Chế Fallback
- Quy trình truy cập khẩn cấp
- Ghi đè của quản trị viên hệ thống
- Leo thang quyền tạm thời
- Chế độ degradation graceful

## Ghi Chú Triển Khai

### Cân Nhắc Hiệu Suất
- Triển khai điều kiện thoát sớm để giảm thiểu xử lý
- Sử dụng database indexes trên các trường liên quan đến quyền
- Cân nhắc xử lý async cho các hoạt động không chặn
- Giám sát và tối ưu hóa kiểm tra quyền chậm

### Cân Nhắc Bảo Mật
- Không bao giờ tiết lộ logic quyền nội bộ trong thông báo lỗi
- Triển khai giới hạn tỷ lệ cho kiểm tra quyền
- Giám sát nỗ lực leo thang quyền
- Kiểm toán định kỳ phân công quyền

### Khả Năng Bảo Trì
- Giữ logic quyền modular và có thể test được
- Tài liệu hóa thay đổi quy tắc kinh doanh
- Version permission templates và policies
- Triển khai automated testing cho các kịch bản quyền

## Chiến Lược Testing

### Unit Tests
- Test từng bước kiểm tra quyền độc lập
- Mock các dependency bên ngoài
- Xác minh đường dẫn xử lý lỗi
- Test hành vi cache

### Integration Tests
- Test luồng quyền hoàn chỉnh
- Xác minh tương tác cross-module
- Test hiệu suất dưới tải
- Xác thực ghi nhật ký audit

### Security Tests
- Test nỗ lực bypass quyền
- Xác minh bảo vệ leo thang đặc quyền
- Test với yêu cầu malformed
- Xác thực bảo mật thông báo lỗi

---

*Tài liệu này nên được xem xét và cập nhật định kỳ để phản ánh thay đổi trong yêu cầu kinh doanh và chính sách bảo mật.*