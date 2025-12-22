# MKT Analytics Log System Design

> Thiết kế hệ thống lưu log cho analytics và tích hợp với MindsDB

**Version**: 1.0  
**Created**: 2025-12-19  
**Author**: CRM Development Team  
**Status**: Draft

---

## 1. Tổng quan (Overview)

### 1.1 Mục tiêu

Xây dựng hệ thống log analytics tập trung để:

1. **Thu thập dữ liệu** - Ghi lại tất cả hoạt động kinh doanh quan trọng
2. **Phân tích dữ liệu** - Hỗ trợ báo cáo, dashboard, insights
3. **Machine Learning** - Tích hợp với MindsDB để dự đoán và phân tích xu hướng
4. **Audit Trail** - Đảm bảo compliance và truy vết thay đổi

### 1.2 Phạm vi

Hệ thống log sẽ bao gồm các module nghiệp vụ trong mkt-core:

| Module | Loại Log | Mức độ ưu tiên |
|--------|----------|----------------|
| Order | Business Events, State Changes | Cao |
| License | Lifecycle Events, Status Changes | Cao |
| Payment | Transactions, Webhook Events | Cao |
| Customer | Profile Changes, Tier Updates | Trung bình |
| Promotion | Usage, Rule Evaluation | Trung bình |
| Permission | Access Control Audit | Cao |
| Product | Sync Events, Cache Events | Thấp |

### 1.3 Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MKT-CORE Application                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Order     │  │   License   │  │   Payment   │  │  Customer   │    │
│  │   Module    │  │   Module    │  │   Module    │  │   Module    │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                   │                                      │
│                    ┌──────────────▼──────────────┐                      │
│                    │   MktAnalyticsLogService    │                      │
│                    │   (Centralized Log Facade)  │                      │
│                    └──────────────┬──────────────┘                      │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────▼───────┐ ┌─────▼─────┐ ┌──────▼──────┐
            │  PostgreSQL   │ │   Redis   │ │  ClickHouse │
            │  (Workspace   │ │  (Buffer/ │ │  (Analytics │
            │   Entities)   │ │   Queue)  │ │   Storage)  │
            └───────────────┘ └───────────┘ └──────┬──────┘
                                                   │
                                           ┌───────▼───────┐
                                           │   MindsDB     │
                                           │  (ML/AI)      │
                                           └───────────────┘
```

---

## 2. Thiết kế Chi tiết

### 2.1 Log Categories (Phân loại Log)

#### 2.1.1 Business Event Logs

Ghi lại các sự kiện kinh doanh quan trọng.

```typescript
// Loại event theo domain
export enum MktLogCategory {
  // Order Domain
  ORDER_CREATED = 'order.created',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_COMPLETED = 'order.completed',
  ORDER_OVERDUE = 'order.overdue',
  ORDER_STATE_CHANGED = 'order.state_changed',
  
  // License Domain
  LICENSE_CREATED = 'license.created',
  LICENSE_ACTIVATED = 'license.activated',
  LICENSE_RENEWED = 'license.renewed',
  LICENSE_EXPIRED = 'license.expired',
  LICENSE_SUSPENDED = 'license.suspended',
  
  // Payment Domain
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_WEBHOOK_RECEIVED = 'payment.webhook_received',
  
  // Customer Domain
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_TIER_CHANGED = 'customer.tier_changed',
  CUSTOMER_TAG_ADDED = 'customer.tag_added',
  
  // Promotion Domain
  PROMOTION_APPLIED = 'promotion.applied',
  PROMOTION_EXPIRED = 'promotion.expired',
  COUPON_USED = 'coupon.used',
  COUPON_GENERATED = 'coupon.generated',
  
  // Security Domain
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_DENIED = 'permission.denied',
  LOGIN_SUCCESS = 'auth.login_success',
  LOGIN_FAILED = 'auth.login_failed',
  
  // System Domain
  SYNC_STARTED = 'system.sync_started',
  SYNC_COMPLETED = 'system.sync_completed',
  SYNC_FAILED = 'system.sync_failed',
  CACHE_INVALIDATED = 'system.cache_invalidated',
}
```

#### 2.1.2 Audit Logs

Ghi lại thay đổi dữ liệu (CRUD operations).

```typescript
export enum MktAuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
}
```

#### 2.1.3 Performance Logs

Ghi lại metrics hiệu năng.

```typescript
export type MktPerformanceLog = {
  operationType: string;
  durationMs: number;
  recordCount: number;
  cacheHit: boolean;
  errorCount: number;
};
```

---

### 2.2 Data Models

#### 2.2.1 MktAnalyticsLog (WorkspaceEntity - PostgreSQL)

Entity chính lưu log analytics trong workspace.

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktAnalyticsLog,
  namePlural: 'mktAnalyticsLogs',
  labelSingular: msg`Analytics Log`,
  labelPlural: msg`Analytics Logs`,
  description: msg`Analytics and audit log for business events`,
  icon: 'IconChartBar',
})
@WorkspaceIsSystem()
export class MktAnalyticsLogWorkspaceEntity extends BaseWorkspaceEntity {
  // ============================================
  // IDENTIFICATION
  // ============================================
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.eventId,
    type: FieldMetadataType.TEXT,
    label: msg`Event ID`,
    description: msg`Unique event identifier`,
    icon: 'IconHash',
  })
  eventId: string; // UUID v4
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.category,
    type: FieldMetadataType.SELECT,
    label: msg`Category`,
    description: msg`Event category`,
    icon: 'IconCategory',
    options: MKT_LOG_CATEGORY_OPTIONS,
  })
  category: MktLogCategory;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.eventName,
    type: FieldMetadataType.TEXT,
    label: msg`Event Name`,
    description: msg`Human-readable event name`,
    icon: 'IconTag',
  })
  eventName: string;

  // ============================================
  // ENTITY REFERENCES
  // ============================================
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.entityType,
    type: FieldMetadataType.TEXT,
    label: msg`Entity Type`,
    description: msg`Type of entity (order, license, payment, etc.)`,
    icon: 'IconBox',
  })
  entityType: string;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.entityId,
    type: FieldMetadataType.TEXT,
    label: msg`Entity ID`,
    description: msg`ID of the related entity`,
    icon: 'IconKey',
  })
  @WorkspaceIsNullable()
  entityId: string | null;
  
  // ============================================
  // EVENT DATA
  // ============================================
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.previousState,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Previous State`,
    description: msg`State before the event`,
    icon: 'IconHistory',
  })
  @WorkspaceIsNullable()
  previousState: JSON | null;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.newState,
    type: FieldMetadataType.RAW_JSON,
    label: msg`New State`,
    description: msg`State after the event`,
    icon: 'IconRefresh',
  })
  @WorkspaceIsNullable()
  newState: JSON | null;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional event metadata`,
    icon: 'IconInfoCircle',
  })
  @WorkspaceIsNullable()
  metadata: JSON | null;

  // ============================================
  // METRICS
  // ============================================
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.amount,
    type: FieldMetadataType.NUMBER,
    label: msg`Amount`,
    description: msg`Monetary amount if applicable`,
    icon: 'IconCash',
  })
  @WorkspaceIsNullable()
  amount: number | null;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.quantity,
    type: FieldMetadataType.NUMBER,
    label: msg`Quantity`,
    description: msg`Quantity if applicable`,
    icon: 'IconStack',
  })
  @WorkspaceIsNullable()
  quantity: number | null;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.durationMs,
    type: FieldMetadataType.NUMBER,
    label: msg`Duration (ms)`,
    description: msg`Operation duration in milliseconds`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  durationMs: number | null;

  // ============================================
  // CONTEXT
  // ============================================
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.userId,
    type: FieldMetadataType.TEXT,
    label: msg`User ID`,
    description: msg`User who triggered the event`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  userId: string | null;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.customerId,
    type: FieldMetadataType.TEXT,
    label: msg`Customer ID`,
    description: msg`Customer related to the event`,
    icon: 'IconUsers',
  })
  @WorkspaceIsNullable()
  customerId: string | null;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.ipAddress,
    type: FieldMetadataType.TEXT,
    label: msg`IP Address`,
    description: msg`Source IP address`,
    icon: 'IconGlobe',
  })
  @WorkspaceIsNullable()
  ipAddress: string | null;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.userAgent,
    type: FieldMetadataType.TEXT,
    label: msg`User Agent`,
    description: msg`Client user agent`,
    icon: 'IconDeviceDesktop',
  })
  @WorkspaceIsNullable()
  userAgent: string | null;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.source,
    type: FieldMetadataType.TEXT,
    label: msg`Source`,
    description: msg`Event source (api, webhook, cron, manual)`,
    icon: 'IconSourceCode',
  })
  source: string;

  // ============================================
  // TIMESTAMPS
  // ============================================
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.occurredAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Occurred At`,
    description: msg`When the event occurred`,
    icon: 'IconCalendar',
  })
  occurredAt: Date;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.processedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Processed At`,
    description: msg`When the event was processed`,
    icon: 'IconCalendarCheck',
  })
  @WorkspaceIsNullable()
  processedAt: Date | null;

  // ============================================
  // STATUS & INDEXING
  // ============================================
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.isProcessed,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Processed`,
    description: msg`Whether the event has been processed for analytics`,
    icon: 'IconCheck',
    defaultValue: false,
  })
  isProcessed: boolean;
  
  @WorkspaceField({
    standardId: MKT_ANALYTICS_LOG_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;
}
```

#### 2.2.2 ClickHouse Tables (Analytics Storage)

Schema cho ClickHouse để lưu trữ và phân tích log hiệu suất cao.

```sql
-- Main analytics events table (optimized for time-series queries)
CREATE TABLE mkt_analytics_events (
    event_id UUID,
    workspace_id String,
    category LowCardinality(String),
    event_name String,
    entity_type LowCardinality(String),
    entity_id String,
    
    -- Event data
    previous_state String, -- JSON
    new_state String, -- JSON
    metadata String, -- JSON
    
    -- Metrics
    amount Decimal64(4),
    quantity UInt32,
    duration_ms UInt32,
    
    -- Context
    user_id String,
    customer_id String,
    ip_address IPv4,
    user_agent String,
    source LowCardinality(String),
    
    -- Timestamps
    occurred_at DateTime64(3),
    processed_at DateTime64(3),
    
    -- Partitioning
    event_date Date DEFAULT toDate(occurred_at)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, category, occurred_at)
TTL event_date + INTERVAL 2 YEAR;

-- Aggregated daily metrics
CREATE MATERIALIZED VIEW mkt_daily_metrics
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, event_date, category, entity_type)
AS SELECT
    workspace_id,
    event_date,
    category,
    entity_type,
    count() as event_count,
    sum(amount) as total_amount,
    sum(quantity) as total_quantity,
    avg(duration_ms) as avg_duration_ms,
    uniq(user_id) as unique_users,
    uniq(customer_id) as unique_customers
FROM mkt_analytics_events
GROUP BY workspace_id, event_date, category, entity_type;

-- Order funnel analytics
CREATE MATERIALIZED VIEW mkt_order_funnel
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, event_date)
AS SELECT
    workspace_id,
    event_date,
    countIf(category = 'order.created') as orders_created,
    countIf(category = 'order.confirmed') as orders_confirmed,
    countIf(category = 'order.completed') as orders_completed,
    countIf(category = 'order.cancelled') as orders_cancelled,
    sumIf(amount, category = 'order.completed') as revenue
FROM mkt_analytics_events
WHERE entity_type = 'order'
GROUP BY workspace_id, event_date;

-- License lifecycle analytics
CREATE MATERIALIZED VIEW mkt_license_lifecycle
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, event_date)
AS SELECT
    workspace_id,
    event_date,
    countIf(category = 'license.created') as licenses_created,
    countIf(category = 'license.activated') as licenses_activated,
    countIf(category = 'license.renewed') as licenses_renewed,
    countIf(category = 'license.expired') as licenses_expired
FROM mkt_analytics_events
WHERE entity_type = 'license'
GROUP BY workspace_id, event_date;

-- Payment analytics
CREATE MATERIALIZED VIEW mkt_payment_analytics
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, event_date, source)
AS SELECT
    workspace_id,
    event_date,
    source,
    countIf(category = 'payment.completed') as successful_payments,
    countIf(category = 'payment.failed') as failed_payments,
    sumIf(amount, category = 'payment.completed') as total_revenue,
    avgIf(duration_ms, category = 'payment.completed') as avg_processing_time
FROM mkt_analytics_events
WHERE entity_type = 'payment'
GROUP BY workspace_id, event_date, source;
```

---

### 2.3 Service Architecture

#### 2.3.1 MktAnalyticsLogService (Facade)

Service chính để ghi log từ các module.

```typescript
// mkt-core/mkt-analytics-log/services/mkt-analytics-log.service.ts

@Injectable()
export class MktAnalyticsLogService {
  constructor(
    private readonly twentyORMManager: TwentyORMManager,
    private readonly redisBufferService: MktLogBufferService,
    private readonly clickHouseService: ClickHouseService,
    private readonly configService: TwentyConfigService,
  ) {}

  /**
   * Tạo context để ghi log với workspace và user info
   */
  createContext(context: MktLogContext): MktLogWriter {
    return {
      logBusinessEvent: (params: BusinessEventParams) =>
        this.logBusinessEvent({ ...params, ...context }),
      
      logAuditEvent: (params: AuditEventParams) =>
        this.logAuditEvent({ ...params, ...context }),
      
      logPerformanceMetric: (params: PerformanceParams) =>
        this.logPerformanceMetric({ ...params, ...context }),
    };
  }

  /**
   * Ghi business event (async, non-blocking)
   */
  async logBusinessEvent(params: BusinessEventParams & MktLogContext): Promise<void> {
    const event = this.buildEvent(params);
    
    // Buffer vào Redis trước
    await this.redisBufferService.pushEvent(event);
    
    // Async flush nếu buffer đủ lớn
    if (await this.redisBufferService.shouldFlush()) {
      this.flushToStorage().catch(err => 
        this.logger.error('Failed to flush logs', err)
      );
    }
  }

  /**
   * Ghi audit event (đồng bộ vào PostgreSQL để đảm bảo)
   */
  async logAuditEvent(params: AuditEventParams & MktLogContext): Promise<void> {
    const repository = await this.twentyORMManager.getRepository(
      params.workspaceId,
      'mktAnalyticsLog'
    );
    
    const event = this.buildEvent({
      ...params,
      category: this.getAuditCategory(params.action),
    });
    
    await repository.save(event);
  }

  /**
   * Flush buffer từ Redis sang storage
   */
  async flushToStorage(): Promise<void> {
    const events = await this.redisBufferService.popEvents(1000);
    
    if (events.length === 0) return;
    
    // Ghi vào ClickHouse nếu enabled
    if (this.configService.get('CLICKHOUSE_URL')) {
      await this.clickHouseService.insert('mkt_analytics_events', events);
    }
    
    // Cũng ghi vào PostgreSQL cho workspace queries
    await this.saveToWorkspace(events);
  }

  private buildEvent(params: EventParams): MktAnalyticsLogEvent {
    return {
      eventId: crypto.randomUUID(),
      category: params.category,
      eventName: params.eventName,
      entityType: params.entityType,
      entityId: params.entityId,
      previousState: params.previousState ?? null,
      newState: params.newState ?? null,
      metadata: params.metadata ?? null,
      amount: params.amount ?? null,
      quantity: params.quantity ?? null,
      durationMs: params.durationMs ?? null,
      userId: params.userId ?? null,
      customerId: params.customerId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      source: params.source ?? 'api',
      occurredAt: params.occurredAt ?? new Date(),
      processedAt: null,
      isProcessed: false,
      workspaceId: params.workspaceId,
    };
  }
}
```

#### 2.3.2 MktLogBufferService (Redis Buffer)

Buffer log events trong Redis trước khi flush.

```typescript
// mkt-core/mkt-analytics-log/services/mkt-log-buffer.service.ts

@Injectable()
export class MktLogBufferService {
  private readonly BUFFER_KEY = 'mkt:analytics:buffer';
  private readonly BUFFER_THRESHOLD = 100;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(
    private readonly redisService: InjectRedis,
  ) {}

  async pushEvent(event: MktAnalyticsLogEvent): Promise<void> {
    await this.redisService.lpush(
      this.BUFFER_KEY,
      JSON.stringify(event)
    );
  }

  async popEvents(count: number): Promise<MktAnalyticsLogEvent[]> {
    const results: MktAnalyticsLogEvent[] = [];
    
    for (let i = 0; i < count; i++) {
      const item = await this.redisService.rpop(this.BUFFER_KEY);
      if (!item) break;
      results.push(JSON.parse(item));
    }
    
    return results;
  }

  async shouldFlush(): Promise<boolean> {
    const length = await this.redisService.llen(this.BUFFER_KEY);
    return length >= this.BUFFER_THRESHOLD;
  }

  async getBufferSize(): Promise<number> {
    return this.redisService.llen(this.BUFFER_KEY);
  }
}
```

#### 2.3.3 MktLogFlushJob (Background Job)

Cron job để flush buffer định kỳ.

```typescript
// mkt-core/mkt-analytics-log/jobs/mkt-log-flush.job.ts

@Command({
  name: 'mkt-analytics-log:flush',
  description: 'Flush analytics log buffer to storage',
})
export class MktLogFlushJob extends CommandRunner {
  constructor(
    private readonly analyticsLogService: MktAnalyticsLogService,
    private readonly logger: Logger,
  ) {
    super();
  }

  @Cron('*/10 * * * * *') // Every 10 seconds
  async handleFlush(): Promise<void> {
    try {
      await this.analyticsLogService.flushToStorage();
    } catch (error) {
      this.logger.error('Analytics log flush failed', error);
    }
  }

  async run(): Promise<void> {
    await this.handleFlush();
  }
}
```

---

### 2.4 Integration với Existing Modules

#### 2.4.1 Order Module Integration

```typescript
// Trong order services, thêm logging

@Injectable()
export class OrderOrchestrationService {
  constructor(
    private readonly analyticsLogService: MktAnalyticsLogService,
    // ... other dependencies
  ) {}

  async confirmOrder(orderId: string, context: AuthContext): Promise<void> {
    const logger = this.analyticsLogService.createContext({
      workspaceId: context.workspace.id,
      userId: context.user?.id,
    });

    const previousState = await this.getOrderState(orderId);
    
    // ... business logic
    
    await logger.logBusinessEvent({
      category: MktLogCategory.ORDER_CONFIRMED,
      eventName: 'Order Confirmed',
      entityType: 'order',
      entityId: orderId,
      previousState: { status: previousState.status },
      newState: { status: 'CONFIRMED' },
      amount: order.totalAmount,
      customerId: order.customerId,
      source: 'api',
    });
  }
}
```

#### 2.4.2 License Module Integration

```typescript
// Trong license services

@Injectable()
export class MktLicenseService {
  async renewLicense(licenseId: string, context: AuthContext): Promise<void> {
    const logger = this.analyticsLogService.createContext({
      workspaceId: context.workspace.id,
      userId: context.user?.id,
    });

    const license = await this.getLicense(licenseId);
    const previousExpiry = license.expiredAt;
    
    // ... renewal logic
    
    await logger.logBusinessEvent({
      category: MktLogCategory.LICENSE_RENEWED,
      eventName: 'License Renewed',
      entityType: 'license',
      entityId: licenseId,
      previousState: { expiredAt: previousExpiry },
      newState: { expiredAt: newExpiry },
      metadata: {
        renewalPeriod: '1 year',
        renewalType: 'manual',
      },
      customerId: license.customerId,
    });
  }
}
```

#### 2.4.3 Payment Module Integration

```typescript
// Trong payment webhook handler

@Injectable()
export class SepayPaymentService {
  async handleWebhook(payload: SepayWebhookPayload): Promise<void> {
    const startTime = Date.now();
    
    const logger = this.analyticsLogService.createContext({
      workspaceId: workspace.id,
    });

    try {
      // ... process webhook
      
      await logger.logBusinessEvent({
        category: MktLogCategory.PAYMENT_WEBHOOK_RECEIVED,
        eventName: 'SEPay Webhook Received',
        entityType: 'payment',
        entityId: payment.id,
        amount: payload.amount,
        metadata: {
          transactionId: payload.transactionId,
          gateway: 'sepay',
          status: payload.status,
        },
        durationMs: Date.now() - startTime,
        source: 'webhook',
      });
    } catch (error) {
      await logger.logBusinessEvent({
        category: MktLogCategory.PAYMENT_FAILED,
        eventName: 'Payment Processing Failed',
        entityType: 'payment',
        metadata: { error: error.message },
        durationMs: Date.now() - startTime,
        source: 'webhook',
      });
    }
  }
}
```

---

## 3. MindsDB Integration

### 3.1 Overview

MindsDB sẽ được sử dụng để:

1. **Churn Prediction** - Dự đoán khách hàng có nguy cơ rời bỏ
2. **Revenue Forecasting** - Dự đoán doanh thu
3. **Anomaly Detection** - Phát hiện bất thường trong giao dịch
4. **Customer Segmentation** - Phân khúc khách hàng tự động

### 3.2 MindsDB Setup

```sql
-- Kết nối ClickHouse với MindsDB
CREATE DATABASE mkt_analytics
WITH ENGINE = 'clickhouse',
PARAMETERS = {
    "host": "clickhouse-host",
    "port": "8123",
    "user": "default",
    "password": "password",
    "database": "mkt_crm"
};

-- Tạo model dự đoán churn
CREATE MODEL customer_churn_predictor
FROM mkt_analytics
(
    SELECT
        customer_id,
        count() as total_orders,
        sum(amount) as total_revenue,
        max(occurred_at) as last_activity,
        dateDiff('day', max(occurred_at), now()) as days_inactive,
        countIf(category = 'order.cancelled') as cancelled_orders,
        avgIf(duration_ms, category LIKE 'payment%') as avg_payment_time
    FROM mkt_analytics_events
    WHERE entity_type IN ('order', 'payment', 'license')
    GROUP BY customer_id
)
PREDICT is_churned
USING
    engine = 'lightwood',
    accuracy_threshold = 0.8;

-- Tạo model dự đoán revenue
CREATE MODEL revenue_forecast
FROM mkt_analytics
(
    SELECT
        event_date,
        sum(amount) as daily_revenue,
        count() as order_count,
        uniq(customer_id) as unique_customers
    FROM mkt_analytics_events
    WHERE category = 'order.completed'
    GROUP BY event_date
    ORDER BY event_date
)
PREDICT daily_revenue
USING
    engine = 'lightwood',
    window = 30,
    horizon = 7;

-- Model phát hiện bất thường
CREATE MODEL payment_anomaly_detector
FROM mkt_analytics
(
    SELECT
        event_date,
        hour(occurred_at) as hour_of_day,
        amount,
        duration_ms,
        source
    FROM mkt_analytics_events
    WHERE category LIKE 'payment%'
)
PREDICT is_anomaly
USING
    engine = 'anomaly_detection',
    sensitivity = 0.7;
```

### 3.3 Query Examples

```sql
-- Dự đoán churn cho tất cả customers
SELECT c.customer_id, c.name, p.is_churned, p.is_churned_confidence
FROM mkt_customers c
JOIN customer_churn_predictor p
ON c.id = p.customer_id
WHERE p.is_churned = true AND p.is_churned_confidence > 0.7;

-- Dự đoán revenue 7 ngày tới
SELECT event_date, daily_revenue
FROM revenue_forecast
WHERE event_date > today();

-- Phát hiện giao dịch bất thường
SELECT *
FROM mkt_analytics_events e
JOIN payment_anomaly_detector a
ON e.event_id = a.event_id
WHERE a.is_anomaly = true
  AND e.occurred_at > now() - INTERVAL 24 HOUR;
```

### 3.4 MktMindsDBService

```typescript
// mkt-core/mkt-analytics-log/services/mkt-mindsdb.service.ts

@Injectable()
export class MktMindsDBService {
  constructor(
    private readonly configService: TwentyConfigService,
    private readonly httpService: HttpService,
  ) {}

  private get mindsdbUrl(): string {
    return this.configService.get('MINDSDB_URL') ?? 'http://localhost:47334';
  }

  /**
   * Dự đoán churn cho customer
   */
  async predictChurn(customerId: string): Promise<ChurnPrediction> {
    const query = `
      SELECT is_churned, is_churned_confidence
      FROM customer_churn_predictor
      WHERE customer_id = '${customerId}'
    `;
    
    const result = await this.executeQuery(query);
    return {
      customerId,
      isChurned: result[0]?.is_churned ?? false,
      confidence: result[0]?.is_churned_confidence ?? 0,
    };
  }

  /**
   * Dự đoán revenue
   */
  async forecastRevenue(days: number = 7): Promise<RevenueForecast[]> {
    const query = `
      SELECT event_date, daily_revenue
      FROM revenue_forecast
      WHERE event_date > today()
      LIMIT ${days}
    `;
    
    return this.executeQuery(query);
  }

  /**
   * Phát hiện anomaly gần đây
   */
  async detectRecentAnomalies(hours: number = 24): Promise<AnomalyEvent[]> {
    const query = `
      SELECT e.*, a.is_anomaly, a.anomaly_score
      FROM mkt_analytics.mkt_analytics_events e
      JOIN payment_anomaly_detector a ON e.event_id = a.event_id
      WHERE a.is_anomaly = true
        AND e.occurred_at > now() - INTERVAL ${hours} HOUR
      ORDER BY a.anomaly_score DESC
      LIMIT 100
    `;
    
    return this.executeQuery(query);
  }

  private async executeQuery<T>(query: string): Promise<T[]> {
    const response = await this.httpService.post(
      `${this.mindsdbUrl}/api/sql/query`,
      { query },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    ).toPromise();
    
    return response.data.data ?? [];
  }
}
```

---

## 4. API & GraphQL

### 4.1 GraphQL Queries

```typescript
// mkt-core/mkt-analytics-log/resolvers/mkt-analytics-log.resolver.ts

@Resolver()
export class MktAnalyticsLogResolver {
  constructor(
    private readonly analyticsLogService: MktAnalyticsLogService,
    private readonly mindsDBService: MktMindsDBService,
  ) {}

  @Query(() => [MktAnalyticsLogOutput])
  @UseGuards(WorkspaceAuthGuard)
  async mktAnalyticsLogs(
    @AuthContext() context: AuthContext,
    @Args('input') input: MktAnalyticsLogFilterInput,
  ): Promise<MktAnalyticsLogOutput[]> {
    return this.analyticsLogService.findLogs(context.workspace.id, input);
  }

  @Query(() => MktAnalyticsSummaryOutput)
  @UseGuards(WorkspaceAuthGuard)
  async mktAnalyticsSummary(
    @AuthContext() context: AuthContext,
    @Args('input') input: MktAnalyticsSummaryInput,
  ): Promise<MktAnalyticsSummaryOutput> {
    return this.analyticsLogService.getSummary(context.workspace.id, input);
  }

  @Query(() => ChurnPredictionOutput)
  @UseGuards(WorkspaceAuthGuard)
  async mktPredictCustomerChurn(
    @Args('customerId') customerId: string,
  ): Promise<ChurnPredictionOutput> {
    return this.mindsDBService.predictChurn(customerId);
  }

  @Query(() => [RevenueForecastOutput])
  @UseGuards(WorkspaceAuthGuard)
  async mktForecastRevenue(
    @Args('days', { defaultValue: 7 }) days: number,
  ): Promise<RevenueForecastOutput[]> {
    return this.mindsDBService.forecastRevenue(days);
  }

  @Query(() => [AnomalyEventOutput])
  @UseGuards(WorkspaceAuthGuard)
  async mktDetectAnomalies(
    @Args('hours', { defaultValue: 24 }) hours: number,
  ): Promise<AnomalyEventOutput[]> {
    return this.mindsDBService.detectRecentAnomalies(hours);
  }
}
```

### 4.2 GraphQL Types

```typescript
// mkt-core/mkt-analytics-log/dto/outputs/mkt-analytics-log.output.ts

@ObjectType()
export class MktAnalyticsLogOutput {
  @Field(() => String)
  eventId: string;

  @Field(() => String)
  category: string;

  @Field(() => String)
  eventName: string;

  @Field(() => String)
  entityType: string;

  @Field(() => String, { nullable: true })
  entityId: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata: JSON | null;

  @Field(() => Float, { nullable: true })
  amount: number | null;

  @Field(() => Date)
  occurredAt: Date;
}

@ObjectType()
export class MktAnalyticsSummaryOutput {
  @Field(() => Int)
  totalEvents: number;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Int)
  totalOrders: number;

  @Field(() => Int)
  activeLicenses: number;

  @Field(() => Int)
  uniqueCustomers: number;

  @Field(() => [CategoryMetricOutput])
  byCategory: CategoryMetricOutput[];
}

@ObjectType()
export class ChurnPredictionOutput {
  @Field(() => String)
  customerId: string;

  @Field(() => Boolean)
  isChurned: boolean;

  @Field(() => Float)
  confidence: number;

  @Field(() => [String], { nullable: true })
  riskFactors: string[] | null;
}
```

---

## 5. Configuration

### 5.1 Environment Variables

```bash
# Analytics Log Configuration
MKT_ANALYTICS_LOG_ENABLED=true
MKT_ANALYTICS_LOG_BUFFER_SIZE=100
MKT_ANALYTICS_LOG_FLUSH_INTERVAL_MS=5000
MKT_ANALYTICS_LOG_RETENTION_DAYS=730

# ClickHouse (Optional - for high-performance analytics)
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_DATABASE=mkt_crm
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# MindsDB (Optional - for ML predictions)
MINDSDB_URL=http://localhost:47334
MINDSDB_ENABLED=true
```

### 5.2 Module Configuration

```typescript
// mkt-core/mkt-analytics-log/mkt-analytics-log.module.ts

@Module({
  imports: [
    RedisInfrastructureModule,
    ClickHouseModule.forRootAsync({
      inject: [TwentyConfigService],
      useFactory: (config: TwentyConfigService) => ({
        url: config.get('CLICKHOUSE_URL'),
        database: config.get('CLICKHOUSE_DATABASE'),
      }),
    }),
  ],
  providers: [
    MktAnalyticsLogService,
    MktLogBufferService,
    MktLogFlushJob,
    MktMindsDBService,
    MktAnalyticsLogResolver,
  ],
  exports: [
    MktAnalyticsLogService,
    MktMindsDBService,
  ],
})
export class MktAnalyticsLogModule {}
```

---

## 6. Data Retention & Cleanup

### 6.1 Retention Policy

| Storage | Retention Period | Cleanup Strategy |
|---------|------------------|------------------|
| PostgreSQL (Workspace) | 90 days | Cron job daily |
| ClickHouse | 2 years | TTL auto-delete |
| Redis Buffer | 24 hours | Auto-expire |

### 6.2 Cleanup Job

```typescript
// mkt-core/mkt-analytics-log/jobs/mkt-log-cleanup.job.ts

@Command({
  name: 'mkt-analytics-log:cleanup',
  description: 'Cleanup old analytics logs',
})
export class MktLogCleanupJob extends CommandRunner {
  @Cron('0 2 * * *') // Daily at 2 AM
  async handleCleanup(): Promise<void> {
    const retentionDays = this.configService.get('MKT_ANALYTICS_LOG_RETENTION_DAYS') ?? 90;
    const cutoffDate = DateTimeUtils.addDays(new Date(), -retentionDays);
    
    // Cleanup PostgreSQL
    await this.cleanupWorkspaceLogs(cutoffDate);
    
    // ClickHouse handles TTL automatically
    
    this.logger.log(`Cleaned up logs older than ${retentionDays} days`);
  }
}
```

---

## 7. Dashboard & Reporting

### 7.1 Pre-built Views

```sql
-- Order Funnel View
CREATE VIEW mkt_order_funnel_view AS
SELECT
    DATE(occurred_at) as date,
    countIf(category = 'order.created') as created,
    countIf(category = 'order.confirmed') as confirmed,
    countIf(category = 'order.completed') as completed,
    countIf(category = 'order.cancelled') as cancelled,
    round(countIf(category = 'order.completed') / 
          nullIf(countIf(category = 'order.created'), 0) * 100, 2) as conversion_rate
FROM mkt_analytics_log
GROUP BY DATE(occurred_at)
ORDER BY date DESC;

-- Revenue by Period
CREATE VIEW mkt_revenue_by_period_view AS
SELECT
    DATE_TRUNC('month', occurred_at) as period,
    SUM(amount) as revenue,
    COUNT(DISTINCT customer_id) as customers,
    AVG(amount) as avg_order_value
FROM mkt_analytics_log
WHERE category = 'order.completed'
GROUP BY DATE_TRUNC('month', occurred_at)
ORDER BY period DESC;

-- License Health View
CREATE VIEW mkt_license_health_view AS
SELECT
    DATE(occurred_at) as date,
    countIf(category = 'license.activated') as activated,
    countIf(category = 'license.renewed') as renewed,
    countIf(category = 'license.expired') as expired,
    round(countIf(category = 'license.renewed') / 
          nullIf(countIf(category = 'license.expired') + 
                 countIf(category = 'license.renewed'), 0) * 100, 2) as renewal_rate
FROM mkt_analytics_log
WHERE entity_type = 'license'
GROUP BY DATE(occurred_at)
ORDER BY date DESC;
```

### 7.2 Prefill Views for Frontend

```typescript
// mkt-core/seeder/prefill-view/mkt-analytics-dashboard.view.ts

export const MKT_ANALYTICS_DASHBOARD_VIEWS: PrefillView[] = [
  {
    name: 'Order Funnel',
    objectMetadataId: 'mktAnalyticsLog',
    type: 'table',
    filters: [
      { field: 'entityType', operator: 'eq', value: 'order' },
    ],
    groupBy: ['category'],
    aggregations: ['count', 'sum:amount'],
  },
  {
    name: 'Recent Events',
    objectMetadataId: 'mktAnalyticsLog',
    type: 'table',
    sort: [{ field: 'occurredAt', direction: 'DESC' }],
    limit: 100,
  },
  {
    name: 'Payment Analytics',
    objectMetadataId: 'mktAnalyticsLog',
    type: 'table',
    filters: [
      { field: 'entityType', operator: 'eq', value: 'payment' },
    ],
    groupBy: ['source', 'category'],
    aggregations: ['count', 'sum:amount', 'avg:durationMs'],
  },
];
```

---

## 8. Migration Plan

### Phase 1: Core Infrastructure (Week 1-2)

1. Tạo `MktAnalyticsLogWorkspaceEntity`
2. Implement `MktAnalyticsLogService` và `MktLogBufferService`
3. Setup Redis buffer
4. Create migration scripts

### Phase 2: Module Integration (Week 3-4)

1. Integrate với Order module
2. Integrate với License module
3. Integrate với Payment module
4. Add logging to existing hooks

### Phase 3: ClickHouse Setup (Week 5)

1. Setup ClickHouse instance
2. Create tables và materialized views
3. Configure data sync từ PostgreSQL
4. Setup TTL policies

### Phase 4: MindsDB Integration (Week 6-7)

1. Setup MindsDB instance
2. Connect với ClickHouse
3. Train initial models
4. Create prediction APIs

### Phase 5: Dashboard & Reporting (Week 8)

1. Create GraphQL queries
2. Build frontend dashboard components
3. Setup alerts và notifications

---

## 9. Monitoring & Alerts

### 9.1 Key Metrics to Monitor

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| Buffer Size | > 1000 events | Warning |
| Flush Latency | > 5s | Warning |
| Failed Events | > 1% | Critical |
| ClickHouse Lag | > 1 minute | Warning |

### 9.2 Alert Configuration

```typescript
// mkt-core/mkt-analytics-log/services/mkt-log-monitoring.service.ts

@Injectable()
export class MktLogMonitoringService {
  @Cron('*/1 * * * *') // Every minute
  async checkHealth(): Promise<void> {
    const bufferSize = await this.bufferService.getBufferSize();
    
    if (bufferSize > 1000) {
      await this.alertService.sendWarning(
        'Analytics Log Buffer High',
        `Buffer size: ${bufferSize} events`
      );
    }
  }
}
```

---

## 10. Security Considerations

### 10.1 Data Privacy

- **PII Masking**: Mask sensitive fields (email, phone) trong logs
- **Access Control**: Chỉ admin có quyền truy cập raw logs
- **Encryption**: Encrypt data at rest trong ClickHouse
- **Audit Trail**: Log tất cả truy cập vào analytics data

### 10.2 Rate Limiting

```typescript
// Giới hạn số lượng log events per workspace
const MAX_EVENTS_PER_MINUTE = 10000;

async logBusinessEvent(params: BusinessEventParams): Promise<void> {
  const currentCount = await this.getRateLimit(params.workspaceId);
  
  if (currentCount >= MAX_EVENTS_PER_MINUTE) {
    throw new TooManyRequestsException('Log rate limit exceeded');
  }
  
  // ... log event
}
```

---

## 11. Appendix

### A. Related Entities (Existing)

Các entity hiện có đã hỗ trợ audit/history:

| Entity | Purpose |
|--------|---------|
| `MktOrderHistoryWorkspaceEntity` | Order state changes |
| `MktLicenseHistoryWorkspaceEntity` | License lifecycle |
| `MktPaymentHistoryWorkspaceEntity` | Payment transactions |
| `MktPermissionAuditWorkspaceEntity` | Access control audit |
| `MktPromotionAuditWorkspaceEntity` | Promotion changes |

### B. File Structure

```
mkt-core/mkt-analytics-log/
├── constants/
│   ├── mkt-analytics-log-field-ids.ts
│   ├── mkt-log-categories.ts
│   └── index.ts
├── dto/
│   ├── inputs/
│   │   ├── mkt-analytics-log-filter.input.ts
│   │   └── mkt-analytics-summary.input.ts
│   └── outputs/
│       ├── mkt-analytics-log.output.ts
│       ├── mkt-analytics-summary.output.ts
│       └── churn-prediction.output.ts
├── jobs/
│   ├── mkt-log-flush.job.ts
│   └── mkt-log-cleanup.job.ts
├── objects/
│   └── mkt-analytics-log.workspace-entity.ts
├── repositories/
│   └── mkt-analytics-log.repository.ts
├── resolvers/
│   └── mkt-analytics-log.resolver.ts
├── services/
│   ├── mkt-analytics-log.service.ts
│   ├── mkt-log-buffer.service.ts
│   ├── mkt-mindsdb.service.ts
│   └── mkt-log-monitoring.service.ts
├── types/
│   ├── mkt-log-event.types.ts
│   └── mkt-prediction.types.ts
├── utils/
│   └── mkt-log-builder.utils.ts
└── mkt-analytics-log.module.ts
```

### C. Commands

```bash
# Seed development data
npx nx command twenty-server -- mkt-analytics-log-data-seed-dev-workspace

# Manual flush
npx nx command twenty-server -- mkt-analytics-log:flush

# Cleanup old logs
npx nx command twenty-server -- mkt-analytics-log:cleanup

# Train MindsDB models
npx nx command twenty-server -- mkt-mindsdb:train-models
```

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-19 | CRM Dev Team | Initial design |

---

**Next Steps**

1. [ ] Review thiết kế với team
2. [ ] Approve architecture
3. [ ] Create implementation tasks in Jira/GitHub
4. [ ] Start Phase 1 development
