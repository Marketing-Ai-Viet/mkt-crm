# Test Cases - MktCustomerNote GraphQL API

## Thông tin chung

| Mục | Giá trị |
|-----|---------|
| **Module** | MktCustomerNote |
| **Schema** | workspace_1wgvd1injqtife6y4rvfbu3h5 |
| **Table** | customerNoteById |
| **Version** | 1.0.1 |
| **Ngày tạo** | 2026-01-27 |
| **Cập nhật** | 2026-01-27 - Đổi tên operations để tránh conflict |

## GraphQL Operations

| Type | Operation Name | Mô tả |
|------|----------------|-------|
| Query | `customerNoteList` | Lấy danh sách notes với pagination |
| Query | `customerNoteById` | Lấy single note theo ID |
| Query | `customerNoteLatest` | Lấy note mới nhất của customer |
| Query | `customerNoteStats` | Thống kê notes theo type |
| Mutation | `customerNoteCreate` | Tạo note mới |
| Mutation | `customerNoteUpdate` | Cập nhật note |
| Mutation | `customerNoteDelete` | Xóa note |

## Database Schema

### Bảng customerNoteById

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| content | text | NO | - |
| noteType | enum | YES | 'GENERAL' |
| position | double precision | YES | - |
| customerId | uuid | YES | - |
| createdAt | timestamp with time zone | NO | now() |
| updatedAt | timestamp with time zone | NO | now() |
| deletedAt | timestamp with time zone | YES | - |
| createdBySource | enum | NO | 'MANUAL' |
| createdByWorkspaceMemberId | uuid | YES | - |
| createdByName | text | NO | 'System' |
| createdByContext | jsonb | YES | '{}' |

### Note Types (Enum)

| Value | Label | Mô tả |
|-------|-------|-------|
| GENERAL | Chung | Ghi chú chung |
| CALL | Cuộc gọi | Ghi chú cuộc gọi |
| MEETING | Cuộc họp | Ghi chú cuộc họp |
| ISSUE | Vấn đề | Báo cáo vấn đề |
| FOLLOWUP | Theo dõi | Ghi chú follow-up |
| OTHER | Khác | Loại khác |

---

## Test Data từ Database

### Customers hiện có

| ID | Tên | Email | Tier |
|----|-----|-------|------|
| 49868053-4758-457f-9332-6ebd48af7ca6 | Nguyễn Văn An | nguyen.van.an@techcorp.vn | DIAMOND |
| 1e75547f-3d1c-4da8-99a9-b716f3b17ab9 | Trần Thị Bình | tran.thi.binh@innovate.io | GOLD |
| 9c500415-1e6a-4320-8770-a6a33d03f0a2 | Lê Minh Cường | le.minh.cuong@gmail.com | SILVER |
| cbdb1f84-693c-4f66-8049-93169a0231c4 | Phạm Hoàng Dung | pham.hoang.dung@startup.vn | BRONZE |
| 73afeb72-4c3b-49fc-8ea4-9cd345832132 | Võ Thị Em | vo.thi.em@oldcompany.vn | CHURNED |

### Notes hiện có (sample)

| ID | Customer | NoteType | Content (preview) |
|----|----------|----------|-------------------|
| 3e25001e-f42f-40f0-a567-072686884474 | Nguyễn Văn An | GENERAL | Chào mừng khách hàng VIP... |
| 4116f7df-87ed-4a3c-a7bf-81be27d4eb74 | Nguyễn Văn An | MEETING | Cuộc họp review hàng quý Q4/2024... |
| e7ca4624-dc0c-46f2-b189-db55eb3c76d6 | Trần Thị Bình | CALL | Cuộc gọi hỗ trợ kỹ thuật... |
| f369b678-0469-4982-8cc1-ac8702b0780e | Trần Thị Bình | ISSUE | Báo cáo vấn đề: Sync dữ liệu chậm... |

---

## 1. Query: customerNoteList

### Mô tả
Lấy danh sách notes của một customer với phân trang và filtering.

### GraphQL Schema
```graphql
query customerNoteList($input: GetCustomerNotesInput!) {
  customerNoteList(input: $input) {
    items {
      id
      content
      noteType
      customerId
      createdAt
      updatedAt
    }
    totalCount
  }
}
```

### Test Cases

#### TC-Q1-001: Lấy notes của customer thành công
**Mô tả:** Lấy tất cả notes của customer Nguyễn Văn An (DIAMOND)

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "limit": 10,
    "offset": 0
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteList": {
      "items": [
        {
          "id": "3e25001e-f42f-40f0-a567-072686884474",
          "content": "**Chào mừng khách hàng VIP**...",
          "noteType": "GENERAL",
          "customerId": "49868053-4758-457f-9332-6ebd48af7ca6"
        },
        {
          "id": "4116f7df-87ed-4a3c-a7bf-81be27d4eb74",
          "noteType": "MEETING"
        },
        {
          "id": "6769d764-5c54-436a-94ae-35ba830f8df4",
          "noteType": "FOLLOWUP"
        }
      ],
      "totalCount": 3
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] items.length = 3
- [ ] totalCount = 3
- [ ] Tất cả items có customerId = input.customerId

---

#### TC-Q1-002: Lấy notes với filter theo noteType
**Mô tả:** Lấy chỉ notes loại CALL của customer Trần Thị Bình

**Input:**
```json
{
  "input": {
    "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
    "noteType": "CALL",
    "limit": 10,
    "offset": 0
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteList": {
      "items": [
        {
          "id": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6",
          "noteType": "CALL"
        }
      ],
      "totalCount": 3
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] Tất cả items có noteType = "CALL"
- [ ] totalCount phản ánh tổng số notes (không phải filtered count)

---

#### TC-Q1-003: Pagination - Lấy page 2
**Mô tả:** Test phân trang với offset

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "limit": 2,
    "offset": 2
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteList": {
      "items": [
        {
          "id": "6769d764-5c54-436a-94ae-35ba830f8df4",
          "noteType": "FOLLOWUP"
        }
      ],
      "totalCount": 3
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] items.length = 1 (còn lại 1 item sau offset 2)

---

#### TC-Q1-004: Customer không có notes
**Mô tả:** Lấy notes của customer chưa có notes nào

**Input:**
```json
{
  "input": {
    "customerId": "73afeb72-4c3b-49fc-8ea4-9cd345832132",
    "limit": 10,
    "offset": 0
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteList": {
      "items": [],
      "totalCount": 0
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] items.length = 0
- [ ] totalCount = 0

---

#### TC-Q1-005: Customer ID không tồn tại
**Mô tả:** Lấy notes với customerId không tồn tại

**Input:**
```json
{
  "input": {
    "customerId": "00000000-0000-0000-0000-000000000000",
    "limit": 10,
    "offset": 0
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteList": {
      "items": [],
      "totalCount": 0
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] items = []
- [ ] totalCount = 0

---

## 2. Query: customerNoteById

### Mô tả
Lấy một note theo ID.

### GraphQL Schema
```graphql
query customerNoteById($noteId: String!) {
  customerNoteById(noteId: $noteId) {
    id
    content
    noteType
    customerId
    createdAt
    updatedAt
  }
}
```

### Test Cases

#### TC-Q2-001: Lấy note theo ID thành công
**Mô tả:** Lấy thông tin chi tiết của một note

**Input:**
```json
{
  "noteId": "3e25001e-f42f-40f0-a567-072686884474"
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteById": {
      "id": "3e25001e-f42f-40f0-a567-072686884474",
      "content": "**Chào mừng khách hàng VIP**\n\nKhách hàng đã đăng ký gói Enterprise...",
      "noteType": "GENERAL",
      "customerId": "49868053-4758-457f-9332-6ebd48af7ca6"
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] id = input.noteId
- [ ] content không null
- [ ] noteType = "GENERAL"

---

#### TC-Q2-002: Note ID không tồn tại
**Mô tả:** Lấy note với ID không tồn tại

**Input:**
```json
{
  "noteId": "00000000-0000-0000-0000-000000000000"
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteById": null
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] customerNoteById = null

---

#### TC-Q2-003: Note ID invalid format
**Mô tả:** Lấy note với ID không đúng format UUID

**Input:**
```json
{
  "noteId": "invalid-uuid-format"
}
```

**Expected Output:**
```json
{
  "errors": [
    {
      "message": "Invalid UUID format"
    }
  ]
}
```

**Assertions:**
- [ ] HTTP Status: 400 hoặc errors không null

---

## 3. Query: customerNoteLatest

### Mô tả
Lấy note mới nhất của một customer.

### GraphQL Schema
```graphql
query customerNoteLatest($customerId: String!) {
  customerNoteLatest(customerId: $customerId) {
    id
    content
    noteType
    customerId
    createdAt
    updatedAt
  }
}
```

### Test Cases

#### TC-Q3-001: Lấy note mới nhất thành công
**Mô tả:** Lấy note mới nhất của customer Nguyễn Văn An

**Input:**
```json
{
  "customerId": "49868053-4758-457f-9332-6ebd48af7ca6"
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteLatest": {
      "id": "3e25001e-f42f-40f0-a567-072686884474",
      "noteType": "GENERAL",
      "customerId": "49868053-4758-457f-9332-6ebd48af7ca6"
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] Note có createdAt mới nhất trong tất cả notes của customer

---

#### TC-Q3-002: Customer không có notes
**Mô tả:** Lấy note mới nhất của customer chưa có notes

**Input:**
```json
{
  "customerId": "73afeb72-4c3b-49fc-8ea4-9cd345832132"
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteLatest": null
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] customerNoteLatest = null

---

## 4. Query: customerNoteStats

### Mô tả
Lấy thống kê notes theo type cho một customer.

### GraphQL Schema
```graphql
query customerNoteStats($customerId: String!) {
  customerNoteStats(customerId: $customerId) {
    totalNotes
    countByType {
      noteType
      count
    }
  }
}
```

### Test Cases

#### TC-Q4-001: Lấy statistics thành công
**Mô tả:** Lấy thống kê notes của customer Nguyễn Văn An

**Input:**
```json
{
  "customerId": "49868053-4758-457f-9332-6ebd48af7ca6"
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteStats": {
      "totalNotes": 3,
      "countByType": [
        { "noteType": "GENERAL", "count": 1 },
        { "noteType": "MEETING", "count": 1 },
        { "noteType": "FOLLOWUP", "count": 1 }
      ]
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] totalNotes = sum of countByType[].count
- [ ] countByType chỉ chứa các type có count > 0

---

#### TC-Q4-002: Statistics cho customer không có notes
**Mô tả:** Lấy thống kê của customer chưa có notes

**Input:**
```json
{
  "customerId": "73afeb72-4c3b-49fc-8ea4-9cd345832132"
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteStats": {
      "totalNotes": 0,
      "countByType": []
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] totalNotes = 0
- [ ] countByType = []

---

## 5. Mutation: customerNoteCreate

### Mô tả
Tạo note mới cho customer.

### GraphQL Schema
```graphql
mutation customerNoteCreate($input: CreateCustomerNoteInput!) {
  customerNoteCreate(input: $input) {
    id
    content
    noteType
    customerId
    createdAt
    updatedAt
  }
}
```

### Test Cases

#### TC-M1-001: Tạo note thành công với noteType mặc định
**Mô tả:** Tạo note mới không chỉ định noteType

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": "Test note content - created via test case TC-M1-001"
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteCreate": {
      "id": "<generated-uuid>",
      "content": "Test note content - created via test case TC-M1-001",
      "noteType": "GENERAL",
      "customerId": "49868053-4758-457f-9332-6ebd48af7ca6"
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] id là valid UUID
- [ ] noteType = "GENERAL" (default)
- [ ] content = input.content
- [ ] createdAt không null

**Cleanup:**
```graphql
mutation {
  customerNoteDelete(noteId: "<created-id>") {
    success
  }
}
```

---

#### TC-M1-002: Tạo note với noteType cụ thể
**Mô tả:** Tạo note mới với noteType = CALL

**Input:**
```json
{
  "input": {
    "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
    "content": "**Cuộc gọi test**\n\nNội dung cuộc gọi test TC-M1-002",
    "noteType": "CALL"
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteCreate": {
      "noteType": "CALL",
      "content": "**Cuộc gọi test**\n\nNội dung cuộc gọi test TC-M1-002"
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] noteType = "CALL"

**Cleanup:** Xóa note sau khi test

---

#### TC-M1-003: Tạo note với tất cả noteTypes
**Mô tả:** Test tạo note với từng loại noteType

**Test Matrix:**

| Test ID | noteType | Expected Result |
|---------|----------|-----------------|
| TC-M1-003-a | GENERAL | Success |
| TC-M1-003-b | CALL | Success |
| TC-M1-003-c | MEETING | Success |
| TC-M1-003-d | ISSUE | Success |
| TC-M1-003-e | FOLLOWUP | Success |
| TC-M1-003-f | OTHER | Success |

---

#### TC-M1-004: Tạo note với content rỗng
**Mô tả:** Tạo note với content = ""

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": ""
  }
}
```

**Expected Output:**
```json
{
  "errors": [
    {
      "message": "Content cannot be empty"
    }
  ]
}
```

**Assertions:**
- [ ] Trả về error hoặc validation failed
- [ ] Không tạo record mới trong database

---

#### TC-M1-005: Tạo note với rich text content
**Mô tả:** Tạo note với nội dung rich text (markdown)

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": "# Heading 1\n\n**Bold text** and *italic text*\n\n- Bullet 1\n- Bullet 2\n\n```javascript\nconsole.log('code block');\n```",
    "noteType": "GENERAL"
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] content được lưu đầy đủ với formatting

---

#### TC-M1-006: Tạo note với customerId không tồn tại
**Mô tả:** Tạo note cho customer không tồn tại

**Input:**
```json
{
  "input": {
    "customerId": "00000000-0000-0000-0000-000000000000",
    "content": "Test content"
  }
}
```

**Expected Output:**
- Foreign key constraint error hoặc validation error

**Assertions:**
- [ ] Trả về error
- [ ] Message chứa thông tin về customer not found

---

#### TC-M1-007: Tạo note với noteType không hợp lệ
**Mô tả:** Tạo note với noteType không trong enum

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": "Test content",
    "noteType": "INVALID_TYPE"
  }
}
```

**Expected Output:**
```json
{
  "errors": [
    {
      "message": "Invalid noteType value"
    }
  ]
}
```

---

## 6. Mutation: customerNoteUpdate

### Mô tả
Cập nhật note hiện có.

### GraphQL Schema
```graphql
mutation customerNoteUpdate($input: UpdateCustomerNoteInput!) {
  customerNoteUpdate(input: $input) {
    id
    content
    noteType
    customerId
    createdAt
    updatedAt
  }
}
```

### Test Cases

#### TC-M2-001: Cập nhật content thành công
**Mô tả:** Cập nhật nội dung note

**Setup:** Tạo note test trước
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": "Original content"
  }
}
```

**Input:**
```json
{
  "input": {
    "noteId": "<created-note-id>",
    "content": "Updated content - TC-M2-001"
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteUpdate": {
      "id": "<created-note-id>",
      "content": "Updated content - TC-M2-001"
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] content = "Updated content - TC-M2-001"
- [ ] updatedAt > createdAt

**Cleanup:** Xóa note sau test

---

#### TC-M2-002: Cập nhật noteType thành công
**Mô tả:** Thay đổi loại note từ GENERAL sang CALL

**Input:**
```json
{
  "input": {
    "noteId": "<existing-note-id>",
    "noteType": "CALL"
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] noteType = "CALL"
- [ ] content không thay đổi

---

#### TC-M2-003: Cập nhật cả content và noteType
**Mô tả:** Cập nhật đồng thời content và noteType

**Input:**
```json
{
  "input": {
    "noteId": "<existing-note-id>",
    "content": "New content with type change",
    "noteType": "MEETING"
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] content = "New content with type change"
- [ ] noteType = "MEETING"

---

#### TC-M2-004: Cập nhật note không tồn tại
**Mô tả:** Cập nhật note với ID không tồn tại

**Input:**
```json
{
  "input": {
    "noteId": "00000000-0000-0000-0000-000000000000",
    "content": "Updated content"
  }
}
```

**Expected Output:**
```json
{
  "errors": [
    {
      "message": "Note not found: 00000000-0000-0000-0000-000000000000"
    }
  ]
}
```

**Assertions:**
- [ ] Trả về error
- [ ] Message chứa "Note not found"

---

#### TC-M2-005: Cập nhật không có field nào
**Mô tả:** Gửi request update với chỉ noteId, không có content hay noteType

**Input:**
```json
{
  "input": {
    "noteId": "<existing-note-id>"
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] Note không thay đổi (hoặc trả về validation error)

---

## 7. Mutation: customerNoteDelete

### Mô tả
Xóa note.

### GraphQL Schema
```graphql
mutation customerNoteDelete($noteId: String!) {
  customerNoteDelete(noteId: $noteId) {
    success
    message
  }
}
```

### Test Cases

#### TC-M3-001: Xóa note thành công
**Mô tả:** Xóa một note hiện có

**Setup:** Tạo note test
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": "Note to be deleted - TC-M3-001"
  }
}
```

**Input:**
```json
{
  "noteId": "<created-note-id>"
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteDelete": {
      "success": true,
      "message": "Note deleted successfully"
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] success = true
- [ ] message = "Note deleted successfully"

**Verify:**
```graphql
query {
  customerNoteById(noteId: "<deleted-note-id>") {
    id
  }
}
```
- [ ] Trả về null

---

#### TC-M3-002: Xóa note không tồn tại
**Mô tả:** Xóa note với ID không tồn tại

**Input:**
```json
{
  "noteId": "00000000-0000-0000-0000-000000000000"
}
```

**Expected Output:**
```json
{
  "data": {
    "customerNoteDelete": {
      "success": false,
      "message": "Note not found: 00000000-0000-0000-0000-000000000000"
    }
  }
}
```

**Assertions:**
- [ ] HTTP Status: 200
- [ ] success = false
- [ ] message chứa "Note not found"

---

#### TC-M3-003: Xóa note đã bị xóa (soft delete)
**Mô tả:** Xóa note đã bị xóa trước đó

**Setup:**
1. Tạo note
2. Xóa note (lần 1)

**Input:** Xóa note (lần 2)

**Expected Output:**
```json
{
  "data": {
    "customerNoteDelete": {
      "success": false,
      "message": "Note not found"
    }
  }
}
```

---

## 8. Edge Cases & Security Tests

### TC-SEC-001: SQL Injection trong content
**Mô tả:** Test SQL injection trong content field

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": "'; DROP TABLE customerNoteById; --"
  }
}
```

**Assertions:**
- [ ] Note được tạo thành công
- [ ] Content được lưu đúng (escaped)
- [ ] Không có table nào bị drop

---

### TC-SEC-002: XSS trong content
**Mô tả:** Test XSS attack trong content

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": "<script>alert('XSS')</script>"
  }
}
```

**Assertions:**
- [ ] Content được lưu (hoặc sanitized)
- [ ] Khi đọc lại, script không execute

---

### TC-SEC-003: Unauthorized access
**Mô tả:** Truy cập API không có authentication

**Input:** Request không có Authorization header

**Expected Output:**
```json
{
  "errors": [
    {
      "message": "Unauthorized"
    }
  ]
}
```

**Assertions:**
- [ ] HTTP Status: 401 hoặc errors.length > 0

---

### TC-PERF-001: Large content
**Mô tả:** Tạo note với content rất dài (10KB)

**Input:**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "content": "<10KB text content>"
  }
}
```

**Assertions:**
- [ ] Note được tạo thành công
- [ ] Response time < 2 seconds

---

### TC-PERF-002: Batch operations
**Mô tả:** Tạo 100 notes liên tiếp

**Assertions:**
- [ ] Tất cả notes được tạo thành công
- [ ] Average response time < 500ms

---

## 9. Integration Tests

### TC-INT-001: CRUD Flow đầy đủ
**Mô tả:** Test full CRUD workflow

**Steps:**
1. **Create:** Tạo note mới
2. **Read:** Đọc note vừa tạo
3. **Update:** Cập nhật content
4. **Read:** Verify update
5. **Delete:** Xóa note
6. **Read:** Verify deletion

**Assertions:**
- [ ] Tất cả steps thành công
- [ ] Data consistency qua các operations

---

### TC-INT-002: Customer deletion cascade
**Mô tả:** Verify notes bị xóa khi customer bị xóa (CASCADE)

**Setup:**
1. Tạo customer test
2. Tạo 3 notes cho customer

**Action:** Xóa customer

**Verify:**
```sql
SELECT COUNT(*) FROM customerNoteById WHERE customerId = '<customer-id>';
```

**Assertions:**
- [ ] Count = 0 (hoặc tất cả có deletedAt)

---

### TC-INT-003: Concurrent updates
**Mô tả:** Test concurrent updates to same note

**Setup:** Tạo note test

**Action:** 2 requests update đồng thời với content khác nhau

**Assertions:**
- [ ] Không có data corruption
- [ ] Một trong hai content được apply

---

## 10. Test Execution Checklist

### Pre-requisites
- [ ] Database seeded với test data
- [ ] Authentication tokens ready
- [ ] GraphQL client configured

### Test Run Order
1. [ ] Query tests (read operations)
2. [ ] Mutation tests - Create
3. [ ] Mutation tests - Update
4. [ ] Mutation tests - Delete
5. [ ] Edge cases & Security
6. [ ] Integration tests
7. [ ] Performance tests

### Post-test Cleanup
- [ ] Delete all test notes (prefix: "TC-")
- [ ] Verify no orphan data
- [ ] Reset test counters

---

## Appendix: GraphQL Playground Examples

### Full Query Example
```graphql
query FullNoteExample {
  # Get paginated notes
  notes: customerNoteList(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
    limit: 10
    offset: 0
  }) {
    items {
      id
      content
      noteType
      customerId
      createdAt
      updatedAt
    }
    totalCount
  }

  # Get single note
  note: customerNoteById(noteId: "3e25001e-f42f-40f0-a567-072686884474") {
    id
    content
    noteType
  }

  # Get latest note
  latest: customerNoteLatest(customerId: "49868053-4758-457f-9332-6ebd48af7ca6") {
    id
    content
    noteType
  }

  # Get statistics
  stats: customerNoteStats(customerId: "49868053-4758-457f-9332-6ebd48af7ca6") {
    totalNotes
    countByType {
      noteType
      count
    }
  }
}
```

### Full Mutation Example
```graphql
mutation FullNoteMutations {
  # Create note
  create: customerNoteCreate(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
    content: "New note content"
    noteType: CALL
  }) {
    id
    content
    noteType
  }
}

mutation UpdateNote($noteId: String!) {
  update: customerNoteUpdate(input: {
    noteId: $noteId
    content: "Updated content"
    noteType: MEETING
  }) {
    id
    content
    noteType
  }
}

mutation DeleteNote($noteId: String!) {
  delete: customerNoteDelete(noteId: $noteId) {
    success
    message
  }
}
```
