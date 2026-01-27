# Test Report - MktCustomerNote GraphQL API

## Thông tin chung

| Mục | Giá trị |
|-----|---------|
| **Module** | MktCustomerNote |
| **Ngày chạy** | 2026-01-27 18:30:00 |
| **Kết quả** | **27/27 passed (100%)** |
| **Thời gian** | ~30 seconds |

## Tổng kết

| Metric | Giá trị |
|--------|---------|
| ✅ Passed | 27 |
| ❌ Failed | 0 |
| ⏭️ Skipped | 0 |
| **Total** | **27** |

## Sửa lỗi đã thực hiện

### Issue 1: noteType không nhận enum value

**Vấn đề**: GraphQL schema định nghĩa `noteType` là `String`, khi test pass enum value như `CALL` (không có quotes), GraphQL báo lỗi:
```
"String cannot represent a non string value: CALL"
```

**Giải pháp**: Tạo GraphQL enum `MktCustomerNoteTypeEnum` và cập nhật DTO để sử dụng enum thay vì String.

**Files đã sửa**:

1. `constants/mkt-customer-note.constants.ts`:
```typescript
// Thêm GraphQL enum
export enum MktCustomerNoteTypeEnum {
  GENERAL = 'GENERAL',
  CALL = 'CALL',
  MEETING = 'MEETING',
  ISSUE = 'ISSUE',
  FOLLOWUP = 'FOLLOWUP',
  OTHER = 'OTHER',
}

registerEnumType(MktCustomerNoteTypeEnum, {
  name: 'MktCustomerNoteTypeEnum',
  description: 'Customer note type categories',
});
```

2. `dto/customer-note.dto.ts`:
```typescript
// Đổi từ @Field(() => String) thành @Field(() => MktCustomerNoteTypeEnum)
@Field(() => MktCustomerNoteTypeEnum, {
  nullable: true,
  description: 'Note type: GENERAL, CALL, MEETING, ISSUE, FOLLOWUP, OTHER',
  defaultValue: MktCustomerNoteTypeEnum.GENERAL,
})
noteType?: MktCustomerNoteType;
```

## Chi tiết kết quả

### Query Tests (10/10 passed)

| Test ID | Test Name | Status | Details |
|---------|-----------|--------|---------|
| TC-Q1-001 | Lấy notes của customer thành công | ✅ PASS | Trả về items và totalCount |
| TC-Q1-002 | Lấy notes với filter noteType | ✅ PASS | Filter CALL hoạt động |
| TC-Q1-003 | Pagination - offset/limit | ✅ PASS | Pagination hoạt động |
| TC-Q1-005 | Customer ID không tồn tại | ✅ PASS | Trả về empty array |
| TC-Q2-001 | Lấy note theo ID | ✅ PASS | Note found |
| TC-Q2-002 | Note ID không tồn tại | ✅ PASS | Returns null |
| TC-Q3-001 | Lấy note mới nhất | ✅ PASS | Latest note returned |
| TC-Q3-002 | Customer không có notes (latest) | ✅ PASS | Returns null |
| TC-Q4-001 | Lấy statistics | ✅ PASS | Stats returned |
| TC-Q4-002 | Statistics cho customer không có notes | ✅ PASS | totalNotes=0 |

### Mutation Tests - Create (6/6 passed)

| Test ID | Test Name | Status | Details |
|---------|-----------|--------|---------|
| TC-M1-001 | Tạo note với noteType mặc định | ✅ PASS | Default=GENERAL |
| TC-M1-002 | Tạo note với noteType=CALL | ✅ PASS | noteType=CALL |
| TC-M1-003 | Tạo note với tất cả noteTypes | ✅ PASS | All 6 types work |
| TC-M1-005 | Tạo note với rich text | ✅ PASS | Markdown preserved |
| TC-M1-006 | Tạo note với customer không tồn tại | ✅ PASS | Note created (nullable FK) |
| TC-M1-007 | Tạo note với noteType không hợp lệ | ✅ PASS | Error returned |

### Mutation Tests - Update (4/4 passed)

| Test ID | Test Name | Status | Details |
|---------|-----------|--------|---------|
| TC-M2-001 | Cập nhật content thành công | ✅ PASS | Content updated |
| TC-M2-002 | Cập nhật noteType thành công | ✅ PASS | noteType=MEETING |
| TC-M2-003 | Cập nhật cả content và noteType | ✅ PASS | Both updated |
| TC-M2-004 | Cập nhật note không tồn tại | ✅ PASS | Error returned |

### Mutation Tests - Delete (3/3 passed)

| Test ID | Test Name | Status | Details |
|---------|-----------|--------|---------|
| TC-M3-001 | Xóa note thành công | ✅ PASS | success=true |
| TC-M3-002 | Xóa note không tồn tại | ✅ PASS | success=false, not found |
| TC-M3-003 | Xóa note đã bị xóa | ✅ PASS | success=false |

### Security Tests (3/3 passed)

| Test ID | Test Name | Status | Details |
|---------|-----------|--------|---------|
| TC-SEC-001 | SQL Injection trong content | ✅ PASS | Content escaped properly |
| TC-SEC-002 | XSS trong content | ✅ PASS | Content stored safely |
| TC-SEC-003 | Unauthorized access | ✅ PASS | Auth required |

### Integration Tests (1/1 passed)

| Test ID | Test Name | Status | Details |
|---------|-----------|--------|---------|
| TC-INT-001 | CRUD Flow đầy đủ | ✅ PASS | Create→Read→Update→Delete OK |

## GraphQL API Reference

### Queries

#### customerNoteList
```graphql
query {
  customerNoteList(input: {
    customerId: "uuid"
    noteType: CALL  # Optional: GENERAL, CALL, MEETING, ISSUE, FOLLOWUP, OTHER
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
}
```

#### customerNoteById
```graphql
query {
  customerNoteById(noteId: "uuid") {
    id
    content
    noteType
    customerId
    createdAt
    updatedAt
  }
}
```

#### customerNoteLatest
```graphql
query {
  customerNoteLatest(customerId: "uuid") {
    id
    content
    noteType
    createdAt
  }
}
```

#### customerNoteStats
```graphql
query {
  customerNoteStats(customerId: "uuid") {
    totalNotes
    countByType {
      noteType
      count
    }
  }
}
```

### Mutations

#### customerNoteCreate
```graphql
mutation {
  customerNoteCreate(input: {
    customerId: "uuid"
    content: "Note content"
    noteType: CALL  # Optional, default: GENERAL
  }) {
    id
    content
    noteType
  }
}
```

#### customerNoteUpdate
```graphql
mutation {
  customerNoteUpdate(input: {
    noteId: "uuid"
    content: "Updated content"  # Optional
    noteType: MEETING           # Optional
  }) {
    id
    content
    noteType
  }
}
```

#### customerNoteDelete
```graphql
mutation {
  customerNoteDelete(noteId: "uuid") {
    success
    message
  }
}
```

## Note Types (Enum)

| Value | Label | Mô tả |
|-------|-------|-------|
| `GENERAL` | Chung | Ghi chú chung (default) |
| `CALL` | Cuộc gọi | Ghi chú cuộc gọi |
| `MEETING` | Cuộc họp | Ghi chú cuộc họp |
| `ISSUE` | Vấn đề | Báo cáo vấn đề |
| `FOLLOWUP` | Theo dõi | Ghi chú follow-up |
| `OTHER` | Khác | Loại khác |

## Kết luận

✅ **Tất cả 27 test cases đã PASS** sau khi sửa lỗi GraphQL enum.

**Các điểm chính**:
1. API hoạt động đúng theo specification
2. CRUD operations hoàn chỉnh
3. Pagination và filtering hoạt động tốt
4. Security (SQL Injection, XSS, Auth) được bảo vệ
5. Error handling đúng chuẩn
6. noteType đã được chuyển sang GraphQL enum để support cả enum value và string

---
*Generated: 2026-01-27 18:30:00*
