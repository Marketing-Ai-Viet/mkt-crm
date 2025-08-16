# Button Component Fix Summary

## Lỗi đã gặp

### Lỗi: `children` property không tồn tại trong Twenty Button
**File**: `packages/twenty-front/src/modules/object-record/record-table/record-table-header/components/VariantGroupByDropdown.tsx`

**Lỗi**:
```
Property 'children' does not exist on type 'IntrinsicAttributes & { className?: string | undefined; Icon?: IconComponent | undefined; title?: string | undefined; fullWidth?: boolean | undefined; ... 15 more ...; isLoading?: boolean | undefined; } & Pick<...> & ClickOutsideAttributes & { ...; }'
```

**Nguyên nhân**: Twenty Button component không hỗ trợ `children` prop, chỉ hỗ trợ `title` prop

## Cách sửa

### 1. Thay thế Twenty Button bằng styled HTML button

**Trước**:
```tsx
import { Button } from 'twenty-ui/input';

const StyledDropdownButton = styled(Button)`
  // styles...
`;

<StyledDropdownButton
  variant="secondary"
  size="small"
  title="Group by Product"
>
  <IconUsers size={16} />
  Group by
  <IconChevronDown size={16} />
</StyledDropdownButton>
```

**Sau**:
```tsx
const StyledDropdownButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(1)} ${({ theme }) => theme.spacing(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  height: 32px;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.background.transparent.light};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  color: ${({ theme }) => theme.font.color.secondary};
  cursor: pointer;
  transition: all 0.1s ease;
  
  &:hover {
    background: ${({ theme }) => theme.background.tertiary};
  }
  
  &:active {
    background: ${({ theme }) => theme.background.quaternary};
  }
`;

<StyledDropdownButton title="Group by Product">
  <IconUsers size={16} />
  Group by
  <IconChevronDown size={16} />
</StyledDropdownButton>
```

### 2. Loại bỏ props không cần thiết

- Loại bỏ `variant` và `size` props vì HTML button không hỗ trợ
- Giữ lại `title` prop cho accessibility

## API của Twenty Button

### Props được hỗ trợ:
- `title`: Text hiển thị (thay vì children)
- `Icon`: Icon component
- `variant`: 'primary' | 'secondary' | 'tertiary'
- `size`: 'medium' | 'small'
- `accent`: 'default' | 'blue' | 'danger'
- `disabled`: boolean
- `onClick`: function
- `fullWidth`: boolean
- `isLoading`: boolean

### Props KHÔNG được hỗ trợ:
- `children`: Không hỗ trợ, sử dụng `title` thay thế
- `className`: Không hỗ trợ trực tiếp

## Kết quả

- ✅ Lỗi TypeScript đã được sửa
- ✅ Button có thể sử dụng children với styled HTML button
- ✅ Styling phù hợp với Twenty theme
- ✅ Hover và active states hoạt động đúng

## Lưu ý quan trọng

- Twenty Button component chỉ hỗ trợ `title` prop, không hỗ trợ `children`
- Khi cần sử dụng children, sử dụng styled HTML button
- Luôn áp dụng Twenty theme colors và spacing cho consistency
- Đảm bảo accessibility bằng cách sử dụng `title` prop
