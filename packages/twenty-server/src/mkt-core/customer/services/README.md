# Marketing Customer Tier Calculation Services

## Tổng quan

Bộ service này cung cấp chức năng tính toán hạng khách hàng dựa trên tổng chi tiêu và số lượng đơn hàng. Service tự động query database để lấy thông tin đơn hàng và tính toán hạng khách hàng.

## Tiêu chí phân hạng khách hàng

### 🥉 Đồng (Bronze) - Khách hàng mới/cơ bản
- **Tổng chi tiêu**: 500,000 - 1,999,999 VND  
- **Số đơn hàng**: 1-4 đơn

### 🥈 Bạc (Silver) - Khách hàng ổn định
- **Tổng chi tiêu**: 2,000,000 - 4,999,999 VND
- **Số đơn hàng**: 5-9 đơn

### 🥇 Vàng (Gold) - Khách hàng trung thành cao  
- **Tổng chi tiêu**: 5,000,000 - 9,999,999 VND
- **Số đơn hàng**: 10-19 đơn

### 💎 Kim Cương (Diamond) - Khách hàng VIP cao cấp nhất
- **Tổng chi tiêu**: ≥ 10,000,000 VND
- **Số đơn hàng**: ≥ 20 đơn

## Các Service

### 1. MktCustomerTierCalculationService

Service cốt lõi thực hiện tính toán hạng khách hàng với query tối ưu.

**Phương thức chính:**
- `calculateCustomerTier(workspaceId, customerId, options?)`: Tính toán hạng khách hàng từ customerId
  - **Mặc định**: Chỉ tính đơn hàng có status 'COMPLETED'
- `calculateCustomerTierFromAllOrders(workspaceId, customerId)`: Tính toán từ tất cả đơn hàng
- `calculateCustomerTierFromCompletedOrders(workspaceId, customerId)`: Tính toán chỉ từ đơn hàng đã hoàn thành (explicit)
- `calculateCustomerTierFromData(customer, orders)`: Tính toán từ dữ liệu có sẵn
- `getTierCriteria()`: Lấy tiêu chí tất cả các hạng
- `checkUpgradeEligibility()`: Kiểm tra khả năng nâng hạng
- `getCompletedOrderStatuses()`: Lấy danh sách status đơn hàng đã hoàn thành

**Giá trị mặc định:**
- `includeOnlyCompletedOrders`: `true` 
- `completedStatuses`: `['COMPLETED']`

**Query Optimization:**
- Sử dụng **aggregation query** (COUNT + SUM) thay vì load toàn bộ orders vào memory
- Một query duy nhất để lấy cả số lượng và tổng chi tiêu
- Hỗ trợ filter theo status đơn hàng (chỉ đơn hàng đã hoàn thành)

**Input chính:**
- `workspaceId`: ID workspace
- `customerId`: ID khách hàng
- `options`: Tùy chọn filter (optional)
  - `includeOnlyCompletedOrders`: Chỉ tính đơn hàng đã hoàn thành (default: `true`)
  - `completedStatuses`: Danh sách status được coi là completed (default: `['COMPLETED']`)

**SQL Query được tạo:**
```sql
-- Mặc định (chỉ đơn hàng COMPLETED)
SELECT COUNT(order.id) as totalOrderCount, 
       COALESCE(SUM(order.totalAmount), 0) as totalOrderValue
FROM mktOrder order 
WHERE order.mktCustomerId = ? 
  AND order.status IN ('COMPLETED')

-- Tất cả đơn hàng
SELECT COUNT(order.id) as totalOrderCount, 
       COALESCE(SUM(order.totalAmount), 0) as totalOrderValue
FROM mktOrder order 
WHERE order.mktCustomerId = ?
```

**Output:**
```typescript
interface CustomerTierResult {
  customerTier: CustomerTier; // Hạng khách hàng
  totalOrderValue: number;    // Tổng chi tiêu
  totalOrderCount: number;    // Số đơn hàng
  customerId: string;         // ID khách hàng
  customerName: string;       // Tên khách hàng
}
```

### 2. MktCustomerTierService

Service tích hợp với database, cung cấp các chức năng CRUD.

**Phương thức:**
- `updateCustomerTier(workspaceId, customerId)`: Cập nhật hạng cho một khách hàng
- `updateAllCustomerTiers(workspaceId)`: Cập nhật hạng cho tất cả khách hàng
- `getCustomerTierStatistics(workspaceId)`: Thống kê phân bố hạng khách hàng
- `getCustomersByTier(workspaceId, tier)`: Lấy danh sách khách hàng theo hạng
- `checkCustomerUpgradeEligibility(workspaceId, customerId)`: Kiểm tra khả năng nâng hạng

### 3. MktCustomerTierDemoService

Service demo minh họa cách sử dụng.

## Cách sử dụng

### Tính toán hạng cho một khách hàng cụ thể:

```typescript
import { MktCustomerTierCalculationService } from './services';

// Inject service
constructor(
  private readonly tierCalculationService: MktCustomerTierCalculationService
) {}

// Sử dụng method chính với customerId (query tối ưu)
// Mặc định: chỉ tính đơn hàng có status 'COMPLETED'
async calculateTier() {
  const workspaceId = 'workspace-123';
  const customerId = 'customer-456';
  
  const result = await this.tierCalculationService.calculateCustomerTier(
    workspaceId,
    customerId
  );
  
  console.log(`Khách hàng: ${result.customerName}`);
  console.log(`Hạng khách hàng: ${result.customerTier}`);
  console.log(`Tổng chi tiêu: ${result.totalOrderValue} VND`);
  console.log(`Số đơn hàng: ${result.totalOrderCount}`);
}

// Tính toán từ TẤT CẢ đơn hàng (bao gồm cả chưa hoàn thành)
async calculateTierFromAllOrders() {
  const result = await this.tierCalculationService.calculateCustomerTierFromAllOrders(
    'workspace-123',
    'customer-456'
  );
  
  console.log(`Hạng (tất cả đơn hàng): ${result.customerTier}`);
}

// Tính toán chỉ từ đơn hàng đã hoàn thành (explicit)
async calculateTierFromCompletedOrders() {
  const result = await this.tierCalculationService.calculateCustomerTierFromCompletedOrders(
    'workspace-123',
    'customer-456'
  );
  
  console.log(`Hạng (chỉ đơn hoàn thành): ${result.customerTier}`);
}

// Tính toán với filter tùy chỉnh
async calculateTierWithCustomFilter() {
  const result = await this.tierCalculationService.calculateCustomerTier(
    'workspace-123',
    'customer-456',
    {
      includeOnlyCompletedOrders: true,
      completedStatuses: ['PAID', 'DELIVERED', 'SUCCESS']
    }
  );
  
  console.log(`Hạng (custom filter): ${result.customerTier}`);
}

// Hoặc sử dụng với dữ liệu có sẵn (không cần query DB)
async calculateTierFromData() {
  const customer = await getCustomer(); // Lấy khách hàng
  const orders = await getCustomerOrders(); // Lấy đơn hàng
  
  const result = this.tierCalculationService.calculateCustomerTierFromData(
    customer,
    orders
  );
  
  console.log(`Hạng khách hàng: ${result.customerTier}`);
}
```

### Cập nhật hạng và lưu vào database:

```typescript
import { MktCustomerTierService } from './services';

constructor(
  private readonly tierService: MktCustomerTierService
) {}

async updateCustomerTier() {
  const workspaceId = 'workspace-123';
  const customerId = 'customer-456';
  
  const result = await this.tierService.updateCustomerTier(
    workspaceId, 
    customerId
  );
  
  console.log(`Đã cập nhật hạng: ${result.customerTier}`);
}
```

### Thống kê hạng khách hàng:

```typescript
async getStatistics() {
  const workspaceId = 'workspace-123';
  
  const stats = await this.tierService.getCustomerTierStatistics(workspaceId);
  
  console.log('Phân bố hạng khách hàng:');
  console.log(`Đồng: ${stats.tierDistribution.Đồng} khách hàng`);
  console.log(`Bạc: ${stats.tierDistribution.Bạc} khách hàng`);
  console.log(`Vàng: ${stats.tierDistribution.Vàng} khách hàng`);
  console.log(`Kim Cương: ${stats.tierDistribution['Kim Cương']} khách hàng`);
}
```

### Kiểm tra khả năng nâng hạng:

```typescript
async checkUpgrade() {
  const upgradeInfo = await this.tierService.checkCustomerUpgradeEligibility(
    'workspace-123',
    'customer-456'
  );
  
  console.log(`Hạng hiện tại: ${upgradeInfo.currentTier}`);
  if (upgradeInfo.canUpgrade) {
    console.log(`Có thể nâng lên hạng: ${upgradeInfo.nextTier}`);
  } else {
    console.log(`Yêu cầu: ${upgradeInfo.requirements}`);
  }
}
```

## Chạy Demo

```typescript
import { MktCustomerTierDemoService } from './services';

constructor(
  private readonly demoService: MktCustomerTierDemoService
) {}

async runDemo() {
  await this.demoService.runAllDemos();
}
```

## Tối ưu hóa Performance

### � **Query Optimization**
- **Trước đây**: Load toàn bộ orders vào memory → tính toán trong code
- **Hiện tại**: Sử dụng aggregation query trực tiếp từ database

### 📊 **Comparison**

**Old Approach:**
```typescript
// Load all orders (có thể rất nhiều records)
const orders = await orderRepository.find({
  where: { mktCustomerId: customerId }
});

// Tính toán trong memory
const totalOrderValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
const totalOrderCount = orders.length;
```

**New Approach (Optimized):**
```typescript
// Single aggregation query
const orderStats = await orderRepository
  .createQueryBuilder('order')
  .select('COUNT(order.id)', 'totalOrderCount')
  .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalOrderValue')
  .where('order.mktCustomerId = :customerId', { customerId })
  .getRawOne();
```

### 💡 **Benefits**
- **Memory Efficient**: Không load data không cần thiết vào memory
- **Network Efficient**: Chỉ truyền kết quả aggregation thay vì toàn bộ records
- **Performance**: Tính toán được thực hiện ở database layer (hiệu quả hơn)
- **Scalable**: Hoạt động tốt với khách hàng có hàng nghìn đơn hàng

### 🎯 **Use Cases**
1. **Tất cả đơn hàng**: `calculateCustomerTier(workspaceId, customerId)`
2. **Chỉ đơn hoàn thành**: `calculateCustomerTierFromCompletedOrders(workspaceId, customerId)`  
3. **Filter custom**: `calculateCustomerTier(workspaceId, customerId, options)`
4. **Từ dữ liệu có sẵn**: `calculateCustomerTierFromData(customer, orders)` (fallback)

## Lưu ý

1. **Database Fields**: Service sử dụng các field `tier` và `totalOrderValue` trong entity MktCustomerWorkspaceEntity để lưu trữ kết quả.

2. **Currency**: Hiện tại chỉ hỗ trợ VND. Có thể mở rộng để hỗ trợ nhiều loại tiền tệ.

3. **Performance**: Service `updateAllCustomerTiers` có thể mất thời gian với workspace lớn. Nên chạy background job.

4. **Validation**: Service không validate dữ liệu input. Nên thêm validation ở tầng controller/resolver.

5. **Error Handling**: Service throw exception khi không tìm thấy dữ liệu. Nên handle exception ở tầng trên.

## Tích hợp

Để tích hợp vào module:

1. Import các service vào module provider
2. Đảm bảo TwentyORMManager được inject đúng cách
3. Tạo scheduled job để tự động cập nhật hạng khách hàng định kỳ
4. Tích hợp vào API/GraphQL resolver để expose ra ngoài