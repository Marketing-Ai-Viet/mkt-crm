# Navigation Configuration System

Hệ thống cấu hình navigation đơn giản sử dụng enum để ẩn các object khỏi menu navigation mà vẫn giữ nguyên chức năng của chúng.

## Tính năng

- ✅ Ẩn các object khỏi navigation menu
- ✅ Giữ nguyên chức năng của các object (có thể truy cập qua URL trực tiếp)
- ✅ Cấu hình đơn giản bằng enum
- ✅ API để lấy cấu hình
- ✅ Không cần database hoặc admin interface

## Cách sử dụng

### 1. Cấu hình mặc định

Các object được ẩn mặc định (được định nghĩa trong enum `HiddenNavigationObject`):
- `mktAttributes` (Attributes)
- `mktVariants` (Variants)
- `mktValues` (Values)
- `mktVariantAttributes` (Variant Attributes)

### 2. API Endpoints

#### Lấy danh sách object bị ẩn
```graphql
query GetHiddenNavigationObjects {
  getHiddenNavigationObjects
}
```

#### Lấy cấu hình navigation đầy đủ
```graphql
query GetNavigationConfiguration {
  getNavigationConfiguration {
    hiddenObjects
  }
}
```

### 3. Sử dụng trong Frontend

```typescript
import { useHiddenNavigationObjects } from '@/object-metadata/hooks/useHiddenNavigationObjects';

// Lấy danh sách object bị ẩn
const { hiddenObjects, loading } = useHiddenNavigationObjects();
```

## Cấu trúc Code

### Backend
- `navigation-config.enum.ts` - Enum định nghĩa các object bị ẩn
- `configuration.service.ts` - Service trả về cấu hình từ enum
- `configuration.resolver.ts` - GraphQL resolver cho API

### Frontend
- `useHiddenNavigationObjects.ts` - Hook để lấy danh sách object bị ẩn
- `useFilteredObjectMetadataItems.ts` - Hook đã được cập nhật để sử dụng API

## Cách hoạt động

1. **Backend**: Enum `HiddenNavigationObject` định nghĩa các object cần ẩn
2. **API**: GraphQL query trả về danh sách object bị ẩn
3. **Frontend**: Hook `useFilteredObjectMetadataItems` lấy danh sách từ API và filter navigation
4. **Filtering**: Các object có `namePlural` trong danh sách bị ẩn sẽ không hiển thị trong navigation

## Mở rộng

Để thêm object mới vào danh sách bị ẩn:

1. Thêm enum value vào `HiddenNavigationObject` trong `navigation-config.enum.ts`
2. Thêm vào mảng `DEFAULT_HIDDEN_NAVIGATION_OBJECTS`
3. Restart server để áp dụng thay đổi

## Troubleshooting

### Object không bị ẩn
- Kiểm tra tên object có đúng không (phải match với `namePlural`)
- Kiểm tra API có trả về đúng dữ liệu không
- Kiểm tra cache của GraphQL client

### Lỗi API
- Kiểm tra GraphQL schema đã được generate chưa
- Kiểm tra authentication/authorization
- Kiểm tra logs của server
