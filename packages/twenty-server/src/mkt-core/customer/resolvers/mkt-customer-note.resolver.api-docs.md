# API Documentation - Customer Note Resolver

> **Module**: `mkt-core/customer`
> **File**: `mkt-customer-note.resolver.ts`
> **Version**: 1.0.0
> **Last Updated**: 2026-01-28

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Data Types](#3-data-types)
4. [Queries](#4-queries)
5. [Mutations](#5-mutations)
6. [Error Handling](#6-error-handling)
7. [Usage Examples](#7-usage-examples)
8. [TypeScript Interfaces](#8-typescript-interfaces)

---

## 1. Overview

Customer Note Resolver cung cấp các API GraphQL để quản lý ghi chú khách hàng (Customer Notes) trong hệ thống CRM.

### Tính năng chính

| Feature | Description |
|---------|-------------|
| **List** | Lấy danh sách notes với pagination và filter |
| **Get by ID** | Lấy chi tiết một note |
| **Get Latest** | Lấy note mới nhất của customer |
| **Statistics** | Thống kê notes theo loại |
| **Create** | Tạo mới note cho customer |
| **Update** | Cập nhật content và noteType |
| **Delete** | Xóa note |

### Note Types

| Type | Description | Use Case |
|------|-------------|----------|
| `GENERAL` | Ghi chú chung | Thông tin tổng quan, memo |
| `CALL` | Ghi chú cuộc gọi | Log cuộc gọi với khách hàng |
| `MEETING` | Ghi chú cuộc họp | Nội dung cuộc họp |
| `ISSUE` | Vấn đề/Ticket | Báo cáo vấn đề, support ticket |
| `FOLLOWUP` | Theo dõi | Nhắc nhở follow-up |
| `OTHER` | Khác | Các loại ghi chú khác |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GraphQL Request                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              WorkspaceAuthGuard + UserAuthGuard             │
│                   (Authentication Layer)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 MktCustomerNoteResolver                     │
│         (GraphQL Resolver - Request/Response handling)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 MktCustomerNoteService                      │
│                    (Business Logic)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                MktCustomerNoteRepository                    │
│                    (Data Access Layer)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       PostgreSQL                            │
│                 (mktCustomerNote table)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication

### Required Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Guards Applied
- `WorkspaceAuthGuard`: Xác thực workspace context
- `UserAuthGuard`: Xác thực user trong workspace

### Token Structure (JWT Payload)
```json
{
  "sub": "<user-id>",
  "userId": "<user-id>",
  "workspaceId": "<workspace-id>",
  "workspaceMemberId": "<workspace-member-id>",
  "type": "ACCESS",
  "authProvider": "password",
  "iat": 1769422459,
  "exp": 1777198459
}
```

---

## 3. Data Types

### 3.1 Enum Values

#### Note Type
```typescript
type NoteType = 'GENERAL' | 'CALL' | 'MEETING' | 'ISSUE' | 'FOLLOWUP' | 'OTHER';
```

### 3.2 Input Types

#### CreateCustomerNoteInput
```graphql
input CreateCustomerNoteInput {
  customerId: String!                 # Customer ID (required)
  content: String!                    # Nội dung note (required)
  noteType: NoteType = GENERAL        # Loại note (default: GENERAL)
}
```

#### UpdateCustomerNoteInput
```graphql
input UpdateCustomerNoteInput {
  noteId: String!                     # Note ID (required)
  content: String                     # Nội dung mới
  noteType: NoteType                  # Loại note mới
}
```

#### GetCustomerNotesInput
```graphql
input GetCustomerNotesInput {
  customerId: String!                 # Customer ID (required)
  noteType: NoteType                  # Filter theo loại note
  limit: Int = 50                     # Số records tối đa
  offset: Int = 0                     # Offset cho pagination
}
```

### 3.3 Output Types

#### CustomerNoteOutput
```graphql
type CustomerNoteOutput {
  id: String!                         # Note ID
  content: String!                    # Nội dung note
  noteType: String!                   # GENERAL | CALL | MEETING | ISSUE | FOLLOWUP | OTHER
  customerId: String                  # Customer ID
  createdAt: String!                  # ISO 8601 format
  updatedAt: String!                  # ISO 8601 format
}
```

#### CustomerNoteListOutput
```graphql
type CustomerNoteListOutput {
  items: [CustomerNoteOutput]!        # Danh sách notes
  totalCount: Int!                    # Tổng số notes
}
```

#### DeleteCustomerNoteOutput
```graphql
type DeleteCustomerNoteOutput {
  success: Boolean!                   # Kết quả xóa
  message: String                     # Thông báo
}
```

#### CustomerNoteCountByTypeOutput
```graphql
type CustomerNoteCountByTypeOutput {
  noteType: String!                   # Loại note
  count: Int!                         # Số lượng
}
```

#### CustomerNoteStatisticsOutput
```graphql
type CustomerNoteStatisticsOutput {
  totalNotes: Int!                    # Tổng số notes
  countByType: [CustomerNoteCountByTypeOutput]!  # Thống kê theo loại
}
```

---

## 4. Queries

### 4.1 customerNoteList

Lấy danh sách notes của customer với pagination và filter.

**GraphQL Schema:**
```graphql
type Query {
  customerNoteList(input: GetCustomerNotesInput!): CustomerNoteListOutput!
}
```

**Request:**
```graphql
query CustomerNoteList($input: GetCustomerNotesInput!) {
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

**Variables (Không filter):**
```json
{
  "input": {
    "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
    "limit": 20,
    "offset": 0
  }
}
```

**Variables (Filter theo noteType):**
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

**Response:**
```json
{
  "data": {
    "customerNoteList": {
      "items": [
        {
          "id": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6",
          "content": "**Cuộc gọi hỗ trợ kỹ thuật**\n\nKhách hàng gọi hỏi về việc tích hợp API.",
          "noteType": "CALL",
          "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
          "createdAt": "2026-01-28T02:18:50.332Z",
          "updatedAt": "2026-01-28T02:18:50.332Z"
        },
        {
          "id": "f369b678-0469-4982-8cc1-ac8702b0780e",
          "content": "Follow-up về vấn đề sync",
          "noteType": "FOLLOWUP",
          "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
          "createdAt": "2026-01-28T02:18:50.332Z",
          "updatedAt": "2026-01-28T02:18:50.332Z"
        }
      ],
      "totalCount": 7
    }
  }
}
```

---

### 4.2 customerNoteById

Lấy chi tiết một note theo ID.

**GraphQL Schema:**
```graphql
type Query {
  customerNoteById(noteId: String!): CustomerNoteOutput
}
```

**Request:**
```graphql
query CustomerNoteById($noteId: String!) {
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

**Variables:**
```json
{
  "noteId": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6"
}
```

**Response (Success):**
```json
{
  "data": {
    "customerNoteById": {
      "id": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6",
      "content": "**Cuộc gọi hỗ trợ kỹ thuật**\n\nKhách hàng gọi hỏi về việc tích hợp API.",
      "noteType": "CALL",
      "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
      "createdAt": "2026-01-28T02:18:50.332Z",
      "updatedAt": "2026-01-28T02:18:50.332Z"
    }
  }
}
```

**Response (Not Found):**
```json
{
  "data": {
    "customerNoteById": null
  }
}
```

---

### 4.3 customerNoteLatest

Lấy note mới nhất của customer.

**GraphQL Schema:**
```graphql
type Query {
  customerNoteLatest(customerId: String!): CustomerNoteOutput
}
```

**Request:**
```graphql
query CustomerNoteLatest($customerId: String!) {
  customerNoteLatest(customerId: $customerId) {
    id
    content
    noteType
    createdAt
  }
}
```

**Variables:**
```json
{
  "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9"
}
```

**Response:**
```json
{
  "data": {
    "customerNoteLatest": {
      "id": "590fa7d9-a82c-4952-bf6e-5351e0662ef9",
      "content": "Khách hàng yêu cầu follow-up tuần sau",
      "noteType": "FOLLOWUP",
      "createdAt": "2026-01-28T04:47:16.518Z"
    }
  }
}
```

---

### 4.4 customerNoteStats

Lấy thống kê notes của customer.

**GraphQL Schema:**
```graphql
type Query {
  customerNoteStats(customerId: String!): CustomerNoteStatisticsOutput!
}
```

**Request:**
```graphql
query CustomerNoteStats($customerId: String!) {
  customerNoteStats(customerId: $customerId) {
    totalNotes
    countByType {
      noteType
      count
    }
  }
}
```

**Variables:**
```json
{
  "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9"
}
```

**Response:**
```json
{
  "data": {
    "customerNoteStats": {
      "totalNotes": 7,
      "countByType": [
        { "noteType": "GENERAL", "count": 3 },
        { "noteType": "CALL", "count": 1 },
        { "noteType": "ISSUE", "count": 1 },
        { "noteType": "FOLLOWUP", "count": 2 }
      ]
    }
  }
}
```

---

## 5. Mutations

### 5.1 customerNoteCreate

Tạo mới note cho customer.

**GraphQL Schema:**
```graphql
type Mutation {
  customerNoteCreate(input: CreateCustomerNoteInput!): CustomerNoteOutput!
}
```

**Request:**
```graphql
mutation CustomerNoteCreate($input: CreateCustomerNoteInput!) {
  customerNoteCreate(input: $input) {
    id
    content
    noteType
    customerId
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
    "content": "**Cuộc gọi bán hàng**\n\nKhách hàng quan tâm đến gói Enterprise.\n\n**Next steps:**\n- Gửi báo giá\n- Hẹn demo",
    "noteType": "CALL"
  }
}
```

**Response:**
```json
{
  "data": {
    "customerNoteCreate": {
      "id": "new-note-uuid",
      "content": "**Cuộc gọi bán hàng**\n\nKhách hàng quan tâm đến gói Enterprise.\n\n**Next steps:**\n- Gửi báo giá\n- Hẹn demo",
      "noteType": "CALL",
      "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
      "createdAt": "2026-01-28T05:00:00.000Z"
    }
  }
}
```

---

### 5.2 customerNoteUpdate

Cập nhật note hiện có.

**GraphQL Schema:**
```graphql
type Mutation {
  customerNoteUpdate(input: UpdateCustomerNoteInput!): CustomerNoteOutput!
}
```

**Request:**
```graphql
mutation CustomerNoteUpdate($input: UpdateCustomerNoteInput!) {
  customerNoteUpdate(input: $input) {
    id
    content
    noteType
    updatedAt
  }
}
```

**Variables (Update content):**
```json
{
  "input": {
    "noteId": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6",
    "content": "Nội dung đã được cập nhật"
  }
}
```

**Variables (Update noteType):**
```json
{
  "input": {
    "noteId": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6",
    "noteType": "FOLLOWUP"
  }
}
```

**Variables (Update cả hai):**
```json
{
  "input": {
    "noteId": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6",
    "content": "Đã follow-up với khách hàng",
    "noteType": "FOLLOWUP"
  }
}
```

**Response:**
```json
{
  "data": {
    "customerNoteUpdate": {
      "id": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6",
      "content": "Đã follow-up với khách hàng",
      "noteType": "FOLLOWUP",
      "updatedAt": "2026-01-28T05:10:00.000Z"
    }
  }
}
```

---

### 5.3 customerNoteDelete

Xóa note.

**GraphQL Schema:**
```graphql
type Mutation {
  customerNoteDelete(noteId: String!): DeleteCustomerNoteOutput!
}
```

**Request:**
```graphql
mutation CustomerNoteDelete($noteId: String!) {
  customerNoteDelete(noteId: $noteId) {
    success
    message
  }
}
```

**Variables:**
```json
{
  "noteId": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6"
}
```

**Response (Success):**
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

**Response (Not Found):**
```json
{
  "data": {
    "customerNoteDelete": {
      "success": false,
      "message": "Note not found: invalid-uuid"
    }
  }
}
```

---

## 6. Error Handling

### Error Types

| Error | Cause | Response |
|-------|-------|----------|
| `Note not found: {id}` | Note ID không tồn tại | Query returns `null` / Mutation throws error |
| `Customer not found` | Customer ID không tồn tại | Mutation throws error |
| `UNAUTHENTICATED` | Token không hợp lệ | GraphQL error |
| `FORBIDDEN` | Không có quyền truy cập workspace | GraphQL error |

### Query vs Mutation Error Handling

**Queries**: Trả về `null` khi không tìm thấy
```json
{
  "data": {
    "customerNoteById": null
  }
}
```

**Mutations**: Trả về error trong response
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

## 7. Usage Examples

### 7.1 cURL Examples

**Query - Get notes list:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "query { customerNoteList(input: { customerId: \"uuid\", limit: 10 }) { items { id content noteType createdAt } totalCount } }"
  }'
```

**Query - Get statistics:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "query { customerNoteStats(customerId: \"uuid\") { totalNotes countByType { noteType count } } }"
  }'
```

**Mutation - Create note:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { customerNoteCreate(input: { customerId: \"uuid\", content: \"Test note\", noteType: \"GENERAL\" }) { id content createdAt } }"
  }'
```

**Mutation - Update note:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { customerNoteUpdate(input: { noteId: \"uuid\", content: \"Updated content\" }) { id content updatedAt } }"
  }'
```

**Mutation - Delete note:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { customerNoteDelete(noteId: \"uuid\") { success message } }"
  }'
```

---

## 8. TypeScript Interfaces

```typescript
// ============ Enum Types ============
type NoteType = 'GENERAL' | 'CALL' | 'MEETING' | 'ISSUE' | 'FOLLOWUP' | 'OTHER';

// ============ Input Types ============
type CreateCustomerNoteInput = {
  customerId: string;
  content: string;
  noteType?: NoteType;
};

type UpdateCustomerNoteInput = {
  noteId: string;
  content?: string;
  noteType?: NoteType;
};

type GetCustomerNotesInput = {
  customerId: string;
  noteType?: NoteType;
  limit?: number;      // Default: 50
  offset?: number;     // Default: 0
};

// ============ Output Types ============
type CustomerNoteOutput = {
  id: string;
  content: string;
  noteType: string;
  customerId: string | null;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
};

type CustomerNoteListOutput = {
  items: CustomerNoteOutput[];
  totalCount: number;
};

type DeleteCustomerNoteOutput = {
  success: boolean;
  message?: string;
};

type CustomerNoteCountByTypeOutput = {
  noteType: string;
  count: number;
};

type CustomerNoteStatisticsOutput = {
  totalNotes: number;
  countByType: CustomerNoteCountByTypeOutput[];
};

// ============ React Query Hooks Example ============
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';

// GraphQL Documents
const GET_CUSTOMER_NOTES = `
  query CustomerNoteList($input: GetCustomerNotesInput!) {
    customerNoteList(input: $input) {
      items {
        id
        content
        noteType
        createdAt
        updatedAt
      }
      totalCount
    }
  }
`;

const CREATE_NOTE = `
  mutation CustomerNoteCreate($input: CreateCustomerNoteInput!) {
    customerNoteCreate(input: $input) {
      id
      content
      noteType
      createdAt
    }
  }
`;

const UPDATE_NOTE = `
  mutation CustomerNoteUpdate($input: UpdateCustomerNoteInput!) {
    customerNoteUpdate(input: $input) {
      id
      content
      noteType
      updatedAt
    }
  }
`;

const DELETE_NOTE = `
  mutation CustomerNoteDelete($noteId: String!) {
    customerNoteDelete(noteId: $noteId) {
      success
      message
    }
  }
`;

// Hooks
export const useCustomerNotes = (customerId: string, options?: { noteType?: NoteType; limit?: number }) => {
  return useQuery({
    queryKey: ['customerNotes', customerId, options],
    queryFn: async () => {
      const { customerNoteList } = await graphqlClient.request(GET_CUSTOMER_NOTES, {
        input: {
          customerId,
          noteType: options?.noteType,
          limit: options?.limit ?? 50,
          offset: 0,
        },
      });
      return customerNoteList;
    },
    enabled: !!customerId,
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomerNoteInput) => {
      const { customerNoteCreate } = await graphqlClient.request(CREATE_NOTE, { input });
      return customerNoteCreate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerNotes', variables.customerId] });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCustomerNoteInput) => {
      const { customerNoteUpdate } = await graphqlClient.request(UPDATE_NOTE, { input });
      return customerNoteUpdate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerNotes'] });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { customerNoteDelete } = await graphqlClient.request(DELETE_NOTE, { noteId });
      return customerNoteDelete;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerNotes'] });
    },
  });
};

// Usage in Component
const NotesPanel: React.FC<{ customerId: string }> = ({ customerId }) => {
  const { data, isLoading } = useCustomerNotes(customerId);
  const createNote = useCreateNote();

  const handleAddNote = async (content: string, noteType: NoteType) => {
    await createNote.mutateAsync({
      customerId,
      content,
      noteType,
    });
    toast.success('Note created successfully');
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h3>Notes ({data?.totalCount})</h3>
      {data?.items.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
      <NoteForm onSubmit={handleAddNote} isLoading={createNote.isPending} />
    </div>
  );
};
```

---

## Related Documentation

- [Customer CRUD Resolver API Docs](./mkt-customer.resolver.api-docs.md)
- [Customer Module Overview](../README.md)

---

**Document Version**: 1.0.0
**Author**: Backend Team
**Last Updated**: 2026-01-28
