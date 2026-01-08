# MKT Dashboard Utilities

Bộ công cụ utilities được tách ra từ `mkt-license.dashboard.service.ts` để tái sử dụng và duy trì dễ dàng.

## Cấu trúc

```
src/mkt-core/utils/
├── date-range.utils.ts              # Utilities xử lý khoảng thời gian
├── statistics.utils.ts              # Utilities tính toán thống kê
├── dashboard-data-transformer.utils.ts # Utilities biến đổi dữ liệu dashboard
├── array.utils.ts                   # Utilities xử lý mảng
└── index.ts                        # Export tất cả utilities
```

## Các Utilities

### 1. DateRangeUtils
Xử lý các khoảng thời gian thường dùng trong dashboard:

```typescript
// Lấy tháng hiện tại
const currentMonth = DateRangeUtils.getCurrentMonth();

// Lấy tháng trước
const lastMonth = DateRangeUtils.getLastMonth();

// Lấy hôm nay
const today = DateRangeUtils.getToday();

// Lấy 30 ngày gần đây
const last30Days = DateRangeUtils.getLastNDays(30);
```

### 2. StatisticsUtils
Các phép tính thống kê cơ bản:

```typescript
// Tính phần trăm thay đổi
const change = StatisticsUtils.calculatePercentageChange(100, 80); // 25%

// Tính trung bình
const avg = StatisticsUtils.calculateAverage([10, 20, 30]); // 20

// Format số tiền
const currency = StatisticsUtils.formatCurrency(1234.56); // "$1,234.56"
```

### 3. DashboardDataTransformer
Biến đổi dữ liệu thô thành format dashboard:

```typescript
// Transform dữ liệu so sánh
const stats = DashboardDataTransformer.transformCountWithComparison(100, 80);
// { count: 100, percentageChange: 25 }

// Transform dữ liệu thay đổi hàng ngày
const dailyStats = DashboardDataTransformer.transformCountWithDailyChange(50, 45);
// { count: 50, dailyChange: 5 }
```

### 4. ArrayUtils
Xử lý mảng và collections:

```typescript
// Group theo key
const grouped = ArrayUtils.groupBy(items, 'status');

// Tính tổng theo điều kiện
const total = ArrayUtils.sumBy(items, item => item.amount);

// Phân trang
const paginated = ArrayUtils.paginate(items, 1, 10);
```

## Lợi ích

### 1. **Tách biệt logic**
- Logic tính toán không phụ thuộc vào database
- Có thể test độc lập
- Dễ dàng tái sử dụng ở các service khác

### 2. **Maintainability**
- Code rõ ràng, dễ hiểu
- Tách biệt responsibility
- Dễ dàng debug và fix bug

### 3. **Reusability**
- Có thể sử dụng trong nhiều service khác
- Không cần duplicate code
- Consistent logic across application

### 4. **Testability**
- Pure functions, dễ test
- Mock được dễ dàng
- Unit test coverage cao

## Cách sử dụng

```typescript
import {
  DateRangeUtils,
  StatisticsUtils,
  DashboardDataTransformer,
  ArrayUtils,
} from 'src/mkt-core/utils';

// Trong service
export class YourService {
  async getStats() {
    const currentMonth = DateRangeUtils.getCurrentMonth();
    const data = await this.repository.find({
      where: {
        createdAt: MoreThanOrEqual(currentMonth.start)
      }
    });
    
    return DashboardDataTransformer.transformCountWithComparison(
      data.length, 
      previousCount
    );
  }
}
```

## Các utilities có thể mở rộng thêm

1. **ValidationUtils** - Validate dữ liệu
2. **CacheUtils** - Xử lý cache
3. **ExportUtils** - Export dữ liệu (Excel, CSV)
4. **NotificationUtils** - Gửi thông báo
5. **ReportUtils** - Tạo báo cáo