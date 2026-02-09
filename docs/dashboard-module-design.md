# Thiết kế Module: MktDashboardModule

> **Ngày tạo**: 2026-02-07
> **Cập nhật**: 2026-02-07 (Review v4 - sửa 6 issues correctness/perf)
> **Trạng thái**: Chờ phê duyệt
> **Module**: `mkt-core/mkt-dashboard`
> **Ảnh hưởng**: MktOrderModule, MktPaymentModule, CustomerModule, MktKpiModule, MktLicenseIntegrationModule, MktRbacEnterpriseGradeModule

---

## 1. Bối cảnh & Mục tiêu

### 1.1 Hiện trạng

Hệ thống CRM hiện có các dữ liệu phục vụ dashboard nhưng chưa có module tổng hợp:

| Dữ liệu | Bảng DB | Số bản ghi (dev) |
|----------|---------|-------------------|
| Đơn hàng | `mktOrder` | 42 (37 COMPLETED, 3 LOCKED, 2 PROCESSING) |
| Khách hàng | `mktCustomer` | 5 (BRONZE/SILVER/GOLD/DIAMOND/CHURNED) |
| Thanh toán | `mktPayment` | 10 (2 CONFIRMED, 2 PENDING, ...) |
| KPI | `mktKpi` | 10 (9 IN_PROGRESS, 1 NOT_ACHIEVED) |
| Hợp đồng | `mktContract` | có dữ liệu |
| Phòng ban | `mktDepartment` | 24 |
| Nhân viên | `workspaceMember` | 4 |
| Báo cáo | `mktReport` | 1 |
| Khuyến mãi | `mktPromotion` | 8 |

**Đã có sẵn:**
- `MktKpiModule` - Hệ thống KPI với template, history
- `MktReportWorkspaceEntity` - Lưu trữ báo cáo
- RBAC resource `DASHBOARD` (id: `918e8492-b1bd-4cc9-959c-9ce5c2537e54`, category: REPORTING)
- Cache key infrastructure tại `mkt-core/infrastructure/redis/constants/cache-keys.constant.ts`
- Block hook factory tại `mkt-core/common/hooks/block-hook.factory.ts`

**Cần tạo mới (trong module này):**
- `DashboardDataTransformer` - Biến đổi dữ liệu thống kê từ raw query sang output DTO
- `StatisticsUtils` - Tính toán thống kê (percentage change, trend detection, growth rate)

### 1.2 Mục tiêu

Xây dựng **MktDashboardModule** cung cấp:
1. **API thống kê tổng hợp** từ nhiều module (Order, Payment, Customer, KPI, Contract)
2. **Widget cấu hình được** - mỗi user/role có layout dashboard riêng
3. **Snapshot định kỳ** - lưu lịch sử dữ liệu dashboard cho trend analysis
4. **Tích hợp RBAC** - Hiển thị dữ liệu theo quyền (@DataScope resource: `'DASHBOARD'`)
5. **Redis caching** - giảm tải query nặng, TTL theo loại widget

> **Lưu ý**: Data Classification (`INTERNAL` cho DASHBOARD) đang ở trạng thái "Chờ phê duyệt" (xem `docs/data-classification-implementation.md`). Module này được thiết kế tương thích - khi Data Classification được triển khai, DASHBOARD sẽ tự động cho phép READ cho tất cả nhân viên mà không cần template.

---

## 2. Thiết kế Tổng thể

### 2.1 Kiến trúc Module

```
┌───────────────────────────────────────────────────────────────┐
│                    GraphQL Resolvers                          │
│  DashboardQueryResolver  │  DashboardWidgetResolver           │
├───────────────────────────────────────────────────────────────┤
│                  Application Services                         │
│              DashboardOrchestratorService                     │
├───────────────┬───────────┬───────────┬───────────┬───────────┤
│   Domain      │  Domain   │  Domain   │  Domain   │  Domain   │
│  Revenue      │  Order    │ Customer  │ Payment   │   KPI     │
│  StatsService │ StatsServ │ StatsServ │ StatsServ │ StatsServ │
├───────────────┴───────────┴───────────┴───────────┴───────────┤
│                    Core Services                              │
│  DashboardCacheService │ DashboardWidgetService │ SnapshotSvc │
├───────────────────────────────────────────────────────────────┤
│                    Repositories                               │
│  DashboardWidgetRepo │ DashboardLayoutRepo │ SnapshotRepo     │
├───────────────────────────────────────────────────────────────┤
│                 External Module Repos (imported)              │
│  MktOrderRepo │ MktCustomerRepo │ MktPaymentRepo │ MktKpiRepo │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Request (GraphQL)
    │
    ▼
[1] JwtAuthGuard + WorkspaceAuthGuard
    │
    ▼
[2] @DataScope({ resource: 'DASHBOARD', mode: 'AUTO' })
    │ (Khi Data Classification triển khai → READ bypass Casbin cho tất cả)
    ▼
[3] DashboardOrchestratorService
    │
    ├──▶ [3a] Check Redis Cache (DashboardCacheService)
    │         ├── HIT  → return cached data
    │         └── MISS → continue
    │
    ├──▶ [3b] Query Domain Stats Services (parallel via Promise.all)
    │         ├── RevenueStatsService  → mktOrder + mktPayment
    │         ├── OrderStatsService    → mktOrder + mktOrderItem
    │         ├── CustomerStatsService → mktCustomer
    │         ├── PaymentStatsService  → mktPayment
    │         └── KpiStatsService      → mktKpi
    │
    ├──▶ [3c] Transform với DashboardDataTransformer + StatisticsUtils (cần tạo mới)
    │
    ├──▶ [3d] Cache result (Redis, TTL theo widget type)
    │
    └──▶ [3e] Return DashboardOutput
```

---

## 3. Workspace Entities

### 3.1 MktDashboardWidgetWorkspaceEntity

Định nghĩa widget (shared, system-level). Vị trí grid nằm ở Layout entity (per-user).

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDashboardWidget,
  namePlural: 'mktDashboardWidgets',
  labelSingular: msg`Dashboard Widget`,
  labelPlural: msg`Dashboard Widgets`,
  description: msg`Configurable dashboard widget for displaying business metrics`,
  icon: 'IconLayoutDashboard',
})
@WorkspaceIsSearchable()
export class MktDashboardWidgetWorkspaceEntity extends BaseWorkspaceEntity {

  // === WIDGET IDENTITY ===
  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetName,
    type: FieldMetadataType.TEXT,
    label: msg`Widget Name`,
    description: msg`Display name of the widget`,
    icon: 'IconTag',
  })
  widgetName: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetCode,
    type: FieldMetadataType.TEXT,
    label: msg`Widget Code`,
    description: msg`Unique code for programmatic reference`,
    icon: 'IconCode',
  })
  widgetCode: string;  // e.g., 'REVENUE_OVERVIEW', 'ORDER_STATUS_CHART'

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetType,
    type: FieldMetadataType.SELECT,
    label: msg`Widget Type`,
    description: msg`Visual type of the widget`,
    icon: 'IconCategory',
    options: MKT_DASHBOARD_WIDGET_TYPE_OPTIONS,
    defaultValue: "'STAT_CARD'",
  })
  widgetType: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.dataSource,
    type: FieldMetadataType.SELECT,
    label: msg`Data Source`,
    description: msg`Data source for the widget`,
    icon: 'IconDatabase',
    options: MKT_DASHBOARD_DATA_SOURCE_OPTIONS,
    defaultValue: "'COMBINED'",
  })
  dataSource: string;

  // === DEFAULT DISPLAY CONFIG ===
  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.defaultColSpan,
    type: FieldMetadataType.NUMBER,
    label: msg`Default Width (columns)`,
    description: msg`Default number of grid columns this widget occupies (1-12)`,
    icon: 'IconColumns',
  })
  defaultColSpan: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.defaultRowSpan,
    type: FieldMetadataType.NUMBER,
    label: msg`Default Height (rows)`,
    description: msg`Default number of grid rows this widget occupies`,
    icon: 'IconRows',
  })
  defaultRowSpan: number;

  // === FILTER & PERIOD ===
  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.defaultPeriod,
    type: FieldMetadataType.SELECT,
    label: msg`Default Period`,
    description: msg`Default time period for data`,
    icon: 'IconCalendar',
    options: MKT_DASHBOARD_PERIOD_OPTIONS,
    defaultValue: "'THIS_MONTH'",
  })
  defaultPeriod: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.filterConfig,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Filter Config`,
    description: msg`Default filter configuration`,
    icon: 'IconFilter',
  })
  @WorkspaceIsNullable()
  filterConfig?: object;
  // { departmentId?, staffId?, customerTier?, orderStatus?, dateRange? }

  // === VISIBILITY & ACCESS ===
  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.visibility,
    type: FieldMetadataType.SELECT,
    label: msg`Visibility`,
    description: msg`Who can see this widget`,
    icon: 'IconEye',
    options: MKT_DASHBOARD_VISIBILITY_OPTIONS,
    defaultValue: "'ALL'",
  })
  visibility: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether the widget is active`,
    icon: 'IconToggleRight',
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.isSystemDefault,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is System Default`,
    description: msg`System default widget, cannot be deleted`,
    icon: 'IconShield',
  })
  isSystemDefault: boolean;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.displayOrder,
    type: FieldMetadataType.NUMBER,
    label: msg`Display Order`,
    description: msg`Default order in the dashboard`,
    icon: 'IconSortAscending',
  })
  displayOrder: number;

  // === CACHE CONFIG ===
  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.cacheTtlSeconds,
    type: FieldMetadataType.NUMBER,
    label: msg`Cache TTL (seconds)`,
    description: msg`Override default cache TTL for this widget`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  cacheTtlSeconds?: number;

  // === METADATA ===
  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetConfig,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Widget Config`,
    description: msg`Extended configuration for rendering`,
    icon: 'IconSettings',
  })
  @WorkspaceIsNullable()
  widgetConfig?: object;
  // { chartColors?, showLegend?, showTrend?, compareWith?, limit? }

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Widget description`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: msg`Search Vector`,
    description: msg`Search vector for full-text search`,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: `setweight(to_tsvector('simple', COALESCE("widgetName", '')), 'A') || setweight(to_tsvector('simple', COALESCE("widgetCode", '')), 'B')`,
  })
  @WorkspaceIsNullable()
  searchVector?: string;

  // === RELATIONS ===
  @WorkspaceRelation({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.owner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Owner`,
    description: msg`Owner of this widget`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'dashboardWidgets',
  })
  @WorkspaceIsNullable()
  owner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('owner')
  ownerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.snapshots,
    type: RelationType.ONE_TO_MANY,
    label: msg`Snapshots`,
    description: msg`Snapshots captured from this widget`,
    icon: 'IconCamera',
    inverseSideTarget: () => MktDashboardSnapshotWorkspaceEntity,
    inverseSideFieldKey: 'widget',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  snapshots: Relation<MktDashboardSnapshotWorkspaceEntity[]>;
}
```

### 3.2 MktDashboardSnapshotWorkspaceEntity

Lưu dữ liệu thống kê định kỳ để phân tích xu hướng (trend).

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDashboardSnapshot,
  namePlural: 'mktDashboardSnapshots',
  labelSingular: msg`Dashboard Snapshot`,
  labelPlural: msg`Dashboard Snapshots`,
  description: msg`Periodic snapshot of dashboard metrics for trend analysis`,
  icon: 'IconCamera',
})
export class MktDashboardSnapshotWorkspaceEntity extends BaseWorkspaceEntity {

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Snapshot Name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.snapshotType,
    type: FieldMetadataType.SELECT,
    label: msg`Snapshot Type`,
    icon: 'IconCalendarRepeat',
    options: MKT_DASHBOARD_SNAPSHOT_TYPE_OPTIONS,
    defaultValue: "'DAILY'",
  })
  snapshotType: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.dataSource,
    type: FieldMetadataType.SELECT,
    label: msg`Data Source`,
    icon: 'IconDatabase',
    options: MKT_DASHBOARD_DATA_SOURCE_OPTIONS,
    defaultValue: "'COMBINED'",
  })
  dataSource: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.snapshotAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Snapshot At`,
    icon: 'IconClock',
  })
  snapshotAt: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.periodStart,
    type: FieldMetadataType.DATE,
    label: msg`Period Start`,
    icon: 'IconCalendarEvent',
  })
  @WorkspaceIsNullable()
  periodStart?: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.periodEnd,
    type: FieldMetadataType.DATE,
    label: msg`Period End`,
    icon: 'IconCalendarDue',
  })
  @WorkspaceIsNullable()
  periodEnd?: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.snapshotData,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Snapshot Data`,
    icon: 'IconBraces',
  })
  snapshotData: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.comparisonData,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Comparison Data`,
    icon: 'IconArrowsExchange',
  })
  @WorkspaceIsNullable()
  comparisonData?: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.checksum,
    type: FieldMetadataType.TEXT,
    label: msg`Checksum`,
    icon: 'IconFingerprint',
  })
  @WorkspaceIsNullable()
  checksum?: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
  })
  createdBy: ActorMetadata;

  // === RELATIONS ===
  @WorkspaceRelation({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.widget,
    type: RelationType.MANY_TO_ONE,
    label: msg`Widget`,
    icon: 'IconLayoutDashboard',
    inverseSideTarget: () => MktDashboardWidgetWorkspaceEntity,
    inverseSideFieldKey: 'snapshots',
  })
  @WorkspaceIsNullable()
  widget: Relation<MktDashboardWidgetWorkspaceEntity> | null;

  @WorkspaceJoinColumn('widget')
  widgetId: string | null;
}
```

### 3.3 MktDashboardLayoutWorkspaceEntity

Lưu layout dashboard cá nhân. **Grid position nằm ở đây** (per-user), không phải ở Widget.

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDashboardLayout,
  namePlural: 'mktDashboardLayouts',
  labelSingular: msg`Dashboard Layout`,
  labelPlural: msg`Dashboard Layouts`,
  description: msg`Personal or role-based dashboard layout configuration`,
  icon: 'IconLayout',
})
export class MktDashboardLayoutWorkspaceEntity extends BaseWorkspaceEntity {

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Layout Name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.layoutType,
    type: FieldMetadataType.SELECT,
    label: msg`Layout Type`,
    icon: 'IconCategory',
    options: MKT_DASHBOARD_LAYOUT_TYPE_OPTIONS,
    defaultValue: "'PERSONAL'",
  })
  layoutType: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.widgetOrder,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Widget Order`,
    description: msg`Ordered widget positions and visibility`,
    icon: 'IconLayoutGrid',
  })
  widgetOrder: object;
  // Array: [{ widgetId, gridCol, gridRow, colSpan, rowSpan, isVisible }]

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.globalFilters,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Global Filters`,
    icon: 'IconFilter',
  })
  @WorkspaceIsNullable()
  globalFilters?: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.isDefault,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Default`,
    icon: 'IconStar',
  })
  isDefault: boolean;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    icon: 'IconToggleRight',
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
  })
  createdBy: ActorMetadata;

  // === RELATIONS ===
  @WorkspaceRelation({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.owner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Owner`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'dashboardLayouts',
  })
  @WorkspaceIsNullable()
  owner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('owner')
  ownerId: string | null;
}
```

### 3.4 Thay đổi WorkspaceMember (bắt buộc)

Widget entity (section 3.1) và Layout entity (section 3.3) khai báo relation `inverseSideFieldKey: 'dashboardWidgets'` và `'dashboardLayouts'`. Cần thêm 2 relation vào `WorkspaceMemberMktEntity` tại `mkt-core/mkt-entities-extends/workspace-member.mkt-entity.ts`:

```typescript
// Thêm vào WorkspaceMemberMktEntity

@WorkspaceRelation({
  standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.dashboardWidgets,
  type: RelationType.ONE_TO_MANY,
  label: msg`Dashboard Widgets`,
  description: msg`Dashboard widgets owned by this member`,
  icon: 'IconLayoutDashboard',
  inverseSideTarget: () => MktDashboardWidgetWorkspaceEntity,
  inverseSideFieldKey: 'owner',
})
dashboardWidgets: Relation<MktDashboardWidgetWorkspaceEntity[]>;

@WorkspaceRelation({
  standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.dashboardLayouts,
  type: RelationType.ONE_TO_MANY,
  label: msg`Dashboard Layouts`,
  description: msg`Dashboard layouts owned by this member`,
  icon: 'IconLayout',
  inverseSideTarget: () => MktDashboardLayoutWorkspaceEntity,
  inverseSideFieldKey: 'owner',
})
dashboardLayouts: Relation<MktDashboardLayoutWorkspaceEntity[]>;
```

> **Cần thêm** 2 field IDs (`dashboardWidgets`, `dashboardLayouts`) vào `WORKSPACE_MEMBER_MKT_FIELD_IDS` trong `mkt-field-ids.ts`.

---

## 4. Constants

### 4.1 Object IDs (thêm vào `mkt-object-ids.ts`)

```typescript
// Dashboard module
mktDashboardWidget: '<uuid-mới-1>',
mktDashboardSnapshot: '<uuid-mới-2>',
mktDashboardLayout: '<uuid-mới-3>',
```

### 4.2 Field IDs (thêm vào `mkt-field-ids.ts`)

```typescript
export const MKT_DASHBOARD_WIDGET_FIELD_IDS = {
  widgetName: '<uuid>', widgetCode: '<uuid>', widgetType: '<uuid>',
  dataSource: '<uuid>', defaultColSpan: '<uuid>', defaultRowSpan: '<uuid>',
  defaultPeriod: '<uuid>', filterConfig: '<uuid>', visibility: '<uuid>',
  isActive: '<uuid>', isSystemDefault: '<uuid>', displayOrder: '<uuid>',
  cacheTtlSeconds: '<uuid>', widgetConfig: '<uuid>', description: '<uuid>',
  position: '<uuid>', createdBy: '<uuid>', searchVector: '<uuid>',
  owner: '<uuid>', snapshots: '<uuid>',
};

export const MKT_DASHBOARD_SNAPSHOT_FIELD_IDS = {
  name: '<uuid>', snapshotType: '<uuid>', dataSource: '<uuid>',
  snapshotAt: '<uuid>', periodStart: '<uuid>', periodEnd: '<uuid>',
  snapshotData: '<uuid>', comparisonData: '<uuid>', checksum: '<uuid>',
  position: '<uuid>', createdBy: '<uuid>', widget: '<uuid>',
};

export const MKT_DASHBOARD_LAYOUT_FIELD_IDS = {
  name: '<uuid>', layoutType: '<uuid>', widgetOrder: '<uuid>',
  globalFilters: '<uuid>', isDefault: '<uuid>', isActive: '<uuid>',
  position: '<uuid>', createdBy: '<uuid>', owner: '<uuid>',
};
```

### 4.3 Cache Keys (thêm vào `infrastructure/redis/constants/cache-keys.constant.ts`)

Tuân theo convention `mkt:{domain}:{subtype}` (xem file hiện tại: LICENSE_CACHE_PREFIX, ORDER_CACHE_PREFIX, ...):

```typescript
// ============================================
// DASHBOARD DOMAIN
// ============================================

export const DASHBOARD_CACHE_PREFIX = {
  /** Dashboard summary data: mkt:dashboard:summary:{workspaceId}:{period}:{filterHash} */
  SUMMARY: 'mkt:dashboard:summary',

  /** Dashboard stats data: mkt:dashboard:stats:{workspaceId}:{dataSource}:{period} */
  STATS: 'mkt:dashboard:stats',

  /** Dashboard alerts: mkt:dashboard:alerts:{workspaceId} */
  ALERTS: 'mkt:dashboard:alerts',

  /** Dashboard leaderboard: mkt:dashboard:leaderboard:{workspaceId}:{period} */
  LEADERBOARD: 'mkt:dashboard:leaderboard',

  /** Widget config: mkt:dashboard:widget:{widgetId} */
  WIDGET: 'mkt:dashboard:widget',

  /** User layout: mkt:dashboard:layout:{userId} */
  LAYOUT: 'mkt:dashboard:layout',
} as const;

// Cũng cần thêm vào MKT_CACHE_PREFIX:
// DASHBOARD: DASHBOARD_CACHE_PREFIX,
// Và thêm vào union type MktCachePrefix

export const DASHBOARD_CACHE_TTL = {
  SUMMARY: 300,       // 5 phút - aggregate data
  STATS: 300,         // 5 phút - domain-specific stats (revenue, orders, customers, payments, kpis)
  ALERTS: 120,        // 2 phút - cần realtime hơn
  LEADERBOARD: 600,   // 10 phút
  WIDGET: 3600,       // 1 giờ - config ít thay đổi
  LAYOUT: 3600,       // 1 giờ - config ít thay đổi
} as const;
```

> **Ghi chú**: Các domain stats riêng lẻ (revenue, orders, customers, payments, kpis) dùng chung prefix `STATS` với `dataSource` làm phần phân biệt trong cache key, thay vì tạo prefix riêng cho từng loại. Ví dụ: `mkt:dashboard:stats:{wsId}:REVENUE:{period}`, `mkt:dashboard:stats:{wsId}:ORDERS:{period}`.

### 4.4 Widget Type Options

```typescript
// mkt-dashboard/constants/dashboard-options.ts
import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export const MKT_DASHBOARD_WIDGET_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'STAT_CARD', label: 'Stat Card', color: 'blue', position: 0 },
  { value: 'LINE_CHART', label: 'Line Chart', color: 'green', position: 1 },
  { value: 'BAR_CHART', label: 'Bar Chart', color: 'purple', position: 2 },
  { value: 'PIE_CHART', label: 'Pie Chart', color: 'orange', position: 3 },
  { value: 'TABLE', label: 'Data Table', color: 'gray', position: 4 },
  { value: 'KPI_SCORECARD', label: 'KPI Scorecard', color: 'red', position: 5 },
  { value: 'LEADERBOARD', label: 'Leaderboard', color: 'yellow', position: 6 },
  { value: 'TREND_CHART', label: 'Trend Chart', color: 'turquoise', position: 7 },
];

// Lưu ý: LICENSES bị loại vì License là external integration (MKT Server),
// không phải workspace entity → không có truy vấn trực tiếp trong DB.
// Nếu cần thêm sau, tạo LicenseStatsService gọi MktLicenseProxyService.
export const MKT_DASHBOARD_DATA_SOURCE_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'REVENUE', label: 'Revenue', color: 'green', position: 0 },
  { value: 'ORDERS', label: 'Orders', color: 'blue', position: 1 },
  { value: 'CUSTOMERS', label: 'Customers', color: 'purple', position: 2 },
  { value: 'PAYMENTS', label: 'Payments', color: 'orange', position: 3 },
  { value: 'KPIS', label: 'KPIs', color: 'red', position: 4 },
  { value: 'CONTRACTS', label: 'Contracts', color: 'gray', position: 5 },
  { value: 'COMBINED', label: 'Combined', color: 'turquoise', position: 6 },
];

export const MKT_DASHBOARD_PERIOD_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'TODAY', label: 'Today', color: 'blue', position: 0 },
  { value: 'THIS_WEEK', label: 'This Week', color: 'green', position: 1 },
  { value: 'THIS_MONTH', label: 'This Month', color: 'purple', position: 2 },
  { value: 'THIS_QUARTER', label: 'This Quarter', color: 'orange', position: 3 },
  { value: 'THIS_YEAR', label: 'This Year', color: 'red', position: 4 },
  { value: 'CUSTOM', label: 'Custom Range', color: 'gray', position: 5 },
];

export const MKT_DASHBOARD_VISIBILITY_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'ALL', label: 'All Employees', color: 'green', position: 0 },
  { value: 'ROLE_BASED', label: 'Role Based', color: 'blue', position: 1 },
  { value: 'PERSONAL', label: 'Personal Only', color: 'gray', position: 2 },
];

export const MKT_DASHBOARD_SNAPSHOT_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'DAILY', label: 'Daily', color: 'green', position: 0 },
  { value: 'WEEKLY', label: 'Weekly', color: 'blue', position: 1 },
  { value: 'MONTHLY', label: 'Monthly', color: 'purple', position: 2 },
  { value: 'QUARTERLY', label: 'Quarterly', color: 'orange', position: 3 },
  { value: 'ON_DEMAND', label: 'On Demand', color: 'gray', position: 4 },
];

export const MKT_DASHBOARD_LAYOUT_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'PERSONAL', label: 'Personal', color: 'blue', position: 0 },
  { value: 'ROLE_BASED', label: 'Role Based', color: 'green', position: 1 },
  { value: 'SYSTEM_DEFAULT', label: 'System Default', color: 'purple', position: 2 },
];
```

### 4.5 Block Hook Config

```typescript
// mkt-dashboard/constants/dashboard-block-hooks.constants.ts
import { createBlockHooks, BlockHookConfig } from 'src/mkt-core/common/hooks/block-hook.factory';

const DASHBOARD_WIDGET_BLOCK_CONFIG: BlockHookConfig = {
  entityName: 'mktDashboardWidget',
  logContext: 'Dashboard:BlockHook',
  blockedMessage: 'Use Dashboard GraphQL API instead of auto-generated operations',
  // Omit blockedOperations → block ALL auto-generated operations (queries + mutations)
};

const dashboardBlockHooks = createBlockHooks(DASHBOARD_WIDGET_BLOCK_CONFIG);
export const DASHBOARD_WIDGET_BLOCK_HOOKS = dashboardBlockHooks.providers;
export const DASHBOARD_BLOCKED_OPERATIONS = dashboardBlockHooks.blockedOperations;

export const DASHBOARD_BLOCK_HOOKS = [
  ...DASHBOARD_WIDGET_BLOCK_HOOKS,
];
```

---

## 5. GraphQL API Design

### 5.1 Dashboard Summary Query (chính)

```graphql
query getDashboardSummary($input: DashboardSummaryInput!) {
  dashboardSummary(input: $input) {
    period { start, end, periodType }
    revenue {
      totalRevenue
      previousPeriodRevenue
      percentageChange
      trend
      revenueByMonth { period, amount }
    }
    orders {
      totalOrders
      ordersByStatus { status, count, totalAmount }
      newOrdersThisPeriod
      previousPeriodOrders
      percentageChange
      averageOrderValue
    }
    customers {
      totalCustomers
      newCustomersThisPeriod
      previousPeriodNewCustomers
      percentageChange
      customersByTier { tier, count }
      customersByLifecycle { stage, count }
      churnRate
      topCustomers { id, name, totalOrderValue, tier }
    }
    payments {
      totalCollected
      pendingAmount
      collectionRate
      paymentsByStatus { status, count, amount }
      overduePayments
    }
    kpis {
      totalKpis
      achievedCount
      inProgressCount
      achievementRate
      kpisByCategory { category, total, achieved, rate }
      topKpis { kpiName, targetValue, actualValue, progress }
    }
    contracts {
      totalActive
      expiringThisMonth
      newThisPeriod
    }
    alerts {
      overdueOrders { id, orderCode, daysOverdue }
      expiringContracts { id, name, daysToExpiry }
      pendingPayments { id, name, amount, daysPending }
      underperformingKpis { kpiName, progress, target }
    }
  }
}
```

### 5.2 Domain-specific Queries

```graphql
query getRevenueStats($input: RevenueStatsInput!) {
  revenueStats(input: $input) {
    totalRevenue
    revenueByPeriod { period, amount, orderCount }
    revenueByDepartment { departmentName, amount, percentage }
    revenueByStaff { staffName, amount, orderCount, rank }
    growthRate
    projectedRevenue
  }
}

query getOrderStats($input: OrderStatsInput!) {
  orderStats(input: $input) {
    ordersByStatus { status, count, totalAmount }
    orderTrend { period, count, amount }
    averageOrderValue
    averageProcessingTime
    conversionRate
    topProducts { productName, quantity, revenue }
  }
}

query getCustomerStats($input: CustomerStatsInput!) {
  customerStats(input: $input) {
    customersByTier { tier, count, totalLtv }
    customerGrowth { period, newCustomers, churnedCustomers, netGrowth }
    averageLtv
    churnRate
    engagementDistribution { range, count }
    topCustomersByRevenue { name, revenue, orderCount }
  }
}

query getKpiScorecard($input: KpiScorecardInput!) {
  kpiScorecard(input: $input) {
    overallAchievementRate
    kpisByCategory { category, kpis { name, target, actual, progress, status } }
    trends { period, achievementRate }
  }
}

query getStaffLeaderboard($input: LeaderboardInput!) {
  staffLeaderboard(input: $input) {
    rankings {
      rank, staffName, departmentName, revenue,
      orderCount, newCustomers, kpiAchievement, overallScore
    }
    period { start, end }
  }
}
```

### 5.3 Widget Management Mutations

```graphql
mutation createDashboardWidget($input: CreateDashboardWidgetInput!) {
  createDashboardWidget(input: $input) { id, widgetName, widgetCode }
}

mutation updateWidgetPosition($input: UpdateWidgetPositionInput!) {
  updateWidgetPosition(input: $input) { id, gridCol, gridRow }
}

mutation saveDashboardLayout($input: SaveDashboardLayoutInput!) {
  saveDashboardLayout(input: $input) { id, name }
}

mutation createDashboardSnapshot($input: CreateSnapshotInput!) {
  createDashboardSnapshot(input: $input) { id, name, snapshotAt }
}
```

---

## 6. Service Layer

### 6.1 Core Services

| Service | Nhiệm vụ |
|---------|---------|
| `DashboardCacheService` | Redis caching, invalidation, dùng `@InjectCacheStorage()` |
| `DashboardWidgetService` | CRUD widget |
| `DashboardSnapshotService` | Tạo & query snapshots, SHA-256 integrity check |
| `DashboardDateRangeService` | Parse period input (TODAY/THIS_WEEK/...) thành date range, dùng `DateTimeUtils` |

### 6.2 Domain Stats Services

| Service | Data Source | Trách nhiệm |
|---------|-------------|------------|
| `RevenueStatsService` | `mktOrder` + `mktPayment` | Doanh thu theo kỳ, theo phòng ban, trend |
| `OrderStatsService` | `mktOrder` + `mktOrderItem` | Số đơn theo status, giá trị trung bình, top sản phẩm |
| `CustomerStatsService` | `mktCustomer` | Khách hàng theo tier/lifecycle, churn rate, LTV |
| `PaymentStatsService` | `mktPayment` | Tỷ lệ thu, pending, overdue |
| `KpiStatsService` | `mktKpi` | Tỷ lệ đạt KPI, scorecard, theo category |
| `ContractStatsService` | `mktContract` | Hợp đồng sắp hết hạn, active count |
| `StaffLeaderboardService` | `mktOrder` + `mktCustomer` + `mktKpi` | Xếp hạng nhân viên |
| `AlertsService` | Multiple tables | Cảnh báo overdue, expiring, underperforming |

### 6.3 Application Service

```typescript
@Injectable()
export class DashboardOrchestratorService {
  constructor(
    private readonly cacheService: DashboardCacheService,
    private readonly dateRangeService: DashboardDateRangeService,
    private readonly revenueStats: RevenueStatsService,
    private readonly orderStats: OrderStatsService,
    private readonly customerStats: CustomerStatsService,
    private readonly paymentStats: PaymentStatsService,
    private readonly kpiStats: KpiStatsService,
    private readonly contractStats: ContractStatsService,
    private readonly alertsService: AlertsService,
  ) {}

  async getDashboardSummary(
    workspaceId: string,
    input: DashboardSummaryInput,
    context: GraphQLContext,
  ): Promise<DashboardSummaryOutput> {
    const { startDate, endDate } = this.dateRangeService.resolve(input.period);

    // 1. Check cache
    const cacheKey = this.cacheService.buildSummaryKey(workspaceId, input);
    const cached = await this.cacheService.get<DashboardSummaryOutput>(cacheKey);
    if (cached) return cached;

    // 2. Query all domain stats IN PARALLEL
    const [revenue, orders, customers, payments, kpis, contracts, alerts] =
      await Promise.all([
        this.revenueStats.getStats(workspaceId, startDate, endDate, context),
        this.orderStats.getStats(workspaceId, startDate, endDate, context),
        this.customerStats.getStats(workspaceId, startDate, endDate, context),
        this.paymentStats.getStats(workspaceId, startDate, endDate, context),
        this.kpiStats.getStats(workspaceId, startDate, endDate, context),
        this.contractStats.getStats(workspaceId, startDate, endDate, context),
        this.alertsService.getAlerts(workspaceId, context),
      ]);

    const result: DashboardSummaryOutput = {
      period: { start: startDate, end: endDate, periodType: input.period },
      revenue, orders, customers, payments, kpis, contracts, alerts,
    };

    // 3. Cache (5 phút cho summary)
    await this.cacheService.set(cacheKey, result, DASHBOARD_CACHE_TTL.SUMMARY);

    return result;
  }
}
```

### 6.4 DataSource → Service Mapping

Orchestrator dùng mapping để biết widgetCode/dataSource gọi service nào:

```typescript
// mkt-dashboard/constants/dashboard-service-mapping.ts

import { DashboardDataSource } from '../types/dashboard-data-source.type';

export type DataSourceServiceKey =
  | 'revenue' | 'orders' | 'customers'
  | 'payments' | 'kpis' | 'contracts'
  | 'leaderboard' | 'alerts';

/**
 * Mapping dataSource → service method trong DashboardOrchestratorService.
 * COMBINED gọi tất cả services qua Promise.all.
 */
export const DATA_SOURCE_SERVICE_MAP: Record<
  Exclude<DashboardDataSource, 'COMBINED'>,
  DataSourceServiceKey
> = {
  REVENUE: 'revenue',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  PAYMENTS: 'payments',
  KPIS: 'kpis',
  CONTRACTS: 'contracts',
} as const;

/**
 * Mapping widgetCode → dataSource (dùng khi fetch data cho individual widget).
 */
export const WIDGET_CODE_DATA_SOURCE_MAP: Record<string, DashboardDataSource> = {
  TOTAL_REVENUE: 'REVENUE',
  REVENUE_TREND: 'REVENUE',
  TOTAL_ORDERS: 'ORDERS',
  ORDER_STATUS_DIST: 'ORDERS',
  TOTAL_CUSTOMERS: 'CUSTOMERS',
  CUSTOMER_TIER_DIST: 'CUSTOMERS',
  CUSTOMER_GROWTH: 'CUSTOMERS',
  TOP_CUSTOMERS: 'CUSTOMERS',
  COLLECTION_RATE: 'PAYMENTS',
  PAYMENT_STATUS: 'PAYMENTS',
  KPI_SCORECARD: 'KPIS',
  CONTRACT_SUMMARY: 'CONTRACTS',
  STAFF_LEADERBOARD: 'COMBINED',
  ALERTS_PANEL: 'COMBINED',
} as const;
```

Trong `DashboardOrchestratorService`, khi fetch data cho single widget:

```typescript
async getWidgetData(workspaceId: string, widgetCode: string, input: WidgetDataInput): Promise<unknown> {
  const dataSource = WIDGET_CODE_DATA_SOURCE_MAP[widgetCode];
  if (!dataSource) {
    throw new NotFoundException(`Unknown widget code: ${widgetCode}`);
  }

  if (dataSource === 'COMBINED') {
    return this.getDashboardSummary(workspaceId, input);
  }

  const serviceKey = DATA_SOURCE_SERVICE_MAP[dataSource];
  const { startDate, endDate } = this.dateRangeService.resolve(input.period);
  return this[`${serviceKey}Stats`].getStats(workspaceId, startDate, endDate);
}
```

### 6.5 Zod Schemas cho RAW_JSON Fields

Theo pattern codebase (`mkt-rbac-enterprise-grade/casbin/config/rbac-config.schema.ts`):

```typescript
// mkt-dashboard/types/dashboard-config.schema.ts
import { z } from 'zod';

/**
 * Schema cho Widget.filterConfig (RAW_JSON)
 */
export const widgetFilterConfigSchema = z.object({
  departmentId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  customerTier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'DIAMOND']).optional(),
  orderStatus: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'LOCKED', 'PROCESSING']).optional(),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
}).strict();

export type WidgetFilterConfig = z.infer<typeof widgetFilterConfigSchema>;

/**
 * Schema cho Widget.widgetConfig (RAW_JSON)
 */
export const widgetDisplayConfigSchema = z.object({
  chartColors: z.array(z.string()).max(10).optional(),
  showLegend: z.boolean().optional(),
  showTrend: z.boolean().optional(),
  compareWithPreviousPeriod: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(10),
}).strict();

export type WidgetDisplayConfig = z.infer<typeof widgetDisplayConfigSchema>;

/**
 * Schema cho Layout.widgetOrder (RAW_JSON)
 */
export const widgetOrderItemSchema = z.object({
  widgetCode: z.string().min(1),
  gridCol: z.number().int().min(1).max(12),
  gridRow: z.number().int().min(1),
  colSpan: z.number().int().min(1).max(12),
  rowSpan: z.number().int().min(1).max(4),
  isVisible: z.boolean(),
});

export const widgetOrderSchema = z.array(widgetOrderItemSchema).max(20);

export type WidgetOrderItem = z.infer<typeof widgetOrderItemSchema>;

/**
 * Schema cho Layout.globalFilters (RAW_JSON)
 */
export const globalFiltersSchema = z.object({
  period: z.enum(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'CUSTOM']).optional(),
  departmentId: z.string().uuid().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
}).strict();

export type GlobalFilters = z.infer<typeof globalFiltersSchema>;
```

Validation áp dụng tại **service layer** (không phải entity):

```typescript
// Trong DashboardWidgetService
async createWidget(input: CreateDashboardWidgetInput): Promise<...> {
  if (input.filterConfig) {
    widgetFilterConfigSchema.parse(input.filterConfig);
  }
  if (input.widgetConfig) {
    widgetDisplayConfigSchema.parse(input.widgetConfig);
  }
  // ...
}
```

### 6.6 Cache Key Hash cho FilterConfig

```typescript
// Trong DashboardCacheService
import { createHash } from 'crypto';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';

buildSummaryKey(workspaceId: string, input: DashboardSummaryInput): string {
  const filterHash = input.filters
    ? createHash('sha256')
        .update(safeJsonStringify(input.filters) ?? '')
        .digest('hex')
        .slice(0, 8)  // 8 chars đủ phân biệt
    : 'default';

  return `${DASHBOARD_CACHE_PREFIX.SUMMARY}:${workspaceId}:${input.period}:${filterHash}`;
}

buildStatsKey(workspaceId: string, dataSource: string, period: string): string {
  return `${DASHBOARD_CACHE_PREFIX.STATS}:${workspaceId}:${dataSource}:${period}`;
}
```

### 6.7 Pagination & Limits cho List Queries

Dùng `PaginationInput` có sẵn tại `mkt-core/common/dto/pagination.input.ts` (page/limit với Max=100).

**Hard limits cho list data trong output:**

```typescript
// mkt-dashboard/constants/dashboard-limits.ts
export const DASHBOARD_LIMITS = {
  TOP_CUSTOMERS: 10,              // topCustomers trong summary
  OVERDUE_ORDERS: 20,             // alerts.overdueOrders
  EXPIRING_CONTRACTS: 10,         // alerts.expiringContracts
  PENDING_PAYMENTS: 20,           // alerts.pendingPayments
  UNDERPERFORMING_KPIS: 10,      // alerts.underperformingKpis
  REVENUE_BY_PERIOD_MAX: 12,     // revenueByMonth max entries
  TOP_PRODUCTS: 10,               // orderStats.topProducts
  LEADERBOARD_MAX: 20,           // staffLeaderboard.rankings
  KPIS_PER_CATEGORY: 5,          // kpiScorecard per category
} as const;
```

**Domain-specific queries** (`revenueStats`, `orderStats`, `customerStats`) dùng `PaginationInput` cho list endpoints:

```graphql
query getCustomerStats($input: CustomerStatsInput!) {
  customerStats(input: $input) {
    # ... aggregate fields (không cần pagination)
    topCustomersByRevenue(limit: 10) { name, revenue, orderCount }  # dùng hard limit
  }
}

query getStaffLeaderboard($input: LeaderboardInput!) {
  staffLeaderboard(input: $input) {
    rankings { ... }  # limit trong input, max DASHBOARD_LIMITS.LEADERBOARD_MAX
    pagination { currentPage, totalPages, pageSize, hasNextPage }
  }
}
```

### 6.8 Test Strategy cho Dashboard

```
Unit Tests:
  ├── DashboardDateRangeService
  │   ├── resolve('TODAY')   → đúng start/end ngày hôm nay
  │   ├── resolve('THIS_WEEK') → đúng Monday-Sunday
  │   ├── resolve('THIS_MONTH') → đúng ngày đầu-cuối tháng
  │   ├── resolve('THIS_QUARTER') → đúng Q1/Q2/Q3/Q4
  │   └── resolve('CUSTOM', { start, end }) → đúng range
  │
  ├── StatisticsUtils
  │   ├── percentageChange(100, 80)  → 25%
  │   ├── percentageChange(0, 0)     → 0% (division by zero)
  │   ├── detectTrend([10,20,30])    → 'UP'
  │   └── growthRate([100,120,150])  → [20%, 25%]
  │
  ├── DashboardCacheService
  │   ├── buildSummaryKey → đúng format với filterHash
  │   └── invalidation patterns → đúng keys bị xóa
  │
  ├── Zod Schema Validation
  │   ├── widgetFilterConfigSchema.parse(valid)  → pass
  │   ├── widgetFilterConfigSchema.parse(invalid) → ZodError
  │   └── widgetOrderSchema.parse(layout) → pass
  │
  └── DashboardDataTransformer
      ├── transform raw order rows → RevenueStatsOutput
      └── transform raw kpi rows → KpiScorecardOutput

Integration Tests:
  ├── RevenueStatsService.getStats → correct aggregation from DB
  ├── OrderStatsService.getStats → correct status grouping
  ├── DashboardOrchestratorService → parallel query + caching
  └── Cache invalidation → event → cache cleared
```

---

## 7. SQL Queries chính

> **Convention**: Trong raw SQL dùng `NOW()` / `CURRENT_DATE` cho DB functions. Khi truyền parameters `:startDate`, `:endDate` từ TypeScript, phải dùng `DateTimeUtils.toISO(DateTimeUtils.now())` thay vì `new Date()` (xem CLAUDE.md - Required Utilities).

### 7.1 Revenue Summary

```sql
SELECT
  DATE_TRUNC('month', "createdAt") AS period,
  COUNT(*) AS order_count,
  SUM("totalAmount") AS total_revenue,
  AVG("totalAmount") AS avg_order_value
FROM "mktOrder"
WHERE "deletedAt" IS NULL
  AND status = 'COMPLETED'
  AND "createdAt" BETWEEN :startDate AND :endDate
GROUP BY DATE_TRUNC('month', "createdAt")
ORDER BY period;
```

### 7.2 Revenue by Staff (Leaderboard)

```sql
SELECT
  wm."nameFirstName" || ' ' || wm."nameLastName" AS staff_name,
  COUNT(o.id) AS order_count,
  SUM(o."totalAmount") AS total_revenue
FROM "mktOrder" o
JOIN "workspaceMember" wm ON o."accountOwnerId" = wm.id
WHERE o."deletedAt" IS NULL
  AND o.status = 'COMPLETED'
  AND o."createdAt" BETWEEN :startDate AND :endDate
GROUP BY wm.id, wm."nameFirstName", wm."nameLastName"
ORDER BY total_revenue DESC
LIMIT 10;
```

### 7.3 Customer Growth Trend

```sql
SELECT
  DATE_TRUNC('month', "createdAt") AS period,
  COUNT(*) AS new_customers
FROM "mktCustomer"
WHERE "deletedAt" IS NULL
  AND "createdAt" BETWEEN :startDate AND :endDate
GROUP BY DATE_TRUNC('month', "createdAt")
ORDER BY period;
```

### 7.4 Payment Collection Rate

```sql
SELECT
  status,
  COUNT(*) AS cnt,
  SUM(amount) AS total_amount
FROM "mktPayment"
WHERE "deletedAt" IS NULL
  AND "createdAt" BETWEEN :startDate AND :endDate
GROUP BY status;
```

### 7.5 KPI Achievement

```sql
SELECT
  "kpiCategory",
  COUNT(*) AS total_kpis,
  COUNT(*) FILTER (WHERE status IN ('ACHIEVED', 'EXCEEDED')) AS achieved,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('ACHIEVED', 'EXCEEDED'))::numeric
    / NULLIF(COUNT(*), 0) * 100, 2
  ) AS achievement_rate
FROM "mktKpi"
WHERE "deletedAt" IS NULL AND "periodYear" = :year
GROUP BY "kpiCategory";
```

### 7.6 Alerts - Overdue Orders

```sql
SELECT
  id, "orderCode", "totalAmount", "paymentDeadline",
  EXTRACT(DAY FROM NOW() - "paymentDeadline") AS days_overdue
FROM "mktOrder"
WHERE "deletedAt" IS NULL
  AND status IN ('LOCKED', 'PROCESSING')
  AND "paymentDeadline" < NOW()
ORDER BY days_overdue DESC LIMIT 20;
```

### 7.7 Expiring Contracts

```sql
SELECT
  id, name, "contractNumber", "endDate",
  "endDate" - CURRENT_DATE AS days_to_expiry
FROM "mktContract"
WHERE "deletedAt" IS NULL
  AND status != 'TERMINATED'
  AND "endDate" BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY "endDate";
```

---

## 8. Caching Strategy (Redis)

### 8.1 Cache Keys (theo convention `mkt:dashboard:*`)

Dùng `DASHBOARD_CACHE_PREFIX` từ section 4.3:

```
mkt:dashboard:summary:{workspaceId}:{period}:{filterHash}      TTL: 5 phút  (SUMMARY)
mkt:dashboard:stats:{workspaceId}:REVENUE:{period}              TTL: 5 phút  (STATS)
mkt:dashboard:stats:{workspaceId}:ORDERS:{period}               TTL: 5 phút  (STATS)
mkt:dashboard:stats:{workspaceId}:CUSTOMERS:{period}            TTL: 5 phút  (STATS)
mkt:dashboard:stats:{workspaceId}:PAYMENTS:{period}             TTL: 5 phút  (STATS)
mkt:dashboard:stats:{workspaceId}:KPIS:{period}                 TTL: 5 phút  (STATS)
mkt:dashboard:leaderboard:{workspaceId}:{period}                TTL: 10 phút (LEADERBOARD)
mkt:dashboard:alerts:{workspaceId}                              TTL: 2 phút  (ALERTS)
mkt:dashboard:widget:{widgetId}                                 TTL: 1 giờ   (WIDGET)
mkt:dashboard:layout:{userId}                                   TTL: 1 giờ   (LAYOUT)
```

### 8.2 Cache Invalidation

| Event | Keys invalidated |
|-------|-----------------|
| Order created/updated | `mkt:dashboard:summary:*`, `mkt:dashboard:stats:*:REVENUE:*`, `mkt:dashboard:stats:*:ORDERS:*` |
| Payment confirmed/rejected | `mkt:dashboard:summary:*`, `mkt:dashboard:stats:*:PAYMENTS:*`, `mkt:dashboard:stats:*:REVENUE:*` |
| Customer created/updated | `mkt:dashboard:summary:*`, `mkt:dashboard:stats:*:CUSTOMERS:*` |
| KPI updated | `mkt:dashboard:summary:*`, `mkt:dashboard:stats:*:KPIS:*` |
| Widget config changed | `mkt:dashboard:widget:{widgetId}` |
| Layout saved | `mkt:dashboard:layout:{userId}` |

---

## 9. RBAC Integration

### 9.1 Permission Model

RBAC resource `DASHBOARD` đã tồn tại trong seed data (category: REPORTING).

- **READ**: Theo RBAC template hiện tại. Khi Data Classification triển khai → bypass Casbin cho READ
- **CREATE/UPDATE/DELETE widget**: Cần template có quyền DASHBOARD + action tương ứng
- **EXPORT**: Cần template có quyền EXPORT

### 9.2 Data Scope theo Organization Hierarchy

```
Level 1-3 (CEO/VP/Director): Xem toàn bộ dữ liệu
Level 4-6 (Manager):         Xem dữ liệu phòng ban và sub-departments
Level 7-8 (Team Lead/Senior):Xem dữ liệu team
Level 9-11 (Staff):          Xem dữ liệu cá nhân
```

Thống kê tổng hợp (tổng doanh thu, số khách hàng) được hiển thị cho tất cả khi Data Classification = INTERNAL.
Dữ liệu chi tiết (danh sách đơn hàng, top khách hàng) được filter theo @DataScope.

### 9.3 Resolver Pattern

```typescript
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class DashboardQueryResolver {
  constructor(
    private readonly orchestrator: DashboardOrchestratorService,
    private readonly revenueStatsService: RevenueStatsService,
    private readonly leaderboardService: StaffLeaderboardService,
  ) {}

  @Query(() => DashboardSummaryOutput)
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'low' })
  async dashboardSummary(
    @Args('input') input: DashboardSummaryInput,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<DashboardSummaryOutput> {
    return this.orchestrator.getDashboardSummary(workspace.id, input, ctx);
  }

  @Query(() => RevenueStatsOutput)
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async revenueStats(
    @Args('input') input: RevenueStatsInput,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<RevenueStatsOutput> {
    return this.revenueStatsService.getDetailedStats(workspace.id, input, ctx);
  }

  @Query(() => StaffLeaderboardOutput)
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async staffLeaderboard(
    @Args('input') input: LeaderboardInput,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<StaffLeaderboardOutput> {
    return this.leaderboardService.getRankings(workspace.id, input, ctx);
  }
}
```

---

## 10. Scheduled Jobs (BullMQ)

> **Lưu ý**: Workspace-scoped cron jobs dùng BullMQ/MessageQueue, không phải NestJS `@Cron` trực tiếp. Dùng `BaseCronRegistrationService` (tại `infrastructure/cron-registration/`) để iterate qua tất cả active workspaces và tạo job per-workspace với `workspaceId` trong job data.

### 10.0 Queue Constants & Job Data Types

```typescript
// mkt-dashboard/constants/dashboard-queue.constants.ts
// Naming convention: kebab-case (xem LICENSE_QUEUE_NAME, MKT_DELAYED_JOB_QUEUES)

export const DASHBOARD_QUEUE_NAMES = {
  SNAPSHOT: 'mkt-dashboard-snapshot-queue',
  CACHE_WARMUP: 'mkt-dashboard-cache-warmup-queue',
  CLEANUP: 'mkt-dashboard-cleanup-queue',
} as const;

export const DASHBOARD_JOB_NAMES = {
  SNAPSHOT_DAILY: 'mkt-dashboard-snapshot-daily',
  CACHE_WARMUP: 'mkt-dashboard-cache-warmup',
  SNAPSHOT_CLEANUP: 'mkt-dashboard-snapshot-cleanup',
} as const;

// mkt-dashboard/types/dashboard-job.types.ts
export type DashboardSnapshotJobData = {
  workspaceId: string;
};

export type DashboardCacheWarmupJobData = {
  workspaceId: string;
};

export type DashboardCleanupJobData = {
  workspaceId: string;
};
```

### 10.1 Snapshot Job

```typescript
// Đăng ký job trong module
MessageQueueModule.registerJobQueue(DASHBOARD_QUEUE_NAMES.SNAPSHOT)

// Job processor - nhận workspaceId từ job data
@Processor(DASHBOARD_QUEUE_NAMES.SNAPSHOT)
export class DashboardSnapshotProcessor {
  @Process(DASHBOARD_JOB_NAMES.SNAPSHOT_DAILY)
  async processDailySnapshot(job: Job<DashboardSnapshotJobData>): Promise<void> {
    const { workspaceId } = job.data;
    const summary = await this.orchestrator.getDashboardSummary(workspaceId, {
      period: 'TODAY',
    });
    await this.snapshotService.createSnapshot(workspaceId, {
      name: `Daily Snapshot - ${DateTimeUtils.toISO(DateTimeUtils.now())}`,
      snapshotType: 'DAILY',
      dataSource: 'COMBINED',
      snapshotAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      snapshotData: summary,
    });
  }
}
```

### 10.2 Cache Warmup Processor

```typescript
@Processor(DASHBOARD_QUEUE_NAMES.CACHE_WARMUP)
export class DashboardCacheWarmupProcessor {
  @Process(DASHBOARD_JOB_NAMES.CACHE_WARMUP)
  async processWarmup(job: Job<DashboardCacheWarmupJobData>): Promise<void> {
    const { workspaceId } = job.data;
    // Pre-compute summary cho các period phổ biến
    for (const period of ['TODAY', 'THIS_WEEK', 'THIS_MONTH'] as const) {
      await this.orchestrator.getDashboardSummary(workspaceId, { period });
    }
  }
}
```

### 10.3 Snapshot Cleanup Processor

Retention policy: giữ 90 ngày daily, 6 tháng weekly, 12 tháng monthly.

```typescript
@Processor(DASHBOARD_QUEUE_NAMES.CLEANUP)
export class DashboardSnapshotCleanupProcessor {
  @Process(DASHBOARD_JOB_NAMES.SNAPSHOT_CLEANUP)
  async processCleanup(job: Job<DashboardCleanupJobData>): Promise<void> {
    const { workspaceId } = job.data;
    const now = DateTimeUtils.now();

    // Xóa daily snapshots > 90 ngày
    const dailyCutoff = DateTimeUtils.subtract(now, { days: 90 });
    await this.snapshotService.deleteSnapshotsBefore(
      workspaceId, 'DAILY', DateTimeUtils.toISO(dailyCutoff),
    );

    // Xóa weekly snapshots > 6 tháng
    const weeklyCutoff = DateTimeUtils.subtract(now, { months: 6 });
    await this.snapshotService.deleteSnapshotsBefore(
      workspaceId, 'WEEKLY', DateTimeUtils.toISO(weeklyCutoff),
    );

    // Xóa monthly snapshots > 12 tháng
    const monthlyCutoff = DateTimeUtils.subtract(now, { months: 12 });
    await this.snapshotService.deleteSnapshotsBefore(
      workspaceId, 'MONTHLY', DateTimeUtils.toISO(monthlyCutoff),
    );
  }
}
```

### 10.4 Cron Registration Service (extends BaseCronRegistrationService)

Extends `BaseCronRegistrationService` (tại `infrastructure/cron-registration/`) để iterate qua tất cả active workspaces, tạo job per-workspace. Theo pattern của `MktCustomerCronRegistrationService`, `OrderCronRegistrationService`.

```typescript
import { BaseCronRegistrationService } from 'src/mkt-core/infrastructure/cron-registration/base-cron-registration.service';

export class DashboardCronRegistrationService extends BaseCronRegistrationService {

  // Override: định nghĩa các cron jobs cho mỗi workspace
  protected getCronJobsForWorkspace(workspaceId: string): CronJobConfig[] {
    return [
      {
        queue: DASHBOARD_QUEUE_NAMES.SNAPSHOT,
        jobName: DASHBOARD_JOB_NAMES.SNAPSHOT_DAILY,
        data: { workspaceId },
        options: { repeat: { pattern: '55 23 * * *' } }, // Mỗi ngày 23:55
      },
      {
        queue: DASHBOARD_QUEUE_NAMES.CACHE_WARMUP,
        jobName: DASHBOARD_JOB_NAMES.CACHE_WARMUP,
        data: { workspaceId },
        options: { repeat: { pattern: '*/5 * * * *' } }, // Mỗi 5 phút
      },
      {
        queue: DASHBOARD_QUEUE_NAMES.CLEANUP,
        jobName: DASHBOARD_JOB_NAMES.SNAPSHOT_CLEANUP,
        data: { workspaceId },
        options: { repeat: { pattern: '0 2 * * *' } }, // Mỗi ngày 02:00
      },
    ];
  }
}
```

> **Flow**: `onModuleInit()` → `getWorkspaceIds()` (query DB) → iterate → `getCronJobsForWorkspace(wsId)` → `registerCronJob()` per workspace. Mỗi job processor nhận `{ workspaceId }` trong `job.data`.

---

## 11. Cấu trúc Thư mục

```
mkt-core/mkt-dashboard/
├── mkt-dashboard.module.ts
├── constants/
│   ├── index.ts
│   ├── dashboard-options.ts                      # Widget type, data source, period options
│   ├── dashboard-cache-keys.ts                   # DASHBOARD_CACHE_PREFIX, TTL constants
│   ├── dashboard-queue.constants.ts              # DASHBOARD_QUEUE_NAMES, DASHBOARD_JOB_NAMES
│   ├── dashboard-limits.ts                       # DASHBOARD_LIMITS (hard limits cho lists)
│   ├── dashboard-service-mapping.ts              # widgetCode → dataSource → service mapping
│   └── dashboard-block-hooks.constants.ts        # createBlockHooks() config
├── workspace-entity/
│   ├── index.ts
│   ├── mkt-dashboard-widget.workspace-entity.ts
│   ├── mkt-dashboard-snapshot.workspace-entity.ts
│   └── mkt-dashboard-layout.workspace-entity.ts
├── dto/
│   ├── index.ts
│   ├── input/
│   │   ├── dashboard-summary.input.ts
│   │   ├── revenue-stats.input.ts
│   │   ├── order-stats.input.ts
│   │   ├── customer-stats.input.ts
│   │   ├── kpi-scorecard.input.ts
│   │   ├── leaderboard.input.ts
│   │   ├── create-widget.input.ts
│   │   ├── update-widget-position.input.ts
│   │   ├── save-layout.input.ts
│   │   └── create-snapshot.input.ts
│   └── output/
│       ├── dashboard-summary.output.ts
│       ├── revenue-stats.output.ts
│       ├── order-stats.output.ts
│       ├── customer-stats.output.ts
│       ├── payment-stats.output.ts
│       ├── kpi-scorecard.output.ts
│       ├── contract-stats.output.ts
│       ├── leaderboard.output.ts
│       ├── alerts.output.ts
│       └── widget.output.ts
├── repositories/
│   ├── index.ts
│   ├── dashboard-widget.repository.ts
│   ├── dashboard-snapshot.repository.ts
│   └── dashboard-layout.repository.ts
├── services/
│   ├── index.ts
│   ├── core/
│   │   ├── dashboard-cache.service.ts
│   │   ├── dashboard-widget.service.ts
│   │   ├── dashboard-snapshot.service.ts
│   │   └── dashboard-date-range.service.ts
│   ├── domain/
│   │   ├── revenue-stats.service.ts
│   │   ├── order-stats.service.ts
│   │   ├── customer-stats.service.ts
│   │   ├── payment-stats.service.ts
│   │   ├── kpi-stats.service.ts
│   │   ├── contract-stats.service.ts
│   │   ├── staff-leaderboard.service.ts
│   │   └── alerts.service.ts
│   └── application/
│       └── dashboard-orchestrator.service.ts
├── resolvers/
│   ├── index.ts
│   ├── dashboard-query.resolver.ts
│   └── dashboard-widget.resolver.ts
├── hooks/
│   └── index.ts                                  # re-export DASHBOARD_BLOCK_HOOKS
├── listeners/
│   ├── index.ts
│   └── dashboard-cache-invalidation.listener.ts
├── jobs/
│   ├── index.ts
│   ├── dashboard-snapshot.processor.ts
│   ├── dashboard-cache-warmup.processor.ts
│   ├── dashboard-snapshot-cleanup.processor.ts   # Retention policy cleanup
│   └── dashboard-cron-registration.service.ts
├── utils/
│   ├── dashboard-data.transformer.ts             # Transform raw data → output DTO
│   └── statistics.utils.ts                       # percentage change, trend, growth rate
└── types/
    ├── index.ts
    ├── dashboard-period.type.ts
    ├── dashboard-data-source.type.ts             # DashboardDataSource type
    ├── dashboard-job.types.ts                    # Job data types (workspaceId)
    ├── dashboard-config.schema.ts                # Zod schemas cho RAW_JSON fields
    └── dashboard-filter.type.ts
```

---

## 12. Module Definition

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { MktRbacEnterpriseGradeModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module';

@Module({
  imports: [
    TwentyORMModule,                              // Bắt buộc cho repository injection
    TypeOrmModule.forFeature([Workspace], 'core'), // Workspace entity cho workspace queries
    WorkspaceCacheStorageModule,                    // Redis caching
    MessageQueueModule,                            // BullMQ cho scheduled jobs
    MktRbacEnterpriseGradeModule,                  // RBAC authorization
  ],
  providers: [
    // Block Hooks - createBlockHooks() factory
    ...DASHBOARD_BLOCK_HOOKS,

    // Repositories
    DashboardWidgetRepository,
    DashboardSnapshotRepository,
    DashboardLayoutRepository,
    // Cross-module repositories (imported directly)
    MktOrderRepository,
    MktCustomerRepository,
    MktPaymentRepository,
    MktKpiRepository,
    MktContractRepository,

    // Core Services
    DashboardCacheService,
    DashboardWidgetService,
    DashboardSnapshotService,
    DashboardDateRangeService,

    // Domain Stats Services
    RevenueStatsService,
    OrderStatsService,
    CustomerStatsService,
    PaymentStatsService,
    KpiStatsService,
    ContractStatsService,
    StaffLeaderboardService,
    AlertsService,

    // Application Services
    DashboardOrchestratorService,

    // Resolvers
    DashboardQueryResolver,
    DashboardWidgetResolver,

    // Listeners
    DashboardCacheInvalidationListener,

    // Jobs
    DashboardSnapshotProcessor,
    DashboardCacheWarmupProcessor,
    DashboardSnapshotCleanupProcessor,
    DashboardCronRegistrationService,
  ],
  exports: [
    DashboardOrchestratorService,
    DashboardSnapshotService,
    DashboardCacheService,
  ],
})
export class MktDashboardModule {}
```

**Đăng ký vào `mkt-core.module.ts`:**

```typescript
imports: [
  // ... các module hiện tại ...
  MktDashboardModule,  // Dashboard & analytics (đặt sau CustomerModule)
],
```

---

## 13. System Default Widgets (Seed Data)

14 widgets mặc định. Grid position nằm trong **Layout seed**, không trong Widget.

### 13.1 Widget Definitions

| # | Code | Type | Source | colSpan | rowSpan |
|---|------|------|--------|---------|---------|
| 1 | `TOTAL_REVENUE` | STAT_CARD | REVENUE | 3 | 1 |
| 2 | `TOTAL_ORDERS` | STAT_CARD | ORDERS | 3 | 1 |
| 3 | `TOTAL_CUSTOMERS` | STAT_CARD | CUSTOMERS | 3 | 1 |
| 4 | `COLLECTION_RATE` | STAT_CARD | PAYMENTS | 3 | 1 |
| 5 | `REVENUE_TREND` | LINE_CHART | REVENUE | 6 | 2 |
| 6 | `ORDER_STATUS_DIST` | PIE_CHART | ORDERS | 6 | 2 |
| 7 | `CUSTOMER_TIER_DIST` | BAR_CHART | CUSTOMERS | 6 | 2 |
| 8 | `PAYMENT_STATUS` | PIE_CHART | PAYMENTS | 6 | 2 |
| 9 | `KPI_SCORECARD` | KPI_SCORECARD | KPIS | 6 | 2 |
| 10 | `STAFF_LEADERBOARD` | LEADERBOARD | COMBINED | 6 | 2 |
| 11 | `TOP_CUSTOMERS` | TABLE | CUSTOMERS | 6 | 2 |
| 12 | `ALERTS_PANEL` | TABLE | COMBINED | 6 | 2 |
| 13 | `CONTRACT_SUMMARY` | STAT_CARD | CONTRACTS | 4 | 1 |
| 14 | `CUSTOMER_GROWTH` | TREND_CHART | CUSTOMERS | 8 | 2 |

### 13.2 Default Layout (widgetOrder JSON)

```json
[
  { "widgetCode": "TOTAL_REVENUE",     "gridCol": 1,  "gridRow": 1,  "colSpan": 3, "rowSpan": 1, "isVisible": true },
  { "widgetCode": "TOTAL_ORDERS",      "gridCol": 4,  "gridRow": 1,  "colSpan": 3, "rowSpan": 1, "isVisible": true },
  { "widgetCode": "TOTAL_CUSTOMERS",   "gridCol": 7,  "gridRow": 1,  "colSpan": 3, "rowSpan": 1, "isVisible": true },
  { "widgetCode": "COLLECTION_RATE",   "gridCol": 10, "gridRow": 1,  "colSpan": 3, "rowSpan": 1, "isVisible": true },
  { "widgetCode": "REVENUE_TREND",     "gridCol": 1,  "gridRow": 2,  "colSpan": 6, "rowSpan": 2, "isVisible": true },
  { "widgetCode": "ORDER_STATUS_DIST", "gridCol": 7,  "gridRow": 2,  "colSpan": 6, "rowSpan": 2, "isVisible": true },
  { "widgetCode": "CUSTOMER_TIER_DIST","gridCol": 1,  "gridRow": 4,  "colSpan": 6, "rowSpan": 2, "isVisible": true },
  { "widgetCode": "PAYMENT_STATUS",    "gridCol": 7,  "gridRow": 4,  "colSpan": 6, "rowSpan": 2, "isVisible": true },
  { "widgetCode": "KPI_SCORECARD",     "gridCol": 1,  "gridRow": 6,  "colSpan": 6, "rowSpan": 2, "isVisible": true },
  { "widgetCode": "STAFF_LEADERBOARD", "gridCol": 7,  "gridRow": 6,  "colSpan": 6, "rowSpan": 2, "isVisible": true },
  { "widgetCode": "TOP_CUSTOMERS",     "gridCol": 1,  "gridRow": 8,  "colSpan": 6, "rowSpan": 2, "isVisible": true },
  { "widgetCode": "ALERTS_PANEL",      "gridCol": 7,  "gridRow": 8,  "colSpan": 6, "rowSpan": 2, "isVisible": true },
  { "widgetCode": "CONTRACT_SUMMARY",  "gridCol": 1,  "gridRow": 10, "colSpan": 4, "rowSpan": 1, "isVisible": true },
  { "widgetCode": "CUSTOMER_GROWTH",   "gridCol": 5,  "gridRow": 10, "colSpan": 8, "rowSpan": 2, "isVisible": true }
]
```

### 13.3 Dashboard Layout Mockup

```
┌───────────────────────────────────────────────────┐
│ Row 1: Stat Cards                                 │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│ │ Revenue │ │ Orders  │ │ Custom. │ │ Collect. │ │
│ │  11 tỷ  │ │   42    │ │    5    │ │   19%    │ │
│ │  +12%   │ │  +5%    │ │  +20%   │ │   -3%    │ │
│ └─────────┘ └─────────┘ └─────────┘ └──────────┘ │
├─────────────────────────┬─────────────────────────┤
│ Revenue Trend           │ Order Status Dist       │
│ ╱╲    ╱╲                │   ■ Completed (88%)     │
│╱  ╲╱╱   ╲               │   ■ Locked (7%)         │
│                         │   ■ Processing (5%)     │
├─────────────────────────┼─────────────────────────┤
│ Customer Tiers          │ Payment Status          │
│ ■■■ BRONZE  (1)        │   ■ Confirmed (20%)     │
│ ■■■ SILVER  (1)        │   ■ Pending (20%)       │
│ ■■■ GOLD    (1)        │   ■ Other (60%)         │
│ ■■■ DIAMOND (1)        │                         │
├─────────────────────────┼─────────────────────────┤
│ KPI Scorecard           │ Staff Leaderboard       │
│ ● Revenue    80%        │ 1. Nguyen V  - 5 ty    │
│ ● Customers  60%        │ 2. Tran A    - 3 ty    │
│ ● Conversion 45%        │ 3. Le B      - 2 ty    │
├─────────────────────────┼─────────────────────────┤
│ Top Customers           │ Alerts Panel            │
│ ┌──────┬──────────┐     │ ! 3 overdue orders      │
│ │Name  │ Value    │     │ ! 2 expiring contracts  │
│ │...   │ ...      │     │ ! 1 underperforming KPI │
├────────────┬────────────┴─────────────────────────┤
│ Contracts  │ Customer Growth Trend                 │
│ Active: 10 │ ╱╲    ╱╲                              │
│ Expiring: 2│╱  ╲╱╱   ╲                             │
└────────────┴──────────────────────────────────────┘
```

---

## 14. Thứ tự Triển khai

```
Phase 1: Foundation
  ├── 1.1 Thêm Object IDs và Field IDs vào constants (bao gồm WORKSPACE_MEMBER_MKT_FIELD_IDS)
  ├── 1.2 Tạo workspace entities (Widget, Snapshot, Layout)
  ├── 1.3 Thêm inverse relations vào WorkspaceMemberMktEntity (dashboardWidgets, dashboardLayouts)
  ├── 1.4 Tạo Zod schemas (dashboard-config.schema.ts)
  ├── 1.5 Tạo constants (options, cache keys, queue names, limits, service mapping, block hooks)
  ├── 1.6 Tạo DTO (input/output types, dùng PaginationInput cho list queries)
  └── 1.7 Tạo repositories

Phase 2: Core Services + Utilities
  ├── 2.1 DashboardDataTransformer (utils/ - transform raw query → output DTO)
  ├── 2.2 StatisticsUtils (utils/ - percentage change, trend detection, growth rate)
  ├── 2.3 DashboardDateRangeService + unit tests
  ├── 2.4 DashboardCacheService (dùng @InjectCacheStorage, SHA-256 filterHash)
  ├── 2.5 DashboardWidgetService (Zod validation cho filterConfig/widgetConfig)
  └── 2.6 DashboardSnapshotService

Phase 3: Domain Stats Services (apply DASHBOARD_LIMITS cho list queries)
  ├── 3.1 RevenueStatsService
  ├── 3.2 OrderStatsService
  ├── 3.3 CustomerStatsService
  ├── 3.4 PaymentStatsService
  ├── 3.5 KpiStatsService
  ├── 3.6 ContractStatsService
  ├── 3.7 AlertsService
  └── 3.8 StaffLeaderboardService (pagination support)

Phase 4: Application Layer
  ├── 4.1 DashboardOrchestratorService (dùng DATA_SOURCE_SERVICE_MAP + WIDGET_CODE_DATA_SOURCE_MAP)
  ├── 4.2 Block Hooks (createBlockHooks factory, logContext: 'Dashboard:BlockHook')
  └── 4.3 Cache Invalidation Listener (@OnEvent pattern)

Phase 5: Resolvers
  ├── 5.1 DashboardQueryResolver (@DataScope resource: 'DASHBOARD', mode: 'AUTO')
  └── 5.2 DashboardWidgetResolver

Phase 6: Jobs & Module Registration
  ├── 6.1 Snapshot BullMQ Processor (mkt-dashboard-snapshot-queue)
  ├── 6.2 Cache Warmup Processor (mkt-dashboard-cache-warmup-queue)
  ├── 6.3 Snapshot Cleanup Processor (mkt-dashboard-cleanup-queue, retention policy)
  ├── 6.4 Cron Registration Service (extends BaseCronRegistrationService, 3 cron jobs per workspace)
  ├── 6.5 MktDashboardModule (import TwentyORMModule, TypeOrmModule, ...)
  └── 6.6 Đăng ký vào MktCoreModule

Phase 7: Seed Data & Infrastructure
  ├── 7.1 Seed 14 default widgets (loại bỏ LICENSES dataSource)
  ├── 7.2 Seed default SYSTEM_DEFAULT layout
  ├── 7.3 Thêm DASHBOARD_CACHE_PREFIX vào infrastructure/redis/constants/cache-keys.constant.ts
  ├── 7.4 Thêm DASHBOARD vào MKT_CACHE_PREFIX và MktCachePrefix union type
  └── 7.5 Sync metadata: npx nx run twenty-server:command workspace:sync-metadata -f

Phase 8: Testing
  ├── 8.1 Unit tests: DateRangeService, StatisticsUtils, CacheService, Zod schemas
  ├── 8.2 Unit tests: DashboardDataTransformer
  └── 8.3 Integration tests: Domain Stats aggregation, Orchestrator parallel + caching
```

---

## 15. Tác động & Rủi ro

### 15.1 Tác động

| Hạng mục | Tác động |
|----------|---------|
| **Database** | Thêm 3 bảng mới: `mktDashboardWidget`, `mktDashboardSnapshot`, `mktDashboardLayout` |
| **Backward Compatibility** | Không ảnh hưởng - module hoàn toàn mới, chỉ READ dữ liệu từ các module hiện tại |
| **Performance** | Tăng load DB do aggregate queries - giảm thiểu bằng Redis caching + proposed indexes |
| **Redis** | Tăng sử dụng Redis memory - ước tính thêm ~50-100MB cho cache |
| **Security** | Tích hợp RBAC với @DataScope(resource: 'DASHBOARD') |

### 15.2 Rủi ro & Biện pháp

| Rủi ro | Mức độ | Biện pháp |
|--------|--------|-----------|
| Aggregate queries chậm với dữ liệu lớn | MEDIUM | Redis caching với TTL hợp lý + partial indexes (section 16) |
| Cache stale data | LOW | Event-driven invalidation qua @OnEvent, TTL ngắn cho dữ liệu nhạy cảm |
| Circular dependency với các module | MEDIUM | Chỉ inject cross-module repositories trực tiếp trong providers, không import module |
| Snapshot data quá lớn | LOW | Retention policy: giữ 90 ngày daily, 6 tháng weekly, 12 tháng monthly. DashboardSnapshotCleanupProcessor chạy mỗi ngày 02:00 (section 10.3) |
| Lộ dữ liệu nhạy cảm qua dashboard | MEDIUM | @DataScope filter cho detailed queries, summary dùng aggregate không lộ chi tiết |

---

## 16. Database Indexes Đề xuất

```sql
-- Orders: query theo status + createdAt
CREATE INDEX IF NOT EXISTS idx_mktOrder_status_createdAt
ON "mktOrder" (status, "createdAt")
WHERE "deletedAt" IS NULL;

-- Payments: query theo status + createdAt
CREATE INDEX IF NOT EXISTS idx_mktPayment_status_createdAt
ON "mktPayment" (status, "createdAt")
WHERE "deletedAt" IS NULL;

-- Customers: query theo tier + lifecycleStage
CREATE INDEX IF NOT EXISTS idx_mktCustomer_tier_lifecycle
ON "mktCustomer" (tier, "lifecycleStage")
WHERE "deletedAt" IS NULL;

-- KPIs: query theo status + category + periodYear
CREATE INDEX IF NOT EXISTS idx_mktKpi_status_category_year
ON "mktKpi" (status, "kpiCategory", "periodYear")
WHERE "deletedAt" IS NULL;

-- Contracts: query theo endDate cho alerts
CREATE INDEX IF NOT EXISTS idx_mktContract_endDate
ON "mktContract" ("endDate")
WHERE "deletedAt" IS NULL AND status != 'TERMINATED';

-- Snapshots: query theo snapshotType + snapshotAt
CREATE INDEX IF NOT EXISTS idx_mktDashboardSnapshot_type_at
ON "mktDashboardSnapshot" ("snapshotType", "snapshotAt")
WHERE "deletedAt" IS NULL;
```

---

## 17. Tóm tắt

| Hạng mục | Chi tiết |
|----------|---------|
| **Entities mới** | 3 (Widget, Snapshot, Layout) |
| **Entity sửa** | 1 (WorkspaceMemberMktEntity - thêm 2 inverse relations) |
| **Services** | 12 (4 core + 7 domain + AlertsService) + 1 application |
| **Utilities mới** | 2 (DashboardDataTransformer, StatisticsUtils) |
| **Zod Schemas** | 4 (widgetFilterConfig, widgetDisplayConfig, widgetOrder, globalFilters) |
| **Constants mới** | 6 files (options, cache keys, queue, limits, service mapping, block hooks) |
| **Resolvers** | 2 (Query + Widget) |
| **GraphQL Queries** | 7 (summary + 5 domain + leaderboard) |
| **GraphQL Mutations** | 4 (widget CRUD + layout + snapshot) |
| **BullMQ Jobs** | 3 (snapshot + cache warmup + cleanup) |
| **BullMQ Queues** | 3 (`mkt-dashboard-snapshot-queue`, `mkt-dashboard-cache-warmup-queue`, `mkt-dashboard-cleanup-queue`) |
| **Cache Keys** | 6 prefixes (prefix: `mkt:dashboard:*`, xem DASHBOARD_CACHE_PREFIX) |
| **Default Widgets** | 14 (seed data) |
| **DB Tables mới** | 3 |
| **DB Indexes đề xuất** | 6 (partial indexes) |
| **Dependencies** | MktOrderModule, MktPaymentModule, CustomerModule, MktKpiModule, MktContractModule, MktRbacEnterpriseGradeModule |
| **Required Imports** | TwentyORMModule, TypeOrmModule, WorkspaceCacheStorageModule, MessageQueueModule |
| **RBAC** | @DataScope(resource: 'DASHBOARD', mode: 'AUTO'), CUD theo template |
| **Backward Compatible** | Có (module mới, chỉ thêm 2 relations vào WorkspaceMember) |
| **Cần migration** | Không (workspace entity sync tự tạo) |

---

## Review Log

### v4 (2026-02-07) - Sửa 6 issues correctness/perf

| # | Issue | Mức độ | Fix |
|---|-------|--------|-----|
| 1 | Cron registration truyền `{}` nhưng processors cần `workspaceId` | CRITICAL | Đổi sang `BaseCronRegistrationService` (extends base, iterate workspaces). Thêm `DashboardSnapshotJobData` types. Section 10.4 |
| 2 | `LICENSES` trong dataSource nhưng License là external integration (MKT Server), không có workspace entity | MEDIUM | Loại `LICENSES` khỏi `MKT_DASHBOARD_DATA_SOURCE_OPTIONS`. Thêm comment hướng dẫn thêm lại nếu cần |
| 3 | `widgetConfig`/`filterConfig` là RAW_JSON nhưng thiếu schema/validation | MEDIUM | Thêm 4 Zod schemas tại `types/dashboard-config.schema.ts` + validation trong service layer. Section 6.5 |
| 4 | Cache key `filterHash` chưa mô tả cách tính | MEDIUM | Thêm `buildSummaryKey()` dùng SHA-256 hash của filterConfig. Section 6.6 |
| 5 | Thiếu pagination/limits cho list queries (top customers, alerts, leaderboard) | MEDIUM | Thêm `DASHBOARD_LIMITS` constants + dùng `PaginationInput` cho domain queries. Section 6.7 |
| 6 | Thiếu widgetCode→service mapping và test strategy | LOW | Thêm `DATA_SOURCE_SERVICE_MAP`, `WIDGET_CODE_DATA_SOURCE_MAP`. Section 6.4, 6.8 |

### v3 (2026-02-07) - Sửa 8 issues từ codebase deep verification

| # | Issue | Mức độ | Fix |
|---|-------|--------|-----|
| 1 | `DashboardDataTransformer` và `StatisticsUtils` ghi "Đã có sẵn" nhưng không tồn tại trong codebase | CRITICAL | Chuyển sang "Cần tạo mới", thêm vào `utils/` directory và Phase 2 |
| 2 | `@DataScope` mode `'STRICT'` không tồn tại (chỉ có AUTO/MANUAL/SKIP) | CRITICAL | Đổi `staffLeaderboard` resolver từ `'STRICT'` sang `'AUTO'` |
| 3 | Block hook config sai: `moduleName` → `logContext`, `allowedOperations` không tồn tại | CRITICAL | Sửa sang đúng `BlockHookConfig` type: `logContext: 'Dashboard:BlockHook'`, omit `blockedOperations` để block ALL |
| 4 | Cache key quá nhiều sub-prefixes (10) so với convention (3-5 per domain) | MEDIUM | Gộp domain stats vào chung prefix `STATS` với `dataSource` phân biệt, giảm còn 6 prefixes |
| 5 | Queue naming thiếu string values và convention | MEDIUM | Thêm `DASHBOARD_QUEUE_NAMES` và `DASHBOARD_JOB_NAMES` constants với kebab-case |
| 6 | Thiếu note về thay đổi WorkspaceMemberMktEntity | MEDIUM | Thêm section 3.4 mô tả 2 inverse relations cần thêm + field IDs |
| 7 | SQL queries dùng `:startDate/:endDate` từ TypeScript nhưng không ghi chú dùng DateTimeUtils | LOW | Thêm convention note đầu section 7 |
| 8 | Retention policy đề cập nhưng thiếu cleanup job design | LOW | Thêm section 10.3 `DashboardSnapshotCleanupProcessor` với 3 retention tiers |

### v2 (2026-02-07) - Sửa 11 issues từ codebase verification

| # | Issue | Fix |
|---|-------|-----|
| 1 | Thiếu `TwentyORMModule` import | Thêm vào module imports (bắt buộc cho repository injection) |
| 2 | Cache key prefix sai convention | Đổi từ `dashboard:*` sang `mkt:dashboard:*` theo `cache-keys.constant.ts` |
| 3 | Grid position nằm sai entity | Chuyển `gridCol/gridRow/colSpan/rowSpan` từ Widget sang Layout (widgetOrder JSON) |
| 4 | Entity fields thiếu `standardId` | Thêm đầy đủ `standardId` ref đến Field IDs cho mọi `@WorkspaceField` |
| 5 | Block hooks sai pattern | Đổi sang dùng `createBlockHooks()` factory từ `common/hooks/block-hook.factory.ts` |
| 6 | `@DataScope` resource sai giá trị | Đổi từ `'mktDashboard'` sang `'DASHBOARD'` (RBAC resource key) |
| 7 | Cron jobs sai pattern | Đổi từ NestJS `@Cron` sang BullMQ/MessageQueue cho workspace-scoped jobs |
| 8 | Thiếu `TypeOrmModule.forFeature` | Thêm `TypeOrmModule.forFeature([Workspace], 'core')` |
| 9 | Data Classification chưa implement | Thêm ghi chú rõ ràng về trạng thái pending và forward-compatible design |
| 10 | Widget entity thiếu `searchVector` | Thêm `TS_VECTOR` field với `@WorkspaceIsSearchable()` decorator |
| 11 | Options thiếu type annotation | Thêm `FieldMetadataComplexOption[]` type cho tất cả options arrays |
